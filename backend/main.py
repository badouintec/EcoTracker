from __future__ import annotations

from datetime import date
import os
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

import httpx
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import anyio

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parents[1]

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")
ROBOFLOW_MODEL = os.getenv("ROBOFLOW_MODEL", "visual-pollution-detection-04jk5/3")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="EcoTrack API", version="2.0.0")


def _normalize_database_url(url: str) -> str:
    # Railway sometimes provides postgres:// URLs. psycopg expects postgresql://
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


def _db_is_configured() -> bool:
    return bool(DATABASE_URL)


def _get_db_conn() -> psycopg.Connection[Any]:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")
    return psycopg.connect(
        _normalize_database_url(DATABASE_URL),
        autocommit=True,
        row_factory=dict_row,
    )


def _init_db_sync() -> None:
    with _get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS reports (
                    id TEXT PRIMARY KEY,
                    fecha_evento DATE,
                    titulo TEXT NOT NULL,
                    direccion TEXT,
                    colonia TEXT,
                    gravedad TEXT,
                    descripcion TEXT,
                    mm_lluvia DOUBLE PRECISION,
                    tipo_evento TEXT,
                    medio TEXT,
                    imagen TEXT,
                    url_noticia TEXT,
                    tipo_reporte TEXT DEFAULT 'ciudadano',
                    detectado_ai BOOLEAN DEFAULT FALSE,
                    ai_confidence DOUBLE PRECISION,
                    status TEXT DEFAULT 'enviado',
                    geom GEOMETRY(Point, 4326) NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_reports_geom ON reports USING GIST (geom);"
            )


@app.on_event("startup")
async def startup() -> None:
    if _db_is_configured():
        await anyio.to_thread.run_sync(_init_db_sync)

# CORS is only needed if you host the frontend elsewhere.
allowed_origins = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# -----------------------------
# Static frontend (same service)
# -----------------------------
_assets_dir = REPO_ROOT / "assets"
_geojson_dir = REPO_ROOT / "GeoJSON"
_logo_dir = REPO_ROOT / "Logo"

if _assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")
if _geojson_dir.exists():
    app.mount("/GeoJSON", StaticFiles(directory=str(_geojson_dir)), name="GeoJSON")
if _logo_dir.exists():
    app.mount("/Logo", StaticFiles(directory=str(_logo_dir)), name="Logo")


@app.get("/")
async def root():
    index_path = REPO_ROOT / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse(str(index_path), media_type="text/html")


@app.get("/index.html")
async def index_html():
    return await root()


@app.get("/detector.html")
async def detector_html():
    detector_path = REPO_ROOT / "detector.html"
    if not detector_path.exists():
        raise HTTPException(status_code=404, detail="detector.html not found")
    return FileResponse(str(detector_path), media_type="text/html")


@app.get("/sw.js")
async def service_worker():
    sw_path = REPO_ROOT / "sw.js"
    if not sw_path.exists():
        raise HTTPException(status_code=404, detail="sw.js not found")
    return FileResponse(str(sw_path), media_type="text/javascript")


# -----------------------------
# Roboflow proxy
# -----------------------------


def _roboflow_url() -> str:
    # Roboflow "detect" endpoint. Keep the API key server-side.
    # Example: https://detect.roboflow.com/visual-pollution-detection-04jk5/3?api_key=...
    if not ROBOFLOW_API_KEY:
        return ""
    return f"https://detect.roboflow.com/{ROBOFLOW_MODEL}?api_key={ROBOFLOW_API_KEY}"


@app.get("/api/health")
async def api_health():
    return {
        "status": "online",
        "roboflow_configured": bool(ROBOFLOW_API_KEY),
        "roboflow_model": ROBOFLOW_MODEL,
        "db_configured": _db_is_configured(),
    }


class ReportIn(BaseModel):
    titulo: str = Field(min_length=1)
    lat: float
    lon: float
    fecha_evento: Optional[date] = None
    direccion: Optional[str] = None
    colonia: Optional[str] = None
    gravedad: Optional[str] = None
    descripcion: Optional[str] = None
    mm_lluvia: Optional[float] = None
    tipo_evento: Optional[str] = None
    medio: Optional[str] = None
    imagen: Optional[str] = None
    url_noticia: Optional[str] = None
    tipo_reporte: Optional[str] = "ciudadano"
    detectado_ai: Optional[bool] = False
    ai_confidence: Optional[float] = None
    status: Optional[str] = "enviado"


def _row_to_public_report(row: dict[str, Any]) -> dict[str, Any]:
    # Row comes from dict_row row_factory.
    return {
        "id": row.get("id"),
        "fecha_evento": row.get("fecha_evento").isoformat() if row.get("fecha_evento") else None,
        "titulo": row.get("titulo"),
        "direccion": row.get("direccion"),
        "colonia": row.get("colonia"),
        "lat": row.get("lat"),
        "lon": row.get("lon"),
        "gravedad": row.get("gravedad"),
        "mm_lluvia": row.get("mm_lluvia"),
        "tipo_evento": row.get("tipo_evento"),
        "medio": row.get("medio"),
        "descripcion": row.get("descripcion"),
        "imagen": row.get("imagen"),
        "url_noticia": row.get("url_noticia"),
        "tipo_reporte": row.get("tipo_reporte"),
        "detectado_ai": row.get("detectado_ai"),
        "ai_confidence": row.get("ai_confidence"),
        "status": row.get("status"),
        "created_at": row.get("created_at").isoformat() if row.get("created_at") else None,
    }


def _list_reports_sync(limit: int = 500) -> list[dict[str, Any]]:
    with _get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    fecha_evento,
                    titulo,
                    direccion,
                    colonia,
                    gravedad,
                    descripcion,
                    mm_lluvia,
                    tipo_evento,
                    medio,
                    imagen,
                    url_noticia,
                    tipo_reporte,
                    detectado_ai,
                    ai_confidence,
                    status,
                    created_at,
                    ST_Y(geom)::double precision AS lat,
                    ST_X(geom)::double precision AS lon
                FROM reports
                ORDER BY created_at DESC
                LIMIT %s;
                """,
                (limit,),
            )
            rows = cur.fetchall()
            return [_row_to_public_report(r) for r in rows]


def _create_report_sync(report: ReportIn) -> dict[str, Any]:
    report_id = f"rep-{uuid4().hex}"

    with _get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reports (
                    id,
                    fecha_evento,
                    titulo,
                    direccion,
                    colonia,
                    gravedad,
                    descripcion,
                    mm_lluvia,
                    tipo_evento,
                    medio,
                    imagen,
                    url_noticia,
                    tipo_reporte,
                    detectado_ai,
                    ai_confidence,
                    status,
                    geom
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326)
                )
                RETURNING
                    id,
                    fecha_evento,
                    titulo,
                    direccion,
                    colonia,
                    gravedad,
                    descripcion,
                    mm_lluvia,
                    tipo_evento,
                    medio,
                    imagen,
                    url_noticia,
                    tipo_reporte,
                    detectado_ai,
                    ai_confidence,
                    status,
                    created_at,
                    ST_Y(geom)::double precision AS lat,
                    ST_X(geom)::double precision AS lon;
                """,
                (
                    report_id,
                    report.fecha_evento,
                    report.titulo,
                    report.direccion,
                    report.colonia,
                    report.gravedad,
                    report.descripcion,
                    report.mm_lluvia,
                    report.tipo_evento,
                    report.medio,
                    report.imagen,
                    report.url_noticia,
                    report.tipo_reporte,
                    report.detectado_ai,
                    report.ai_confidence,
                    report.status,
                    report.lon,
                    report.lat,
                ),
            )
            row = cur.fetchone()
            return _row_to_public_report(row) if row else {"id": report_id}


@app.get("/api/reports")
async def list_reports(limit: int = 500):
    if not _db_is_configured():
        raise HTTPException(status_code=501, detail="Server not configured: missing DATABASE_URL")
    if limit < 1 or limit > 2000:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 2000")
    return await anyio.to_thread.run_sync(_list_reports_sync, limit)


@app.post("/api/reports")
async def create_report(report: ReportIn):
    if not _db_is_configured():
        raise HTTPException(status_code=501, detail="Server not configured: missing DATABASE_URL")
    if not (-90 <= report.lat <= 90 and -180 <= report.lon <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    return await anyio.to_thread.run_sync(_create_report_sync, report)


@app.post("/api/analyze")
async def analyze_image(file: UploadFile = File(...)):
    if not ROBOFLOW_API_KEY:
        raise HTTPException(
            status_code=501,
            detail="Server not configured: missing ROBOFLOW_API_KEY",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    url = _roboflow_url()
    if not url:
        raise HTTPException(status_code=500, detail="Roboflow URL could not be built")

    timeout = httpx.Timeout(30.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url,
                content=image_bytes,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        # Forward a readable error without leaking secrets.
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Roboflow returned an error",
                "status_code": exc.response.status_code,
                "body": exc.response.text,
            },
        ) from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="Roboflow request timed out") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Roboflow request failed: {exc}") from exc
