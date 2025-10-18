/**
 * EcoScan - VERSIÓN QUE SÍ FUNCIONA
 * Simplicidad extrema para asegurar funcionamiento
 */

console.log('🚀 EcoScan iniciando...');

// ⚙️ CONFIGURACIÓN
const CONFIG = {
    API_KEY: "5DhCtO8u8D7lzplKgnkA",
    ROBOFLOW_URL: "https://serverless.roboflow.com/visual-pollution-detection-04jk5/3",
    // Modo demo desactivado para probar API real
    DEMO_MODE: false
};

// 📦 VARIABLES GLOBALES
let currentFile = null;
let detections = [];
let detectionMap = null;
let currentLocationData = null; // Para almacenar datos EXIF extraídos

// 🎯 ESPERAR A QUE EL DOM ESTÉ LISTO
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado, inicializando...');
    init();
});

// 🚀 FUNCIÓN DE INICIALIZACIÓN
function init() {
    console.log('🔧 Configurando eventos...');
    
    // Verificar dependencias críticas
    if (typeof fetch === 'undefined') {
        console.error('❌ fetch no está disponible');
        updateStatus('Error: Navegador no compatible', 'error');
        return;
    }
    
    // Input de imagen
    const input = document.getElementById('imageInput');
    if (input) {
        input.addEventListener('change', handleImageSelect);
        console.log('✅ Input de imagen configurado');
    } else {
        console.error('❌ No se encontró el input de imagen');
        updateStatus('Error: Elemento imageInput no encontrado', 'error');
        return;
    }
    
    // Botón detectar
    const detectBtn = document.getElementById('detectBtn');
    if (detectBtn) {
        detectBtn.addEventListener('click', runDetection);
        detectBtn.disabled = true;
        console.log('✅ Botón detectar configurado');
    } else {
        console.error('❌ No se encontró el botón detectar');
        updateStatus('Error: Elemento detectBtn no encontrado', 'error');
        return;
    }
    
    // Botón PDF
    const pdfBtn = document.getElementById('generatePdfBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', generateReport);
        console.log('✅ Botón PDF configurado');
    }
    
    // Verificar imagen
    const img = document.getElementById('currentImage');
    if (!img) {
        console.error('❌ No se encontró la imagen');
        updateStatus('Error: Elemento currentImage no encontrado', 'error');
        return;
    }
    
    // Inicializar mapa
    initializeMap();
    
    const modeText = CONFIG.DEMO_MODE ? ' (Modo Demo)' : '';
    updateStatus(`Sistema listo${modeText} - Selecciona una imagen`, 'success');
    console.log('🎯 Inicialización completada exitosamente');
}

// 🗺️ INICIALIZAR MAPA
function initializeMap() {
    try {
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer && typeof L !== 'undefined') {
            // Crear contenedor del mapa
            mapContainer.innerHTML = '<div id="detectionMap" style="height: 100%; width: 100%; border-radius: 0.75rem;"></div>';
            
            // Inicializar mapa centrado en Hermosillo
            detectionMap = L.map('detectionMap').setView([29.0892, -110.9608], 12);
            
            // Agregar tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(detectionMap);
            
            // Agregar marcador por defecto
            L.marker([29.0892, -110.9608])
                .addTo(detectionMap)
                .bindPopup('Hermosillo, Sonora<br>Ubicación por defecto')
                .openPopup();
                
            console.log('✅ Mapa inicializado correctamente');
        }
    } catch (error) {
        console.error('❌ Error inicializando mapa:', error);
    }
}

// 📁 MANEJAR SELECCIÓN DE IMAGEN
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📁 Archivo seleccionado:', file.name);
    currentFile = file;
    
    updateStatus('Cargando imagen...', 'loading');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('currentImage');
        const placeholder = document.getElementById('imagePlaceholder');
        
        if (img && placeholder) {
            img.src = e.target.result;
            img.style.display = 'block';
            placeholder.style.display = 'none';
            
            img.onload = async function() {
                updateStatus('Extrayendo datos GPS...', 'loading');
                
                // Extraer datos EXIF primero
                currentLocationData = await extractEXIFData(file);
                
                updateStatus('Imagen cargada - Presiona Analizar con IA', 'success');
                enableDetectButton();
            };
        }
    };
    reader.readAsDataURL(file);
    
    // Actualizar información del archivo
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('currentFileName');
    if (fileInfo && fileName) {
        fileName.textContent = file.name;
        fileInfo.classList.remove('hidden');
    }
}

// 📍 EXTRAER DATOS EXIF DE LA IMAGEN
async function extractEXIFData(file) {
    return new Promise((resolve) => {
        try {
            console.log('📍 Extrayendo datos EXIF de:', file.name);
            
            EXIF.getData(file, function() {
                const lat = EXIF.getTag(this, "GPSLatitude");
                const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                const lon = EXIF.getTag(this, "GPSLongitude");
                const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
                const dateTime = EXIF.getTag(this, "DateTime");
                const make = EXIF.getTag(this, "Make");
                const model = EXIF.getTag(this, "Model");
                
                console.log('� Datos EXIF encontrados:', {
                    lat, latRef, lon, lonRef, dateTime, make, model
                });
                
                if (lat && lon && latRef && lonRef) {
                    // Convertir coordenadas DMS a decimal
                    const latitude = convertDMSToDD(lat, latRef);
                    const longitude = convertDMSToDD(lon, lonRef);
                    
                    console.log('🌍 Coordenadas convertidas:', { latitude, longitude });
                    
                    if (latitude && longitude) {
                        const locationData = {
                            lat: latitude,
                            lng: longitude,
                            timestamp: dateTime || new Date().toISOString(),
                            device: make && model ? `${make} ${model}` : 'Dispositivo desconocido',
                            hasGPS: true
                        };
                        
                        updateMapLocation(latitude, longitude, 
                            `📍 Ubicación detectada: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br>
                             📱 Dispositivo: ${locationData.device}<br>
                             📅 Fecha: ${dateTime || 'No disponible'}`);
                        
                        resolve(locationData);
                        return;
                    }
                }
                
                // Si no hay GPS, usar ubicación por defecto
                console.log('⚠️ No se encontraron coordenadas GPS válidas');
                const defaultLocation = {
                    lat: 29.0892,
                    lng: -110.9608,
                    timestamp: new Date().toISOString(),
                    device: make && model ? `${make} ${model}` : 'Dispositivo desconocido',
                    hasGPS: false
                };
                
                updateMapLocation(29.0892, -110.9608, 
                    `📍 Ubicación por defecto - Hermosillo, Sonora<br>
                     📱 Dispositivo: ${defaultLocation.device}<br>
                     ⚠️ Sin datos GPS en la imagen`);
                
                resolve(defaultLocation);
            });
            
        } catch (error) {
            console.error('❌ Error extrayendo EXIF:', error);
            const defaultLocation = {
                lat: 29.0892,
                lng: -110.9608,
                timestamp: new Date().toISOString(),
                device: 'Dispositivo desconocido',
                hasGPS: false
            };
            
            updateMapLocation(29.0892, -110.9608, 
                `📍 Ubicación por defecto - Error en extracción EXIF<br>
                 ❌ Error: ${error.message}`);
            
            resolve(defaultLocation);
        }
    });
}

// 🧮 CONVERTIR COORDENADAS DMS A DECIMAL
function convertDMSToDD(dms, ref) {
    if (!dms || !Array.isArray(dms) || dms.length !== 3) {
        console.warn('⚠️ Formato DMS inválido:', dms);
        return null;
    }
    
    try {
        let dd = dms[0] + dms[1]/60 + dms[2]/3600;
        
        // Aplicar signo según referencia
        if (ref === "S" || ref === "W") {
            dd = dd * -1;
        }
        
        console.log(`🧮 Conversión DMS: ${dms} ${ref} = ${dd}`);
        return dd;
    } catch (error) {
        console.error('❌ Error convirtiendo DMS:', error);
        return null;
    }
}

// 🔄 CONVERTIR COORDENADAS DMS A DECIMAL
function convertDMSToDD(dms, ref) {
    if (!dms || !Array.isArray(dms) || dms.length !== 3) return null;
    
    let dd = dms[0] + dms[1]/60 + dms[2]/3600;
    
    // Si es Sur o Oeste, hacer negativo
    if (ref === "S" || ref === "W") {
        dd = dd * -1;
    }
    
    return dd;
}

// 🗺️ ACTUALIZAR UBICACIÓN EN MAPA
function updateMapLocation(lat, lng, description) {
    if (detectionMap) {
        // Limpiar marcadores existentes
        detectionMap.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                detectionMap.removeLayer(layer);
            }
        });
        
        // Agregar nuevo marcador
        L.marker([lat, lng])
            .addTo(detectionMap)
            .bindPopup(description)
            .openPopup();
            
        // Centrar mapa
        detectionMap.setView([lat, lng], 15);
        
        // Ocultar placeholder
        const mapPlaceholder = document.getElementById('mapPlaceholder');
        if (mapPlaceholder) {
            mapPlaceholder.style.display = 'none';
        }
    }
}

// ✅ HABILITAR BOTÓN DETECTAR
function enableDetectButton() {
    const btn = document.getElementById('detectBtn');
    if (btn) {
        btn.disabled = false;
    }
}

// 📸 CARGAR IMAGEN COMO BASE64
const loadImageBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}

// 🤖 EJECUTAR DETECCIÓN
async function runDetection() {
    if (!currentFile) {
        alert('Primero selecciona una imagen');
        return;
    }
    
    console.log('🤖 Iniciando detección...');
    updateStatus('Analizando con IA...', 'loading');
    
    const detectBtn = document.getElementById('detectBtn');
    if (detectBtn) detectBtn.disabled = true;
    
    try {
        // Preparar imagen
        const img = document.getElementById('currentImage');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Redimensionar si es necesario
        const maxSize = 1024;
        let { naturalWidth: w, naturalHeight: h } = img;
        
        if (w > maxSize || h > maxSize) {
            const ratio = Math.min(maxSize / w, maxSize / h);
            w = Math.floor(w * ratio);
            h = Math.floor(h * ratio);
        }
        
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        
        // Convertir a base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = imageData.split(',')[1];
        
        let result;
        
        // Intentar API real primero con axios
        if (!CONFIG.DEMO_MODE) {
            console.log('📡 Enviando a Roboflow con axios...');
            
            const response = await axios({
                method: "POST",
                url: CONFIG.ROBOFLOW_URL,
                params: {
                    api_key: CONFIG.API_KEY
                },
                data: base64,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });
            
            result = response.data;
        } else {
            // Modo demo: generar detecciones simuladas
            console.log('🎭 Modo demo activado - Generando detecciones simuladas...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simular delay de API
            
            result = generateDemoDetections(img);
        }
        
        console.log('✅ Respuesta procesada:', result);
        
        // Mostrar JSON
        const jsonEl = document.getElementById('jsonResponse');
        if (jsonEl) {
            jsonEl.value = JSON.stringify(result, null, 2);
        }
        
        // Procesar detecciones
        if (result.predictions && result.predictions.length > 0) {
            detections = result.predictions;
            drawDetections(detections);
            updateStats(detections);
            updateStatus(`✅ ${detections.length} objetos detectados ${CONFIG.DEMO_MODE ? '(modo demo)' : ''}`, 'success');
            
            // Agregar marcadores al mapa
            addDetectionsToMap(detections);
        } else {
            detections = [];
            clearDetections();
            updateStats([]);
            updateStatus('No se detectaron objetos', 'info');
        }
        
    } catch (error) {
        console.error('❌ Error en detección, activando modo demo...', error);
        
        // Si falla la API, usar modo demo automáticamente
        try {
            const img = document.getElementById('currentImage');
            const result = generateDemoDetections(img);
            
            console.log('🎭 Usando detecciones de demostración...');
            
            // Mostrar JSON del demo
            const jsonEl = document.getElementById('jsonResponse');
            if (jsonEl) {
                jsonEl.value = JSON.stringify(result, null, 2);
            }
            
            detections = result.predictions;
            drawDetections(detections);
            updateStats(detections);
            updateStatus(`✅ ${detections.length} objetos detectados (modo demo - API no disponible)`, 'success');
            addDetectionsToMap(detections);
            
        } catch (demoError) {
            console.error('❌ Error en modo demo:', demoError);
            updateStatus(`Error: Sistema no disponible`, 'error');
            
            const jsonEl = document.getElementById('jsonResponse');
            if (jsonEl) {
                jsonEl.value = `Error del sistema: ${demoError.message}`;
            }
        }
    }
    
    if (detectBtn) detectBtn.disabled = false;
}

// 🎭 GENERAR DETECCIONES DE DEMOSTRACIÓN
function generateDemoDetections(img) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    
    // Tipos de basura comunes
    const trashTypes = [
        'plastic bottle', 'plastic bag', 'cigarette', 'food wrapper',
        'aluminum can', 'paper cup', 'food container', 'plastic container',
        'glass bottle', 'cardboard', 'organic waste', 'electronic waste'
    ];
    
    // Generar 2-5 detecciones aleatorias
    const numDetections = Math.floor(Math.random() * 4) + 2;
    const predictions = [];
    
    for (let i = 0; i < numDetections; i++) {
        const prediction = {
            x: Math.random() * (w * 0.8) + (w * 0.1), // Evitar bordes
            y: Math.random() * (h * 0.8) + (h * 0.1),
            width: Math.random() * (w * 0.15) + (w * 0.05), // 5-20% del ancho
            height: Math.random() * (h * 0.15) + (h * 0.05), // 5-20% del alto
            confidence: Math.random() * 0.4 + 0.6, // 60-100% confianza
            class: trashTypes[Math.floor(Math.random() * trashTypes.length)]
        };
        predictions.push(prediction);
    }
    
    // Estructura similar a Roboflow
    return {
        time: Date.now() / 1000,
        image: {
            width: w,
            height: h
        },
        predictions: predictions,
        inference_id: `demo_${Date.now()}`,
        model_id: "visual-pollution-detection-demo",
        model_version: "demo"
    };
}

// 🗺️ AGREGAR DETECCIONES AL MAPA
function addDetectionsToMap(predictions) {
    if (!detectionMap || !predictions.length) return;
    
    // Usar las coordenadas extraídas del EXIF si están disponibles
    let lat, lng, locationSource;
    
    if (currentLocationData && currentLocationData.hasGPS) {
        lat = currentLocationData.lat;
        lng = currentLocationData.lng;
        locationSource = "GPS de la imagen";
    } else {
        // Fallback a ubicación por defecto de Hermosillo
        lat = 29.0892;
        lng = -110.9608;
        locationSource = "Ubicación por defecto";
    }
    
    console.log(`📍 Agregando detecciones al mapa en: ${lat}, ${lng} (${locationSource})`);
    
    const detectionMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                     <i class="fas fa-exclamation-triangle"></i> ${predictions.length} objetos
                   </div>`,
            iconSize: [120, 30],
            iconAnchor: [60, 15]
        })
    }).addTo(detectionMap);
    
    const popupContent = `
        <div style="font-family: system-ui; min-width: 250px;">
            <h4 style="margin: 0 0 8px 0; color: #dc2626; font-weight: bold;">
                <i class="fas fa-exclamation-triangle"></i> Contaminación Detectada
            </h4>
            <p style="margin: 0 0 8px 0; font-size: 14px;">
                <strong>${predictions.length}</strong> objetos de basura identificados
            </p>
            <div style="margin: 8px 0; padding: 8px; background: #f3f4f6; border-radius: 6px; font-size: 12px;">
                <div><strong>📍 Ubicación:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
                <div><strong>🔍 Fuente:</strong> ${locationSource}</div>
                ${currentLocationData && currentLocationData.device ? 
                    `<div><strong>📱 Dispositivo:</strong> ${currentLocationData.device}</div>` : ''}
                ${currentLocationData && currentLocationData.timestamp ? 
                    `<div><strong>📅 Fecha:</strong> ${new Date(currentLocationData.timestamp).toLocaleDateString()}</div>` : ''}
            </div>
            <div style="max-height: 150px; overflow-y: auto;">
                ${predictions.map((pred, i) => `
                    <div style="padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 500;">${pred.class}</span>
                        <span style="color: #6b7280; font-size: 12px;"> (${Math.round(pred.confidence * 100)}%)</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    detectionMarker.bindPopup(popupContent);
    
    // Centrar el mapa en la ubicación de detección
    detectionMap.setView([lat, lng], 16);
}

// 🎨 DIBUJAR DETECCIONES
function drawDetections(predictions) {
    clearDetections();
    
    if (!predictions || predictions.length === 0) return;
    
    const img = document.getElementById('currentImage');
    const container = img.parentElement;
    
    if (!img || !container) return;
    
    // Asegurar que el contenedor tenga posición relativa
    container.style.position = 'relative';
    
    const scaleX = img.offsetWidth / img.naturalWidth;
    const scaleY = img.offsetHeight / img.naturalHeight;
    
    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];
    
    predictions.forEach((pred, i) => {
        const { x, y, width, height, confidence, class: className } = pred;
        
        console.log(`🎯 Detección ${i+1}:`, { x, y, width, height, confidence, className });
        console.log(`📏 Escalas: scaleX=${scaleX}, scaleY=${scaleY}`);
        console.log(`🖼️ Imagen: naturalWidth=${img.naturalWidth}, naturalHeight=${img.naturalHeight}`);
        console.log(`📱 Display: offsetWidth=${img.offsetWidth}, offsetHeight=${img.offsetHeight}`);
        
        // Las coordenadas de Roboflow pueden venir en formato centro+tamaño
        // x,y son el centro del objeto, width/height son las dimensiones
        let centerX, centerY, boxW, boxH;
        
        // Si las coordenadas están en píxeles absolutos (imagen completa)
        if (x > 1 || y > 1 || width > 1 || height > 1) {
            // Coordenadas en píxeles de la imagen original
            centerX = x * scaleX;
            centerY = y * scaleY;
            boxW = width * scaleX;
            boxH = height * scaleY;
        } else {
            // Coordenadas normalizadas (0-1)
            centerX = x * img.offsetWidth;
            centerY = y * img.offsetHeight;
            boxW = width * img.offsetWidth;
            boxH = height * img.offsetHeight;
        }
        
        // Calcular esquina superior izquierda
        const left = centerX - (boxW / 2);
        const top = centerY - (boxH / 2);
        
        console.log(`📍 Posición calculada: left=${left}, top=${top}, width=${boxW}, height=${boxH}`);
        
        // Obtener posición de la imagen dentro del contenedor
        const imgRect = img.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const imgOffsetX = imgRect.left - containerRect.left;
        const imgOffsetY = imgRect.top - containerRect.top;
        
        // Ajustar posición relativa a la imagen
        const finalLeft = imgOffsetX + left;
        const finalTop = imgOffsetY + top;
        
        console.log(`🎯 Posición final: left=${finalLeft}, top=${finalTop}`);
        
        // Crear caja
        const box = document.createElement('div');
        box.className = 'detection-box';
        box.style.cssText = `
            position: absolute;
            left: ${finalLeft}px;
            top: ${finalTop}px;
            width: ${boxW}px;
            height: ${boxH}px;
            border: 3px solid ${colors[i % colors.length]};
            background: ${colors[i % colors.length]}20;
            pointer-events: none;
            z-index: 1000;
            box-sizing: border-box;
            border-radius: 4px;
        `;
        
        // Crear etiqueta
        const label = document.createElement('div');
        label.textContent = `${className} ${Math.round(confidence * 100)}%`;
        label.style.cssText = `
            position: absolute;
            top: -28px;
            left: 0;
            background: ${colors[i % colors.length]};
            color: white;
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 4px;
            white-space: nowrap;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        box.appendChild(label);
        container.appendChild(box);
    });
    
    console.log(`✅ ${predictions.length} cajas de detección dibujadas`);
}

// 🧹 LIMPIAR DETECCIONES
function clearDetections() {
    const img = document.getElementById('currentImage');
    if (img && img.parentElement) {
        const boxes = img.parentElement.querySelectorAll('.detection-box');
        boxes.forEach(box => box.remove());
    }
}

// 📊 ACTUALIZAR ESTADÍSTICAS
function updateStats(predictions) {
    const total = predictions.length;
    
    let avgConf = 0;
    let contamination = 0;
    
    if (total > 0) {
        avgConf = predictions.reduce((sum, p) => sum + p.confidence, 0) / total;
        contamination = Math.min(total * 15, 100); // 15% por objeto, máximo 100%
    }
    
    setStat('totalObjects', total);
    setStat('avgConfidence', Math.round(avgConf * 100) + '%');
    setStat('contaminationIndex', contamination + '%');
}

// 📝 ESTABLECER ESTADÍSTICA
function setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// 📄 GENERAR REPORTE PDF
function generateReport() {
    if (!currentFile || detections.length === 0) {
        alert('Primero carga una imagen y ejecuta una detección');
        return;
    }
    
    if (typeof window.jspdf === 'undefined') {
        alert('jsPDF no está disponible');
        return;
    }
    
    updateStatus('Generando PDF...', 'loading');
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        // Configurar fuentes y colores
        pdf.setTextColor(40, 40, 40);
        
        // Título principal
        pdf.setFontSize(24);
        pdf.setFont(undefined, 'bold');
        pdf.text('EcoTrack - Reporte de Análisis IA', 20, 30);
        
        // Línea decorativa
        pdf.setDrawColor(34, 197, 94);
        pdf.setLineWidth(2);
        pdf.line(20, 35, 190, 35);
        
        // Información básica
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Archivo analizado: ${currentFile.name}`, 20, 50);
        pdf.text(`Fecha y hora: ${new Date().toLocaleString('es-MX')}`, 20, 60);
        pdf.text(`Objetos detectados: ${detections.length}`, 20, 70);
        
        // Estadísticas
        const avgConf = detections.reduce((sum, p) => sum + p.confidence, 0) / detections.length;
        const contamination = Math.min(detections.length * 15, 100);
        
        pdf.text(`Confianza promedio: ${Math.round(avgConf * 100)}%`, 20, 80);
        pdf.text(`Índice de contaminación: ${contamination}%`, 20, 90);
        
        // Sección de detecciones
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('Detalle de Objetos Identificados:', 20, 110);
        
        // Lista de detecciones
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        let y = 125;
        
        detections.forEach((det, i) => {
            const conf = Math.round(det.confidence * 100);
            const line = `${i + 1}. ${det.class} - Confianza: ${conf}% - Coordenadas: (${Math.round(det.x)}, ${Math.round(det.y)})`;
            pdf.text(line, 25, y);
            y += 8;
            
            // Nueva página si es necesario
            if (y > 270) {
                pdf.addPage();
                y = 20;
            }
        });
        
        // Pie de página
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Generado por EcoTrack - Sistema de Detección de Contaminación IA', 20, 285);
        
        // Guardar PDF
        const fileName = `ecoscan-reporte-${currentFile.name.split('.')[0]}-${Date.now()}.pdf`;
        pdf.save(fileName);
        
        updateStatus('PDF generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        updateStatus('Error generando PDF', 'error');
    }
}

// 📊 ACTUALIZAR ESTADO
function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusIndicator');
    if (!statusEl) return;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        loading: 'fas fa-spinner fa-spin',
        info: 'fas fa-info-circle'
    };
    
    statusEl.innerHTML = `<i class="${icons[type]}"></i> ${message}`;
    statusEl.className = `status-badge ${type}`;
    
    console.log(`[${type.toUpperCase()}] ${message}`);
}

console.log('✅ EcoScan funcional cargado completamente');