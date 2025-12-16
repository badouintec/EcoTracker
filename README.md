# 🌍 EcoTrack

**Cartografía Participativa de Riesgos Hidrometeorológicos**

EcoTrack es una plataforma web integral que combina monitoreo ambiental, detección de contaminación por IA y análisis de datos históricos para la gestión sostenible de recursos hídricos en Hermosillo, Sonora.

![EcoTrack Logo](Logo/EcoTrack.png)

## 🎯 Descripción

EcoTrack transforma la manera en que monitoreamos y gestionamos los riesgos ambientales urbanos. La plataforma integra:

- **📊 Análisis de Datos Históricos**: Procesamiento de 60+ años de datos meteorológicos de CONAGUA
- **🗺️ Cartografía Interactiva**: Visualización de eventos hidrometeorológicos y puntos de contaminación  
- **🤖 Detección IA de Basura**: Sistema automatizado de identificación de contaminación usando visión computacional
- **👥 Participación Ciudadana**: Reportes georreferenciados de incidencias ambientales
- **📱 Diseño Responsivo**: Optimizado para dispositivos móviles y desktop

## ✨ Funcionalidades Principales

### 🗺️ **Mapa Interactivo Principal**
- Visualización de eventos hidrometeorológicos históricos (2025)
- Reportes ciudadanos con imágenes georreferenciadas
- Capas opcionales: AGEB urbanas, datos meteorológicos
- Auto-centrado de popups para mejor experiencia de usuario
- Navegación intuitiva con controles de zoom y capas

### 🤖 **Detector IA de Contaminación**
- **API Roboflow**: Modelo entrenado para detección de basura urbana
- **Extracción EXIF**: Geolocalización automática de imágenes
- **Bounding Boxes Precisos**: Marcado visual de objetos detectados
- **Mapeo en Tiempo Real**: Integración automática con el mapa principal
- **Reportes PDF**: Generación de informes técnicos
- **Modo Demo**: Fallback para pruebas sin conectividad

### 📊 **Análisis de Datos Históricos**
- **Datos CONAGUA**: Histórico de precipitaciones 1966-2024
- **Eventos Catalogados**: 12 eventos hidrometeorológicos documentados
- **Visualizaciones**: Gráficos interactivos con Chart.js
- **Estadísticas**: Análisis de tendencias y patrones climáticos

### 📱 **Experiencia Móvil**
- **Diseño Mobile-First**: Optimizado para dispositivos táctiles
- **Navegación Inferior**: Acceso rápido en pantallas pequeñas
- **Gestos Táctiles**: Soporte completo para zoom y panorámica
- **Carga Rápida**: Optimización de rendimiento para conexiones lentas

## 🛠️ Tecnologías

### Frontend
- **HTML5** + **CSS3** + **JavaScript ES6+**
- **Tailwind CSS**: Framework de estilos utilitarios
- **Leaflet.js 1.9.4**: Biblioteca de mapas interactivos
- **Chart.js**: Visualizaciones de datos
- **Font Awesome**: Iconografía
- **Google Fonts**: Tipografía (Space Grotesk, Plus Jakarta Sans)

### APIs y Servicios
- **Roboflow API**: Detección de contaminación por IA
- **OpenStreetMap**: Tiles de mapas base
- **CONAGUA**: Datos meteorológicos históricos
- **EXIF.js**: Extracción de metadatos de imágenes

### Datos
- **CSV**: Eventos hidrometeorológicos
- **GeoJSON**: Límites urbanos (AGEB)
- **JSON**: Configuraciones y reportes ciudadanos

## 📁 Estructura del Proyecto

```
EcoTrack/
├── 📄 index.html              # Página principal con mapa
├── 📄 detector.html           # Sistema de detección IA
├── 📁 assets/
│   ├── 🎨 css/
│   │   └── styles.css         # Estilos principales + responsivo
│   ├── 📊 data/
│   │   ├── eventos_hidro.csv  # Eventos históricos 2025
│   │   ├── hermosillo_lluvias_historicas.csv # Datos CONAGUA
│   │   └── IMG_6701.JPG       # Imagen ejemplo ciudadano
│   └── 💻 js/
│       ├── app.js             # Lógica principal del mapa
│       ├── detector.js        # Sistema de detección IA
│       ├── historical.js      # Análisis datos históricos
│       └── main.js            # Coordinador de módulos
├── 📁 GeoJSON/
│   └── ageb_hermosillo.geojson # Límites urbanos
├── 📁 Logo/
│   └── EcoTrack.png           # Logotipo oficial
└── 📁 scripts/
    └── process_conagua_data.py # Procesador datos CONAGUA
```

## 🚀 Instalación y Uso

### Requisitos Previos
- **Navegador Web Moderno** (Chrome 90+, Firefox 88+, Safari 14+)
- **Servidor Web Local** (para desarrollo)
- **Python 3.8+** (para procesamiento de datos)

### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/BlueDisplay/EcoTrack.git
cd EcoTrack
```

2. **Configurar servidor local**
```bash
# Recomendado: levantar el backend (sirve el frontend + API proxy)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

3. **Acceder a la aplicación**
```
http://localhost:8000
```

### Uso del Sistema

#### 🗺️ **Mapa Principal**
1. Abrir `http://localhost:8080`
2. Explorar eventos hidrometeorológicos con los marcadores
3. Activar/desactivar capas con el control de capas
4. Hacer click en marcadores para ver detalles e imágenes

#### 🤖 **Detector de Basura**
1. Navegar a "Detector IA" en el menú
2. Subir imagen arrastrando o seleccionando archivo
3. Hacer click en "Detectar Basura"
4. Revisar resultados y generar reporte PDF

## ⚙️ Configuración

### API de Roboflow
La detección IA se consume **solo desde el backend** (proxy seguro) para no exponer llaves en el navegador.

- Variables de entorno:
  - `ROBOFLOW_API_KEY`: requerida para usar IA real
  - `ROBOFLOW_MODEL`: opcional (default: `visual-pollution-detection-04jk5/3`)

Puedes usar `.env.example` como plantilla para desarrollo local.

Si `ROBOFLOW_API_KEY` no está configurada, el detector entra automáticamente en **modo demo**.

## 🚄 Deploy en Railway

1. Conecta este repo en Railway como nuevo proyecto.
2. (Opcional pero recomendado) Añade un plugin de **PostgreSQL** en Railway.
3. Configura Variables (Settings → Variables):
    - `ROBOFLOW_API_KEY`
    - `ROBOFLOW_MODEL` (opcional)
    - `DATABASE_URL` (si usas PostgreSQL en Railway)
4. Railway usará `railway.json` y arrancará con:
    - `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

Endpoints útiles:
- `GET /api/health` (verifica configuración)
- `POST /api/analyze` (recibe `multipart/form-data` con `file`)
- `GET /api/reports` (lista reportes desde Postgres)
- `POST /api/reports` (crea reporte en Postgres)

Notas:
- Si `DATABASE_URL` está configurada, el backend inicializa automáticamente `PostGIS` y crea la tabla `reports` en el arranque.

### Procesamiento de Datos CONAGUA
Para actualizar datos históricos:

```bash
python3 scripts/process_conagua_data.py
```

## 📊 Datos del Sistema

### Eventos Hidrometeorológicos (2025)
- **12 eventos** catalogados (julio-octubre 2025)
- **Coordenadas GPS** precisas
- **Imágenes de referencia** de daños
- **Clasificación** por tipo de evento

### Datos Históricos CONAGUA
- **Período**: 1966-2024 (60+ años)
- **Estación**: 26139 (Hermosillo)
- **Variables**: Precipitación diaria, temperaturas
- **Formato**: CSV procesado y limpio

### Reportes Ciudadanos
- **Geolocalización**: Coordenadas extraídas de EXIF
- **Imágenes**: Formato JPG con metadatos
- **Clasificación**: Automática por IA
- **Integración**: Directa con mapa principal

## 🎨 Diseño y UX

### Paleta de Colores EcoTrack
- **Verde Primario**: `#22c55e` (sostenibilidad)
- **Verde Secundario**: `#16a34a` (naturaleza)
- **Cyan Accent**: `#06b6d4` (agua)
- **Gradientes**: Efectos glassmorphism

### Principios de Diseño
- **Mobile-First**: Diseño responsivo desde dispositivos pequeños
- **Glassmorphism**: Efectos de vidrio esmerilado modernos
- **Microinteracciones**: Animaciones suaves y feedback visual
- **Accesibilidad**: Contraste alto y navegación por teclado

## 🔧 Desarrollo

### Agregar Nuevos Eventos
1. Editar `assets/data/eventos_hidro.csv`
2. Incluir: fecha, coordenadas, tipo, descripción, imagen
3. Recargar la aplicación

### Personalizar Detecciones IA
1. Modificar `CONFIG` en `assets/js/detector.js`
2. Ajustar umbrales de confianza
3. Cambiar tipos de objetos detectables

### Estilos Personalizados
- Editar `assets/css/styles.css`
- Usar variables CSS para colores consistentes
- Mantener diseño responsivo

## 📈 Métricas y Analytics

### Estadísticas del Detector
- **Objetos Detectados**: Conteo total por sesión
- **Confianza Promedio**: Precisión del modelo IA
- **Índice de Contaminación**: Métrica calculada automáticamente

### Datos Históricos
- **Tendencias Climáticas**: Análisis de 60 años
- **Eventos Extremos**: Identificación de patrones
- **Correlaciones**: Lluvia vs. eventos hidrometeorológicos

## 🤝 Contribuir

### Reportar Issues
1. Usar GitHub Issues
2. Incluir detalles del navegador
3. Proporcionar pasos para reproducir

### Enviar Pull Requests
1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📝 Changelog

### v2.0.0 (Octubre 2025)
- 🎯 **Rebrand completo**: HydroFlujo → EcoTrack
- 🤖 **Detector IA**: Sistema completo de detección de basura
- 📱 **Diseño responsivo**: Optimización móvil completa
- 📊 **Datos históricos**: Integración CONAGUA 1966-2024
- 🗺️ **Auto-centrado**: Mejora UX en popups del mapa

### v1.0.0 (Julio 2025)
- 🗺️ **Mapa inicial**: Visualización eventos hidrometeorológicos
- 📄 **CSV Integration**: Carga de datos estructurados
- 🎨 **UI Base**: Diseño inicial con Tailwind CSS

## 🔗 Enlaces

- **Demo Live**: [Próximamente]
- **Documentación API**: [Roboflow Visual Pollution Detection](https://roboflow.com/)
- **Datos CONAGUA**: [Servicio Meteorológico Nacional](https://smn.conagua.gob.mx/)

## 📧 Contacto

**Equipo EcoTrack**
- Email: [pendiente]
- GitHub: [@BlueDisplay](https://github.com/BlueDisplay)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">

**🌍 EcoTrack - Tecnología para un Futuro Sostenible 🌱**

*Construyendo ciudades más inteligentes, un dato a la vez*

</div>
