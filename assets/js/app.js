/*
 * EcoTrack - Aplicación Principal
 * Plataforma de monitoreo ambiental integral
 * Hermosillo, Sonora - México
 */

// ==========================================================================
// Global State Management
// ==========================================================================

const AppState = {
    incidents: [],
    citizenReports: [],
    map: null,
    charts: {},
    currentView: 'welcome',
    isLoading: false,
    filters: {
        severity: [],
        colonia: [],
        dateRange: null
    },
    cache: {
        csvData: null,
        citizenData: null,
        lastUpdate: null,
        version: '2.0.0'
    },
    performance: {
        startTime: performance.now(),
        loadTimes: {}
    }
};

// ==========================================================================
// Utility Functions
// ==========================================================================

const Utils = {
    // Format date for display
    formatDate: (dateString) => {
        return new Date(dateString).toLocaleDateString('es-MX', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    },

    // Generate unique ID
    generateId: () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Sistema de notificaciones mejorado
    showNotification: (message, type = 'success', duration = 5000, title = null) => {
        // Crear container si no existe
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Crear toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Iconos por tipo
        const icons = {
            success: 'fas fa-check',
            error: 'fas fa-times',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info'
        };

        // Títulos por defecto
        const defaultTitles = {
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            info: 'Información'
        };

        const toastTitle = title || defaultTitles[type];
        
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="${icons[type]}"></i>
                </div>
                <div class="toast-body">
                    <div class="toast-title">${toastTitle}</div>
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close" onclick="Utils.removeToast(this.closest('.toast'))">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="toast-progress"></div>
        `;
        
        container.appendChild(toast);
        
        // Animación de entrada
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove
        setTimeout(() => {
            Utils.removeToast(toast);
        }, duration);

        return toast;
    },

    // Remover toast
    removeToast: (toast) => {
        if (toast && toast.parentNode) {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    },

    // Notificaciones específicas
    showSuccess: (message, title = 'Éxito') => {
        return Utils.showNotification(message, 'success', 5000, title);
    },

    showError: (message, title = 'Error') => {
        return Utils.showNotification(message, 'error', 7000, title);
    },

    showWarning: (message, title = 'Advertencia') => {
        return Utils.showNotification(message, 'warning', 6000, title);
    },

    showInfo: (message, title = 'Información') => {
        return Utils.showNotification(message, 'info', 4000, title);
    },

    // Loading states mejorados
    showLoading: (target, text = 'Cargando...') => {
        if (typeof target === 'string') {
            target = document.getElementById(target);
        }
        
        if (target) {
            target.classList.add('btn-loading');
            const originalText = target.textContent;
            target.textContent = text;
            target.disabled = true;
            
            // Guardar texto original para restaurar
            target.dataset.originalText = originalText;
        }
    },

    hideLoading: (target) => {
        if (typeof target === 'string') {
            target = document.getElementById(target);
        }
        
        if (target) {
            target.classList.remove('btn-loading');
            target.textContent = target.dataset.originalText || target.textContent;
            target.disabled = false;
            delete target.dataset.originalText;
        }
    },

    // Update legend counts
    updateLegendCounts: () => {
        const counts = AppState.incidents.reduce((acc, incident) => {
            acc[incident.gravedad] = (acc[incident.gravedad] || 0) + 1;
            acc.total = (acc.total || 0) + 1;
            return acc;
        }, {});

        ['alto', 'medio', 'bajo'].forEach(severity => {
            const element = document.getElementById(`count-${severity}`);
            if (element) element.textContent = counts[severity] || 0;
        });

        const totalElement = document.getElementById('count-total');
        if (totalElement) totalElement.textContent = counts.total || 0;
    },

    // Update stats displays with animations
    updateStatsDisplays: () => {
        const total = AppState.incidents.length + (AppState.citizenReports?.length || 0);
        const incidents = AppState.incidents.length;
        const citizenReports = AppState.citizenReports?.length || 0;
        const highRisk = AppState.incidents.filter(i => i.gravedad === 'alto').length;
        
        // Calculate last month data
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const thisMonthCount = AppState.incidents.filter(i => {
            const date = new Date(i.fecha_evento);
            return date >= thisMonth;
        }).length;
        
        const lastMonthCount = AppState.incidents.filter(i => {
            const date = new Date(i.fecha_evento);
            return date >= lastMonth && date < thisMonth;
        }).length;

        // Calculate percentages and changes
        const riskPercentage = total > 0 ? Math.round((highRisk / total) * 100) : 0;
        const monthChange = lastMonthCount > 0 ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) : 0;

        // Animate counters
        Utils.animateCounter('stats-total-reports', total);
        Utils.animateCounter('stats-high-risk', highRisk);
        Utils.animateCounter('stats-last-month', thisMonthCount);

        // Update additional info
        const monthName = now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        const statsMonthName = document.getElementById('stats-month-name');
        if (statsMonthName) {
            statsMonthName.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        }

        // Update change indicators
        const statsRiskPercentage = document.getElementById('stats-risk-percentage');
        if (statsRiskPercentage) {
            statsRiskPercentage.textContent = `${riskPercentage}%`;
        }

        const statsTotalChange = document.getElementById('stats-total-change');
        if (statsTotalChange) {
            const changeElement = statsTotalChange.parentElement;
            statsTotalChange.textContent = `${monthChange >= 0 ? '+' : ''}${monthChange}%`;
            
            // Update change class
            changeElement.className = changeElement.className.replace(/positive|negative|neutral/, '');
            if (monthChange > 0) {
                changeElement.classList.add('positive');
                changeElement.querySelector('i').className = 'fas fa-arrow-up';
            } else if (monthChange < 0) {
                changeElement.classList.add('negative');
                changeElement.querySelector('i').className = 'fas fa-arrow-down';
            } else {
                changeElement.classList.add('neutral');
                changeElement.querySelector('i').className = 'fas fa-minus';
            }
        }

        // Update other sections
        const aboutReports = document.getElementById('about-reports');
        if (aboutReports) aboutReports.textContent = `${total}+`;
        
        const footerUpdate = document.getElementById('footer-last-update');
        if (footerUpdate) footerUpdate.textContent = new Date().toLocaleTimeString('es-MX');

        // Trigger chart updates
        if (typeof ChartManager !== 'undefined') {
            ChartManager.updateCharts();
        }
    },

    // Animate counter with easing
    animateCounter: (elementId, targetValue, duration = 2000) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.dataset.count || '0');
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
            
            element.textContent = currentValue.toLocaleString();
            element.dataset.count = currentValue;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Add pulse effect when animation completes
                element.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 200);
            }
        };

        requestAnimationFrame(animate);
    },

    // Enhanced chart refresh with loading states
    refreshCharts: () => {
        const refreshButtons = document.querySelectorAll('[id^="refresh-"]');
        refreshButtons.forEach(btn => {
            Utils.showLoading(btn, '');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin text-sm"></i>';
        });

        setTimeout(() => {
            if (typeof ChartManager !== 'undefined') {
                ChartManager.updateCharts();
            }
            
            refreshButtons.forEach(btn => {
                Utils.hideLoading(btn);
                btn.innerHTML = '<i class="fas fa-sync-alt text-sm"></i>';
            });
            
            Utils.showSuccess('Gráficos actualizados correctamente');
        }, 1000);
    },

    // Cache management
    setCache: (key, data) => {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                version: AppState.cache.version
            };
            localStorage.setItem(`ecotrack_${key}`, JSON.stringify(cacheData));
            AppState.cache[key] = data;
            AppState.cache.lastUpdate = Date.now();
        } catch (error) {
            console.warn('Error setting cache:', error);
        }
    },

    getCache: (key, maxAge = 24 * 60 * 60 * 1000) => { // 24 horas por defecto
        try {
            const cached = localStorage.getItem(`ecotrack_${key}`);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;

            // Verificar versión y edad
            if (cacheData.version !== AppState.cache.version || age > maxAge) {
                localStorage.removeItem(`ecotrack_${key}`);
                return null;
            }

            return cacheData.data;
        } catch (error) {
            console.warn('Error getting cache:', error);
            return null;
        }
    },

    clearCache: () => {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('ecotrack_')) {
                    localStorage.removeItem(key);
                }
            });
            AppState.cache = {
                csvData: null,
                citizenData: null,
                lastUpdate: null,
                version: '2.0.0'
            };
            Utils.showInfo('Cache limpiado correctamente');
        } catch (error) {
            console.warn('Error clearing cache:', error);
        }
    },

    // Performance monitoring
    markPerformance: (label) => {
        AppState.performance.loadTimes[label] = performance.now() - AppState.performance.startTime;
    },

    getPerformanceReport: () => {
        const report = {
            totalTime: performance.now() - AppState.performance.startTime,
            loadTimes: AppState.performance.loadTimes,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
        
        console.table(report.loadTimes);
        return report;
    },

    // Lazy loading for images
    lazyLoadImages: () => {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    },

    // Preload critical resources
    preloadCriticalResources: () => {
        const criticalResources = [
            'assets/data/eventos_hidro.csv',
            'assets/data/hermosillo_lluvias_historicas.csv',
            'GeoJSON/ageb_hermosillo.geojson'
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = resource;
            document.head.appendChild(link);
        });
    }
};

// ==========================================================================
// Data Management
// ==========================================================================

const DataManager = {
    // Parse CSV text to array of objects
    parseCSV: (csvText) => {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = [];
            let current = '';
            let inQuotes = false;

            // Parse CSV line handling quotes and commas
            for (let j = 0; j < lines[i].length; j++) {
                const char = lines[i][j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());

            // Create object from headers and values
            const obj = {};
            headers.forEach((header, index) => {
                let value = values[index] || '';
                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                obj[header.trim()] = value;
            });
            data.push(obj);
        }

        return data;
    },

    // Convert CSV data to incident format
    convertCSVToIncidents: (csvData) => {
        return csvData.map(row => ({
            id: row.id_evento,
            fecha_evento: row.fecha_evento,
            fecha_publicacion: row.fecha_publicacion,
            titulo: row.titulo,
            direccion: row.direccion_detectada,
            colonia: row.colonia,
            lat: row.lat ? parseFloat(row.lat) : null,
            lon: row.lon ? parseFloat(row.lon) : null,
            mm_lluvia: row.mm_lluvia_reportados ? parseFloat(row.mm_lluvia_reportados) : 0,
            afectaciones: row.afectaciones_reportadas,
            gravedad: row.gravedad,
            medio: row.medio,
            autora: row.autora,
            url_noticia: row.url_noticia,
            notas: row.notas
        }));
    },

    // Load CSV data from file
    loadCSVData: async () => {
        try {
            Utils.markPerformance('csv_load_start');
            
            // Check cache first
            const cachedData = Utils.getCache('csvData');
            if (cachedData) {
                console.log('📋 Usando datos CSV desde cache');
                AppState.incidents = cachedData;
                MapManager.clearIncidents();
                cachedData.forEach(incident => MapManager.addIncidentToMap(incident));
                ChartManager.updateCharts();
                Utils.updateStatsDisplays();
                Utils.updateLegendCounts();
                Utils.markPerformance('csv_load_cached');
                return cachedData;
            }

            Utils.showNotification('Cargando datos históricos...', 'info');
            
            const response = await fetch('assets/data/eventos_hidro.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            const csvData = DataManager.parseCSV(csvText);
            const incidents = DataManager.convertCSVToIncidents(csvData);
            
            // Filter and validate incidents with coordinates
            const validIncidents = incidents.filter((inc) => {
                const valid = typeof inc.lat === 'number' && !isNaN(inc.lat) && typeof inc.lon === 'number' && !isNaN(inc.lon);
                if (!valid) {
                    console.warn('Incidente omitido por coordenadas inválidas:', inc.id, inc.titulo);
                }
                return valid;
            });

            // Cache the validated data
            Utils.setCache('csvData', validIncidents);

            // Replace existing incidents with validated CSV data
            AppState.incidents = validIncidents;

            // Update map and UI
            MapManager.clearIncidents();
            validIncidents.forEach(incident => MapManager.addIncidentToMap(incident));
            
            ChartManager.updateCharts();
            Utils.updateStatsDisplays();
            Utils.updateLegendCounts();
            
            Utils.showNotification(`${incidents.length} eventos históricos cargados correctamente`, 'success');
            console.log('CSV data loaded successfully:', incidents);
            
        } catch (error) {
            console.error('Error loading CSV data:', error);
            Utils.showNotification('Error al cargar los datos históricos', 'error');
            // Fall back to initialize with sample data
            DataManager.initializeData();
        }
    },

    // Load citizen reports with images
    loadCitizenReports: async () => {
        try {
            console.log('📸 Cargando reportes ciudadanos...');

            // Intentar cargar desde backend (Railway/Postgres)
            try {
                const response = await fetch('/api/reports?limit=500');
                if (response.ok) {
                    const reports = await response.json();
                    if (Array.isArray(reports) && reports.length > 0) {
                        // Normalizar shape para compatibilidad UI (afectaciones/descripcion)
                        reports.forEach(r => {
                            if (r && !r.afectaciones && r.descripcion) r.afectaciones = r.descripcion;
                            if (r && !r.descripcion && r.afectaciones) r.descripcion = r.afectaciones;
                        });
                        AppState.citizenReports = reports;
                        reports.forEach(report => {
                            MapManager.addCitizenReportToMap(report);
                        });
                        Utils.showNotification(`${reports.length} reportes ciudadanos cargados (BD)`, 'info');
                        console.log('📸 Reportes ciudadanos (BD):', reports);
                        return;
                    }
                }
            } catch (apiError) {
                console.warn('⚠️ No se pudo cargar /api/reports, usando fallback local:', apiError);
            }
            
            // Reporte ciudadano con imagen real
            const citizenReports = [{
                id: 'citizen-2025-10-18-basura-001',
                fecha_evento: '2025-10-18',
                titulo: 'Acumulación de basura reportada por ciudadano',
                direccion: 'Zona residencial Hermosillo',
                colonia: 'Centro',
                lat: 29.0892,  // Coordenadas de Hermosillo (se actualizarán con EXIF si están disponibles)
                lon: -110.9608,
                gravedad: 'medio',
                mm_lluvia: 0,
                tipo_evento: 'contaminacion',
                medio: 'Reporte Ciudadano - EcoTrack',
                descripcion: 'Ciudadano reporta acumulación de basura en área residencial. Detectado mediante AI.',
                imagen: 'assets/data/IMG_6701.JPG',
                url_noticia: null,
                tipo_reporte: 'ciudadano',
                detectado_ai: true,
                fecha_reporte: new Date().toISOString()
            }];

            // Agregar reportes ciudadanos a los incidentes existentes
            AppState.incidents.push(...citizenReports);

            // Mantenerlos también en AppState.citizenReports
            AppState.citizenReports = citizenReports;
            
            // Agregar marcadores al mapa para reportes ciudadanos
            citizenReports.forEach(report => {
                MapManager.addCitizenReportToMap(report);
            });
            
            Utils.showNotification(`${citizenReports.length} reportes ciudadanos cargados`, 'info');
            console.log('📸 Reportes ciudadanos cargados:', citizenReports);
            
        } catch (error) {
            console.error('❌ Error loading citizen reports:', error);
            Utils.showNotification('Error al cargar reportes ciudadanos', 'error');
        }
    },

    // Initialize with sample data (fallback)
    initializeData: () => {
        const initialIncident = {
            id: '2025-08-17-VSL',
            fecha_evento: '2025-08-17',
            titulo: 'Inundación deja 7 viviendas con pérdida total en Villas de San Lorenzo',
            direccion: 'Circuito de los Cedros #90 y #92',
            colonia: 'Villas de San Lorenzo',
            lat: 29.1516745,
            lon: -111.0054936,
            mm_lluvia: 35,
            afectaciones: '48 viviendas afectadas; 7 con pérdida total; bardas colapsadas; vehículos y mobiliario dañados.',
            gravedad: 'alto',
            url_noticia: 'https://www.elimparcial.com/son/hermosillo/2025/08/19/inundacion-en-hermosillo-deja-perdidas-totales-en-al-menos-7-viviendas-de-colonia-villas-de-san-lorenzo/'
        };
        AppState.incidents = [initialIncident];
    },

    // Add new incident
    addIncident: (incidentData) => {
        AppState.incidents.push(incidentData);
        MapManager.addIncidentToMap(incidentData);
        ChartManager.updateCharts();
        Utils.updateStatsDisplays();
        Utils.updateLegendCounts();
    },

    // Get incidents by filter
    getFilteredIncidents: (filters = {}) => {
        return AppState.incidents.filter(incident => {
            // Add filtering logic here
            return true;
        });
    }
};

// ==========================================================================
// Map Management
// ==========================================================================

const MapManager = {
    markers: [],
    agebLayer: null,
    layerControl: null,

    // Initialize map
    initialize: () => {
        AppState.map = L.map('map').setView([29.1026, -110.9773], 11);
        
        // Add multiple tile layers
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(AppState.map);

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19
        });

        // Base layers
        const baseLayers = {
            "Mapa": osmLayer,
            "Satélite": satelliteLayer
        };

        // Initialize layer control with base layers only
        MapManager.layerControl = L.control.layers(baseLayers).addTo(AppState.map);

        // Añadir efectos visuales al mapa
        AppState.map.on('click', (e) => {
            if (window.EffectsManager) {
                EffectsManager.addMapClickEffect(e.originalEvent);
            }
        });

        // Load AGEB layer
        MapManager.loadAGEBLayer();

        MapManager.setupControls();
    },

    // Clear all incident markers
    clearIncidents: () => {
        MapManager.markers.forEach(marker => {
            AppState.map.removeLayer(marker);
        });
        MapManager.markers = [];
    },

    // Setup map controls
    setupControls: () => {
        // Center map control
        document.getElementById('center-map').addEventListener('click', () => {
            AppState.map.setView([29.1026, -110.9773], 11);
            Utils.showNotification('Mapa centrado en Hermosillo');
        });

        // Toggle satellite control
        document.getElementById('toggle-satellite').addEventListener('click', (e) => {
            const osmLayer = AppState.map._layers[Object.keys(AppState.map._layers)[1]];
            const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri',
                maxZoom: 19
            });
            
            // Toggle implementation would go here
            Utils.showNotification('Vista de mapa alternada');
        });

        // Fullscreen control
        document.getElementById('fullscreen-map').addEventListener('click', () => {
            const mapContainer = document.querySelector('#mapa-interactivo .flex');
            if (!document.fullscreenElement) {
                mapContainer.requestFullscreen().then(() => {
                    Utils.showNotification('Modo pantalla completa activado');
                    setTimeout(() => AppState.map.invalidateSize(), 100);
                });
            } else {
                document.exitFullscreen().then(() => {
                    Utils.showNotification('Modo pantalla completa desactivado');
                    setTimeout(() => AppState.map.invalidateSize(), 100);
                });
            }
        });

        // Search and filter controls
        MapManager.setupSearchControls();
    },

    // Get icon by severity
    getIconBySeverity: (severity) => {
        const colors = { alto: 'red', medio: 'orange', bajo: 'yellow' };
        return L.icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${colors[severity] || 'blue'}.png`,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
    },

    // Add incident to map
    addIncidentToMap: (incident) => {
        // Defensive checks
        if (!incident || typeof incident.lat !== 'number' || typeof incident.lon !== 'number' || isNaN(incident.lat) || isNaN(incident.lon)) {
            console.warn('Intento de añadir incidente con coordenadas inválidas:', incident && incident.id);
            return null;
        }

        const marker = L.marker([incident.lat, incident.lon], {
            icon: MapManager.getIconBySeverity(incident.gravedad)
        });
        
        marker.addTo(AppState.map)
              .bindPopup(`
                  <div class="p-4 max-w-sm">
                      <h3 class="font-bold text-sm mb-2">${incident.titulo}</h3>
                      <div class="space-y-1 text-xs text-slate-600">
                          <p><i class="fas fa-map-marker-alt w-4"></i> ${incident.direccion || incident.colonia || 'Ubicación no especificada'}</p>
                          <p><i class="fas fa-calendar w-4"></i> ${Utils.formatDate(incident.fecha_evento)}</p>
                          <p><i class="fas fa-tint w-4"></i> ${incident.mm_lluvia || 0} mm</p>
                          ${incident.medio ? `<p class="truncate"><i class="fas fa-newspaper w-4"></i> Fuente: ${incident.medio}</p>` : ''}
                      </div>
                      <div class="mt-2">
                          <span class="inline-block px-2 py-1 text-xs rounded-full ${
                              incident.gravedad === 'alto' ? 'bg-red-100 text-red-800' :
                              incident.gravedad === 'medio' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                          }">
                              ${incident.gravedad.toUpperCase()}
                          </span>
                      </div>
                      ${incident.url_noticia ? `<div class="mt-2">
                          <a href="${incident.url_noticia}" target="_blank" class="text-blue-600 text-xs hover:underline">
                              <i class="fas fa-external-link-alt"></i> Ver noticia
                          </a>
                      </div>` : ''}
                  </div>
              `)
              .on('click', function(e) {
                  // Centrar el mapa suavemente en el marcador
                  const targetZoom = Math.max(AppState.map.getZoom(), 14);
                  AppState.map.flyTo([incident.lat, incident.lon], targetZoom, {
                      animate: true,
                      duration: 1
                  });
                  
                  // Mostrar detalles del incidente
                  UIManager.displayIncidentDetails(incident);
                  
                  // Abrir popup después del centrado
                  setTimeout(() => {
                      e.target.openPopup();
                  }, 500);
              })
              .on('popupopen', function(e) {
                  MapManager.centerPopup(e.target, e.popup);
              });

            // Store marker reference for cleanup
        MapManager.markers.push(marker);
    },

    // Add citizen report to map with enhanced popup
    addCitizenReportToMap: (report) => {
        // Defensive checks
        if (!report || typeof report.lat !== 'number' || typeof report.lon !== 'number' || isNaN(report.lat) || isNaN(report.lon)) {
            console.warn('Intento de añadir reporte ciudadano con coordenadas inválidas:', report && report.id);
            return null;
        }

        // Create custom icon for citizen reports
        const citizenIcon = L.divIcon({
            className: 'citizen-marker',
            html: `
                <div class="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white">
                    <i class="fas fa-camera text-xs"></i>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });

        const marker = L.marker([report.lat, report.lon], {
            icon: citizenIcon
        });
        
        marker.addTo(AppState.map)
              .bindPopup(`
                  <div class="p-4 max-w-sm">
                      <h3 class="font-bold text-sm mb-2 text-green-700">
                          <i class="fas fa-camera mr-1"></i>${report.titulo}
                      </h3>
                      ${report.imagen ? `
                          <div class="mb-3">
                              <img src="${report.imagen}" 
                                   alt="Imagen del reporte" 
                                   class="w-full h-32 object-cover rounded-lg border border-gray-200"
                                   style="cursor: pointer;"
                                   onclick="window.open('${report.imagen}', '_blank')"
                                   onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                              <div class="hidden text-gray-500 text-xs text-center p-4 border border-gray-200 rounded-lg">
                                  <i class="fas fa-image mb-1"></i><br>
                                  Imagen no disponible
                              </div>
                          </div>
                      ` : ''}
                      <div class="space-y-1 text-xs text-slate-600">
                          <p><i class="fas fa-map-marker-alt w-4 text-green-600"></i> ${report.direccion || report.colonia || 'Ubicación detectada automáticamente'}</p>
                          <p><i class="fas fa-calendar w-4 text-green-600"></i> ${Utils.formatDate(report.fecha_evento)}</p>
                          ${report.detectado_ai ? '<p><i class="fas fa-robot w-4 text-green-600"></i> Detectado con IA</p>' : ''}
                          <p><i class="fas fa-user w-4 text-green-600"></i> ${report.medio}</p>
                      </div>
                      <div class="mt-2">
                          <span class="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              <i class="fas fa-leaf mr-1"></i>REPORTE CIUDADANO
                          </span>
                      </div>
                      ${report.descripcion ? `
                          <div class="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <strong>Descripción:</strong> ${report.descripcion}
                          </div>
                      ` : ''}
                  </div>
              `, {
                  maxWidth: 280,
                  className: 'citizen-popup'
              })
              .on('click', function(e) {
                  // Centrar el mapa suavemente en el reporte ciudadano
                  const targetZoom = Math.max(AppState.map.getZoom(), 15);
                  AppState.map.flyTo([report.lat, report.lon], targetZoom, {
                      animate: true,
                      duration: 1
                  });
                  
                  // Mostrar detalles del reporte
                  UIManager.displayIncidentDetails(report);
                  
                  // Abrir popup después del centrado
                  setTimeout(() => {
                      e.target.openPopup();
                  }, 500);
              })
              .on('popupopen', function(e) {
                  MapManager.centerPopup(e.target, e.popup);
              });

        // Store marker reference for cleanup
        MapManager.markers.push(marker);
        
        console.log('📸 Reporte ciudadano agregado al mapa:', report.id);
    },

    // Load AGEB Urbanas layer
    loadAGEBLayer: async () => {
        try {
            console.log('🗺️ Cargando capa AGEB Urbanas...');
            
            const response = await fetch('GeoJSON/AGEB-Urbanas.geojson');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const agebData = await response.json();
            
            // Create AGEB layer with styling
            MapManager.agebLayer = L.geoJSON(agebData, {
                style: () => ({
                    fillColor: '#3b82f6',
                    weight: 1,
                    opacity: 0.8,
                    color: '#1e40af',
                    fillOpacity: 0.1
                }),
                onEachFeature: (feature, layer) => {
                    if (feature.properties) {
                        const props = feature.properties;
                        layer.bindPopup(`
                            <div class="p-3 max-w-xs">
                                <h4 class="font-bold text-sm mb-2 gradient-text">AGEB Urbano</h4>
                                <div class="space-y-1 text-xs">
                                    <p><strong>CVE_AGEB:</strong> ${props.CVE_AGEB || 'N/A'}</p>
                                    <p><strong>Código Geo:</strong> ${props.CVEGEO || 'N/A'}</p>
                                    <p><strong>Municipio:</strong> ${props.CVE_MUN === '030' ? 'Hermosillo' : props.CVE_MUN}</p>
                                    <p><strong>Estado:</strong> ${props.CVE_ENT === '26' ? 'Sonora' : props.CVE_ENT}</p>
                                </div>
                            </div>
                        `);
                        
                        // Highlight on hover
                        layer.on({
                            mouseover: (e) => {
                                const layer = e.target;
                                layer.setStyle({
                                    weight: 2,
                                    color: '#0ea5e9',
                                    fillOpacity: 0.3
                                });
                            },
                            mouseout: (e) => {
                                MapManager.agebLayer.resetStyle(e.target);
                            }
                        });
                    }
                }
            });

            // Add to layer control as overlay (optional layer)
            MapManager.layerControl.addOverlay(MapManager.agebLayer, '🏙️ AGEB Urbanos');
            
            console.log('✅ Capa AGEB Urbanas cargada exitosamente');
            Utils.showNotification('Capa AGEB Urbanos disponible en el control de capas', 'success');
            
        } catch (error) {
            console.error('Error loading AGEB layer:', error);
            Utils.showNotification('Error al cargar la capa AGEB Urbanos', 'error');
        }
    },

    // Center popup in view when opened - VERSIÓN MEJORADA
    centerPopup: (marker, popup) => {
        setTimeout(() => {
            if (!popup || !popup._container || !marker) return;

            const popupElement = popup._container;
            const mapContainer = AppState.map.getContainer();
            
            // Obtener las posiciones actuales
            const popupRect = popupElement.getBoundingClientRect();
            const mapRect = mapContainer.getBoundingClientRect();
            
            // Calcular el centro del popup
            const popupCenterX = popupRect.left + popupRect.width / 2;
            const popupCenterY = popupRect.top + popupRect.height / 2;
            
            // Calcular el centro ideal del mapa (considerando que el popup debe estar visible)
            const mapCenterX = mapRect.left + mapRect.width / 2;
            const mapCenterY = mapRect.top + mapRect.height / 2;
            
            // Verificar si el popup está fuera de los límites del mapa
            const isOutOfBounds = (
                popupRect.left < mapRect.left ||
                popupRect.right > mapRect.right ||
                popupRect.top < mapRect.top ||
                popupRect.bottom > mapRect.bottom
            );
            
            if (isOutOfBounds) {
                // Obtener la posición del marcador
                const markerLatLng = marker.getLatLng();
                
                // Calcular offset necesario para centrar el popup
                let offsetX = 0;
                let offsetY = 0;
                
                // Ajustar horizontalmente
                if (popupRect.right > mapRect.right) {
                    offsetX = -(popupRect.right - mapRect.right + 20);
                } else if (popupRect.left < mapRect.left) {
                    offsetX = mapRect.left - popupRect.left + 20;
                }
                
                // Ajustar verticalmente (más importante para popups)
                if (popupRect.bottom > mapRect.bottom) {
                    offsetY = -(popupRect.bottom - mapRect.bottom + 20);
                } else if (popupRect.top < mapRect.top) {
                    offsetY = mapRect.top - popupRect.top + 20;
                }
                
                // Convertir offset de píxeles a coordenadas geográficas
                const zoom = AppState.map.getZoom();
                const pixelsPerDegree = 256 * Math.pow(2, zoom) / 360;
                
                const latOffset = offsetY / pixelsPerDegree;
                const lngOffset = offsetX / (pixelsPerDegree * Math.cos(markerLatLng.lat * Math.PI / 180));
                
                // Calcular nueva posición
                const newLat = markerLatLng.lat + latOffset;
                const newLng = markerLatLng.lng + lngOffset;
                
                // Hacer el pan suave al marcador con el offset calculado
                AppState.map.panTo([newLat, newLng], {
                    animate: true,
                    duration: 0.5,
                    easeLinearity: 0.5
                });
                
                console.log(`📍 Auto-centrado: Popup estaba fuera de límites, ajustando posición`);
            }
        }, 200); // Aumentar delay para asegurar que el popup esté completamente renderizado
    },

    // Setup search and filter controls
    setupSearchControls: () => {
        const toggleSearchBtn = document.getElementById('toggle-search');
        const mobileSearchBtn = document.getElementById('mobile-search');
        const searchPanel = document.getElementById('search-panel');
        const closeSearchBtn = document.getElementById('close-search');
        const searchInput = document.getElementById('search-input');
        const filterChips = document.querySelectorAll('.filter-chip');
        const dateFromInput = document.getElementById('date-from');
        const dateToInput = document.getElementById('date-to');

        // Toggle search panel
        const toggleSearch = () => {
            searchPanel.classList.toggle('hidden');
            if (!searchPanel.classList.contains('hidden')) {
                searchInput.focus();
            }
        };

        if (toggleSearchBtn) {
            toggleSearchBtn.addEventListener('click', toggleSearch);
        }
        
        if (mobileSearchBtn) {
            mobileSearchBtn.addEventListener('click', toggleSearch);
        }

        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', () => {
                searchPanel.classList.add('hidden');
            });
        }

        // Search functionality
        const performSearch = Utils.debounce(() => {
            const query = searchInput.value.toLowerCase();
            const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
            const dateFrom = dateFromInput.value;
            const dateTo = dateToInput.value;

            MapManager.filterAndSearchIncidents(query, activeFilter, dateFrom, dateTo);
        }, 300);

        if (searchInput) {
            searchInput.addEventListener('input', performSearch);
        }

        // Filter chips
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                // Remove active class from all chips
                filterChips.forEach(c => c.classList.remove('active'));
                // Add active class to clicked chip
                chip.classList.add('active');
                // Perform search
                performSearch();
            });
        });

        // Date filters
        if (dateFromInput) {
            dateFromInput.addEventListener('change', performSearch);
        }
        if (dateToInput) {
            dateToInput.addEventListener('change', performSearch);
        }

        // Set default date range (last 6 months)
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        
        if (dateFromInput) {
            dateFromInput.value = sixMonthsAgo.toISOString().split('T')[0];
        }
        if (dateToInput) {
            dateToInput.value = today.toISOString().split('T')[0];
        }
    },

    // Filter and search incidents
    filterAndSearchIncidents: (query, filter, dateFrom, dateTo) => {
        let filteredIncidents = [...AppState.incidents];
        let filteredReports = [...AppState.citizenReports];

        // Text search
        if (query) {
            filteredIncidents = filteredIncidents.filter(incident => 
                incident.titulo?.toLowerCase().includes(query) ||
                incident.descripcion?.toLowerCase().includes(query) ||
                incident.direccion?.toLowerCase().includes(query) ||
                incident.colonia?.toLowerCase().includes(query) ||
                incident.tipo?.toLowerCase().includes(query)
            );

            filteredReports = filteredReports.filter(report => 
                report.titulo?.toLowerCase().includes(query) ||
                report.descripcion?.toLowerCase().includes(query) ||
                report.direccion?.toLowerCase().includes(query) ||
                report.colonia?.toLowerCase().includes(query)
            );
        }

        // Category filter
        if (filter !== 'all') {
            if (filter === 'ciudadano') {
                filteredIncidents = [];
            } else {
                filteredIncidents = filteredIncidents.filter(incident => 
                    incident.gravedad === filter
                );
                filteredReports = [];
            }
        }

        // Date filter
        if (dateFrom || dateTo) {
            const fromDate = dateFrom ? new Date(dateFrom) : new Date('1900-01-01');
            const toDate = dateTo ? new Date(dateTo) : new Date();

            filteredIncidents = filteredIncidents.filter(incident => {
                const incidentDate = new Date(incident.fecha_evento);
                return incidentDate >= fromDate && incidentDate <= toDate;
            });

            filteredReports = filteredReports.filter(report => {
                const reportDate = new Date(report.fecha_evento);
                return reportDate >= fromDate && reportDate <= toDate;
            });
        }

        // Update map
        MapManager.clearIncidents();
        
        filteredIncidents.forEach(incident => {
            MapManager.addIncidentToMap(incident);
        });

        filteredReports.forEach(report => {
            MapManager.addCitizenReportToMap(report);
        });

        // Update results counter
        const resultsElement = document.getElementById('search-results');
        const totalResults = filteredIncidents.length + filteredReports.length;
        const totalOriginal = AppState.incidents.length + AppState.citizenReports.length;

        if (resultsElement) {
            if (totalResults === totalOriginal) {
                resultsElement.textContent = 'Mostrando todos los eventos';
            } else {
                resultsElement.innerHTML = `Mostrando <span class="search-highlight">${totalResults}</span> de ${totalOriginal} eventos`;
            }
        }

        // Show notification if no results
        if (totalResults === 0 && (query || filter !== 'all' || dateFrom || dateTo)) {
            Utils.showWarning('No se encontraron eventos con los criterios especificados');
        }
    },
};

// ==========================================================================
// Chart Management
// ==========================================================================

const ChartManager = {
    // Update all charts
    updateCharts: () => {
        ChartManager.updateSeverityChart();
        ChartManager.updateColoniaChart();
        ChartManager.updateTemporalChart();
        ChartManager.updateInsights();
    },

    // Update severity chart
    updateSeverityChart: () => {
        const severityCounts = AppState.incidents.reduce((acc, {gravedad}) => {
            acc[gravedad] = (acc[gravedad] || 0) + 1;
            return acc;
        }, {});
        
        const allSeverities = ['bajo', 'medio', 'alto'];
        const orderedCounts = allSeverities.map(s => severityCounts[s] || 0);
        const labels = allSeverities.map(s => ({ bajo: 'Bajo', medio: 'Medio', alto: 'Alto' }[s]));

        if (AppState.charts.severity) AppState.charts.severity.destroy();
        
        const ctx = document.getElementById('severityChart');
        if (!ctx) return;

        AppState.charts.severity = new Chart(ctx, {
            type: 'doughnut',
            data: { 
                labels: labels, 
                datasets: [{ 
                    data: orderedCounts, 
                    backgroundColor: [
                        'rgba(234, 179, 8, 0.8)',   // Yellow for Bajo
                        'rgba(249, 115, 22, 0.8)',  // Orange for Medio  
                        'rgba(239, 68, 68, 0.8)'    // Red for Alto
                    ],
                    borderColor: [
                        '#eab308', '#f97316', '#ef4444'
                    ],
                    borderWidth: 2,
                    hoverOffset: 8
                }] 
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // Update colonia chart
    updateColoniaChart: () => {
        const coloniaCounts = AppState.incidents.reduce((acc, { colonia }) => {
            const key = (colonia || "Desconocida").trim() || "Desconocida";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        // Sort by count and take top 8
        const sortedColonias = Object.entries(coloniaCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8);

        if (AppState.charts.colonia) AppState.charts.colonia.destroy();
        
        const ctx = document.getElementById('coloniaChart');
        if (!ctx) return;

        AppState.charts.colonia = new Chart(ctx, {
            type: 'bar',
            data: { 
                labels: sortedColonias.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name), 
                datasets: [{ 
                    data: sortedColonias.map(([, count]) => count),
                    backgroundColor: [
                        '#0891b2', '#059669', '#f59e0b', '#6d28d9', 
                        '#ef4444', '#ec4899', '#7e22ce', '#db2777'
                    ].slice(0, sortedColonias.length),
                    borderRadius: 6,
                    borderSkipped: false
                }] 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return sortedColonias[context[0].dataIndex][0]; // Full name
                            }
                        }
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        grid: { color: '#f1f5f9' },
                        ticks: { color: '#64748b' }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { 
                            color: '#64748b',
                            maxRotation: 45
                        }
                    }
                }
            }
        });
    },

    // Update temporal chart
    updateTemporalChart: () => {
        const timePeriodSelect = document.getElementById('time-period');
        const timePeriod = timePeriodSelect ? parseInt(timePeriodSelect.value) : 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timePeriod);

        const filteredIncidents = AppState.incidents.filter(incident => 
            new Date(incident.fecha_evento) >= cutoffDate
        );

        const dailyCounts = {};
        filteredIncidents.forEach(incident => {
            const date = incident.fecha_evento;
            dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });

        // Generate all dates in range
        const dateLabels = [];
        const counts = [];
        for (let d = new Date(cutoffDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dateLabels.push(dateStr);
            counts.push(dailyCounts[dateStr] || 0);
        }

        if (AppState.charts.temporal) AppState.charts.temporal.destroy();
        
        const ctx = document.getElementById('temporalChart');
        if (!ctx) return;

        AppState.charts.temporal = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dateLabels.map(date => new Date(date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })),
                datasets: [{
                    label: 'Reportes por día',
                    data: counts,
                    borderColor: '#0891b2',
                    backgroundColor: 'rgba(8, 145, 178, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#0891b2',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: { color: '#64748b' }
                    },
                    x: {
                        grid: { color: '#f1f5f9' },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    },

    // Update insights
    updateInsights: () => {
        // Peak hour analysis
        const hours = AppState.incidents.map(i => new Date(i.fecha_evento).getHours());
        const hourCounts = hours.reduce((acc, hour) => {
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});
        const peakHour = Object.entries(hourCounts).reduce((a, b) => hourCounts[a[0]] > hourCounts[b[0]] ? a : b)?.[0] || '--';
        
        // Most affected colonia
        const coloniaCounts = AppState.incidents.reduce((acc, i) => {
            const colonia = i.colonia || 'Desconocida';
            acc[colonia] = (acc[colonia] || 0) + 1;
            return acc;
        }, {});
        const mostAffected = Object.entries(coloniaCounts).reduce((a, b) => a[1] > b[1] ? a : b)?.[0] || '--';
        
        // Trend analysis
        const recentCount = AppState.incidents.filter(i => {
            const date = new Date(i.fecha_evento);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date >= weekAgo;
        }).length;
        
        const olderCount = AppState.incidents.filter(i => {
            const date = new Date(i.fecha_evento);
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date >= twoWeeksAgo && date < weekAgo;
        }).length;
        
        const trend = recentCount > olderCount ? '↗️ Creciente' : 
                     recentCount < olderCount ? '↘️ Decreciente' : '➡️ Estable';

        const peakHourEl = document.getElementById('insight-peak-hour');
        const mostAffectedEl = document.getElementById('insight-most-affected');
        const trendEl = document.getElementById('insight-trend');

        if (peakHourEl) peakHourEl.textContent = peakHour !== '--' ? `${peakHour}:00` : '--';
        if (mostAffectedEl) mostAffectedEl.textContent = mostAffected.length > 15 ? mostAffected.substring(0, 15) + '...' : mostAffected;
        if (trendEl) trendEl.textContent = trend;
    }
};

// ==========================================================================
// Mobile Interface Manager
// ==========================================================================

const MobileManager = {
    // Initialize mobile interactions
    init() {
        this.setupBottomNavigation();
        this.setupMobilePanel();
        this.setupMobileControls();
        this.setupTouchInteractions();
    },

    // Setup bottom navigation
    setupBottomNavigation() {
        const navItems = {
            'mobile-nav-map': () => this.navigateToSection('mapas'),
            'mobile-nav-stats': () => this.navigateToSection('estadisticas'),
            'mobile-nav-add': () => this.showAddReportModal(),
            'mobile-nav-layers': () => this.toggleLayersPanel(),
            'mobile-nav-historico': () => this.navigateToSection('historico')
        };

        Object.entries(navItems).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
            }
        });
    },

    // Setup mobile sliding panel
    setupMobilePanel() {
        const overlay = document.getElementById('mobile-info-overlay');
        const panel = document.getElementById('mobile-info-panel');
        const closeBtn = document.getElementById('close-mobile-panel');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideMobilePanel());
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.hideMobilePanel());
        }

        // Add swipe down to close functionality
        if (panel) {
            let startY = 0;
            let currentY = 0;
            let isDragging = false;

            panel.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                isDragging = true;
            });

            panel.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                currentY = e.touches[0].clientY;
                const deltaY = currentY - startY;

                if (deltaY > 0) {
                    panel.style.transform = `translateY(${Math.min(deltaY, 100)}px)`;
                }
            });

            panel.addEventListener('touchend', () => {
                if (!isDragging) return;
                isDragging = false;

                const deltaY = currentY - startY;
                if (deltaY > 100) {
                    this.hideMobilePanel();
                } else {
                    panel.style.transform = 'translateY(0)';
                }
            });
        }
    },

    // Setup mobile controls
    setupMobileControls() {
        // Mobile action buttons
        const mobileAddBtn = document.getElementById('mobile-add-report-btn');
        const mobileExportBtn = document.getElementById('mobile-export-btn');
        const mobileShareBtn = document.getElementById('mobile-share-btn');

        if (mobileAddBtn) {
            mobileAddBtn.addEventListener('click', () => this.showAddReportModal());
        }

        if (mobileExportBtn) {
            mobileExportBtn.addEventListener('click', () => DataManager.exportData());
        }

        if (mobileShareBtn) {
            mobileShareBtn.addEventListener('click', () => this.shareMap());
        }
    },

    // Setup touch interactions
    setupTouchInteractions() {
        // Add touch-friendly hover states
        const touchElements = document.querySelectorAll('.mobile-nav-item, .mobile-nav-item-special');
        
        touchElements.forEach(element => {
            element.addEventListener('touchstart', () => {
                element.classList.add('touch-active');
            });
            
            element.addEventListener('touchend', () => {
                setTimeout(() => {
                    element.classList.remove('touch-active');
                }, 150);
            });
        });
    },

    // Navigate to section
    navigateToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            
            let navItemId = 'mobile-nav-map'; // default
            if (sectionId === 'estadisticas') navItemId = 'mobile-nav-stats';
            else if (sectionId === 'historico') navItemId = 'mobile-nav-historico';
            else if (sectionId === 'mapas') navItemId = 'mobile-nav-map';
            
            this.updateActiveNavItem(navItemId);
        }
    },

    // Update active navigation item
    updateActiveNavItem(activeId) {
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('mobile-nav-active');
        });
        
        const activeItem = document.getElementById(activeId);
        if (activeItem) {
            activeItem.classList.add('mobile-nav-active');
        }
    },

    // Show mobile info panel
    showMobilePanel(content = null) {
        const overlay = document.getElementById('mobile-info-overlay');
        const panel = document.getElementById('mobile-info-panel');
        const contentContainer = document.getElementById('mobile-panel-content');

        if (content && contentContainer) {
            contentContainer.innerHTML = content;
        }

        if (overlay && panel) {
            overlay.classList.remove('hidden');
            setTimeout(() => {
                overlay.classList.add('opacity-100');
                panel.classList.remove('translate-y-full');
            }, 10);
        }
    },

    // Hide mobile info panel
    hideMobilePanel() {
        const overlay = document.getElementById('mobile-info-overlay');
        const panel = document.getElementById('mobile-info-panel');

        if (overlay && panel) {
            overlay.classList.remove('opacity-100');
            panel.classList.add('translate-y-full');
            
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 300);
        }
    },

    // Show add report modal
    showAddReportModal() {
        // This will integrate with existing modal functionality
        const addBtn = document.getElementById('add-report-btn');
        if (addBtn) {
            addBtn.click();
        }
    },

    // Toggle layers panel
    toggleLayersPanel() {
        const layersControl = document.querySelector('.leaflet-control-layers');
        if (layersControl) {
            layersControl.click();
        }
    },

    // Show info panel
    showInfoPanel() {
        // Show current map info or help
        const infoContent = `
            <div class="space-y-4">
                <div class="text-center">
                    <i class="fas fa-map-marked-alt text-4xl text-cyan-500 mb-4"></i>
                    <h3 class="text-lg font-semibold mb-2">EcoTrack Hermosillo</h3>
                    <p class="text-gray-600 text-sm">Plataforma de monitoreo ambiental integral</p>
                </div>
                
                <div class="border-t pt-4">
                    <h4 class="font-medium mb-2">Cómo usar:</h4>
                    <ul class="text-sm text-gray-600 space-y-1">
                        <li>• Navega el mapa para ver eventos reportados</li>
                        <li>• Toca los marcadores para ver detalles</li>
                        <li>• Usa el botón + para reportar nuevos eventos</li>
                        <li>• Cambia entre capas del mapa</li>
                    </ul>
                </div>
                
                <div class="border-t pt-4">
                    <p class="text-xs text-gray-500">
                        Total de eventos: ${AppState.incidents.length}<br>
                        Última actualización: ${new Date().toLocaleString('es-MX')}
                    </p>
                </div>
            </div>
        `;
        
        this.showMobilePanel(infoContent);
    },

    // Share map functionality
    shareMap() {
        if (navigator.share) {
            navigator.share({
                title: 'EcoTrack Hermosillo',
                text: 'Plataforma de monitoreo ambiental integral para Hermosillo',
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('Enlace copiado al portapapeles');
            });
        }
    }
};

// ==========================================================================
// Audio Feedback Manager
// ==========================================================================

const AudioManager = {
    isEnabled: true,
    volume: 0.3,
    
    init() {
        this.loadSettings();
        this.createAudioContext();
        this.createAudioToggle();
        this.bindAudioEvents();
    },
    
    loadSettings() {
        const enabled = localStorage.getItem('ecotrack-audio-enabled');
        const volume = localStorage.getItem('ecotrack-audio-volume');
        
        if (enabled !== null) {
            this.isEnabled = enabled === 'true';
        }
        if (volume !== null) {
            this.volume = parseFloat(volume);
        }
    },
    
    saveSettings() {
        localStorage.setItem('ecotrack-audio-enabled', this.isEnabled.toString());
        localStorage.setItem('ecotrack-audio-volume', this.volume.toString());
    },
    
    createAudioContext() {
        this.audioContext = null;
        // Initialize audio context on first user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    },
    
    createAudioToggle() {
        const toggle = document.createElement('div');
        toggle.className = 'audio-toggle';
        toggle.innerHTML = this.isEnabled ? 
            '<i class="fas fa-volume-up"></i>' : 
            '<i class="fas fa-volume-mute"></i>';
        toggle.addEventListener('click', () => this.toggleAudio());
        
        // Add styles
        toggle.style.cssText = `
            position: fixed;
            top: 20px;
            right: 140px;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: var(--primary-color);
            transition: all 0.3s ease;
            z-index: 1000;
        `;
        
        document.body.appendChild(toggle);
    },
    
    toggleAudio() {
        this.isEnabled = !this.isEnabled;
        this.saveSettings();
        
        const toggle = document.querySelector('.audio-toggle');
        if (toggle) {
            toggle.innerHTML = this.isEnabled ? 
                '<i class="fas fa-volume-up"></i>' : 
                '<i class="fas fa-volume-mute"></i>';
        }
        
        // Play feedback sound
        if (this.isEnabled) {
            this.playSound('toggle');
        }
        
        if (window.EffectsManager) {
            EffectsManager.enhancedShowToast(
                `Audio ${this.isEnabled ? 'activado' : 'desactivado'}`,
                'info',
                2000
            );
        }
    },
    
    bindAudioEvents() {
        // Button clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('button, .btn, .btn-primary, .btn-secondary')) {
                this.playSound('click');
            }
        });
        
        // Search interactions
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="search"], input[type="text"]')) {
                this.playSound('type', 0.1);
            }
        });
        
        // Map marker clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.leaflet-marker-icon')) {
                this.playSound('marker');
            }
        });
        
        // Filter chip clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('.filter-chip')) {
                this.playSound('filter');
            }
        });
        
        // Hover effects for important elements
        document.addEventListener('mouseenter', (e) => {
            if (e.target.matches('.stat-card, .glass-card')) {
                this.playSound('hover', 0.1);
            }
        });
    },
    
    playSound(type, customVolume = null) {
        if (!this.isEnabled || !this.audioContext) return;
        
        const volume = customVolume !== null ? customVolume : this.volume;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Sound configurations
            const sounds = {
                click: { freq: 800, duration: 0.1, type: 'sine' },
                hover: { freq: 600, duration: 0.05, type: 'sine' },
                toggle: { freq: 1000, duration: 0.15, type: 'triangle' },
                marker: { freq: 1200, duration: 0.2, type: 'sine' },
                filter: { freq: 900, duration: 0.12, type: 'square' },
                type: { freq: 700, duration: 0.03, type: 'sine' },
                success: { freq: 523.25, duration: 0.3, type: 'sine' }, // C5
                error: { freq: 329.63, duration: 0.4, type: 'sawtooth' }, // E4
                notification: { freq: 659.25, duration: 0.25, type: 'triangle' } // E5
            };
            
            const sound = sounds[type] || sounds.click;
            
            oscillator.frequency.setValueAtTime(sound.freq, this.audioContext.currentTime);
            oscillator.type = sound.type;
            
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + sound.duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + sound.duration);
            
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    },
    
    // Play success sound for notifications
    playNotificationSound(type = 'notification') {
        this.playSound(type);
    }
};

// ==========================================================================
// Intelligent Dark Mode Manager
// ==========================================================================

const DarkModeManager = {
    currentMode: 'auto', // 'auto', 'light', 'dark'
    
    init() {
        this.createToggleButton();
        this.createAutoModeIndicator();
        this.loadSavedMode();
        this.setupAutoMode();
        this.applyInitialMode();
    },
    
    createToggleButton() {
        const toggle = document.createElement('div');
        toggle.className = 'dark-mode-toggle';
        toggle.innerHTML = '<i class="fas fa-moon"></i>';
        toggle.addEventListener('click', () => this.toggleMode());
        document.body.appendChild(toggle);
    },
    
    createAutoModeIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'auto-mode-indicator';
        indicator.id = 'auto-mode-indicator';
        indicator.innerHTML = '<i class="fas fa-magic"></i> Modo Automático';
        document.body.appendChild(indicator);
    },
    
    loadSavedMode() {
        const saved = localStorage.getItem('ecotrack-theme-mode');
        if (saved && ['auto', 'light', 'dark'].includes(saved)) {
            this.currentMode = saved;
        }
    },
    
    saveMode() {
        localStorage.setItem('ecotrack-theme-mode', this.currentMode);
    },
    
    setupAutoMode() {
        // Check time every minute
        setInterval(() => {
            if (this.currentMode === 'auto') {
                this.applyAutoMode();
            }
        }, 60000);
    },
    
    applyInitialMode() {
        switch (this.currentMode) {
            case 'auto':
                this.applyAutoMode();
                break;
            case 'dark':
                this.enableDarkMode();
                break;
            case 'light':
                this.enableLightMode();
                break;
        }
        this.updateToggleIcon();
        this.updateIndicator();
    },
    
    applyAutoMode() {
        const hour = new Date().getHours();
        const isDarkTime = hour < 7 || hour >= 19; // Dark mode from 7 PM to 7 AM
        
        if (isDarkTime) {
            this.enableDarkMode();
        } else {
            this.enableLightMode();
        }
    },
    
    enableDarkMode() {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
        
        // Update particles for dark mode
        const particles = document.querySelectorAll('.particle');
        particles.forEach(particle => {
            particle.classList.add('dark-mode');
        });
    },
    
    enableLightMode() {
        document.documentElement.classList.remove('dark-mode');
        document.body.classList.remove('dark-mode');
        
        // Update particles for light mode
        const particles = document.querySelectorAll('.particle');
        particles.forEach(particle => {
            particle.classList.remove('dark-mode');
        });
    },
    
    toggleMode() {
        const modes = ['auto', 'light', 'dark'];
        const currentIndex = modes.indexOf(this.currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.currentMode = modes[nextIndex];
        
        this.applyInitialMode();
        this.saveMode();
        
        // Show notification
        const modeNames = {
            'auto': 'Automático',
            'light': 'Claro',
            'dark': 'Oscuro'
        };
        
        if (window.EffectsManager) {
            EffectsManager.enhancedShowToast(
                `Modo ${modeNames[this.currentMode]} activado`,
                'info',
                2000
            );
        }
    },
    
    updateToggleIcon() {
        const toggle = document.querySelector('.dark-mode-toggle');
        if (!toggle) return;
        
        const icons = {
            'auto': 'fas fa-magic',
            'light': 'fas fa-sun',
            'dark': 'fas fa-moon'
        };
        
        toggle.innerHTML = `<i class="${icons[this.currentMode]}"></i>`;
    },
    
    updateIndicator() {
        const indicator = document.getElementById('auto-mode-indicator');
        if (!indicator) return;
        
        if (this.currentMode === 'auto') {
            const hour = new Date().getHours();
            const timeStatus = hour < 7 || hour >= 19 ? 'Noche' : 'Día';
            indicator.innerHTML = `<i class="fas fa-magic"></i> Auto: ${timeStatus}`;
            indicator.classList.add('show');
        } else {
            indicator.classList.remove('show');
        }
    },
    
    // Get current theme for other components
    getCurrentTheme() {
        if (this.currentMode === 'auto') {
            const hour = new Date().getHours();
            return hour < 7 || hour >= 19 ? 'dark' : 'light';
        }
        return this.currentMode;
    }
};

// ==========================================================================
// Advanced Visual Effects Manager
// ==========================================================================

const EffectsManager = {
    // Inicializar efectos visuales avanzados al cargar la página
    init() {
        this.createParticleSystem();
        this.createDynamicBackground();
        this.initEnhancedAnimations();
        this.createPageLoader();
        this.enhanceToastNotifications();
    },

    // Sistema de partículas flotantes
    createParticleSystem() {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles-container';
        document.body.appendChild(particlesContainer);

        const createParticle = () => {
            const particle = document.createElement('div');
            const types = ['type-1', 'type-2', 'type-3'];
            const randomType = types[Math.floor(Math.random() * types.length)];
            
            particle.className = `particle ${randomType}`;
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 6 + 's';
            particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
            
            particlesContainer.appendChild(particle);
            
            // Remover partícula después de la animación
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 8000);
        };

        // Crear partículas periódicamente
        setInterval(createParticle, 800);
        
        // Crear algunas partículas iniciales
        for (let i = 0; i < 5; i++) {
            setTimeout(createParticle, i * 200);
        }
    },

    // Fondo dinámico con gradientes animados
    createDynamicBackground() {
        const dynamicBg = document.createElement('div');
        dynamicBg.className = 'dynamic-background';
        document.body.insertBefore(dynamicBg, document.body.firstChild);
    },

    // Animaciones mejoradas para elementos existentes
    initEnhancedAnimations() {
        // Añadir efectos a las tarjetas de estadísticas
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('floating');
                if (index % 2 === 0) {
                    card.classList.add('shimmer');
                }
            }, index * 200);
        });

        // Añadir efectos al logo
        const logo = document.querySelector('.logo');
        if (logo) {
            logo.classList.add('pulse-green');
        }

        // Añadir efectos a los botones principales
        const primaryBtns = document.querySelectorAll('.btn-primary');
        primaryBtns.forEach(btn => {
            btn.classList.add('ripple');
            btn.addEventListener('mouseenter', () => {
                btn.classList.add('glow-green');
            });
            btn.addEventListener('mouseleave', () => {
                btn.classList.remove('glow-green');
            });
        });

        // Animación de entrada para las tarjetas
        this.initScrollAnimations();
    },

    // Animaciones al hacer scroll
    initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observar elementos para animación de entrada
        const animatedElements = document.querySelectorAll('.glass-card, .stat-card');
        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    },

    // Loader de página mejorado
    createPageLoader() {
        const loader = document.createElement('div');
        loader.className = 'page-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-logo">
                    <i class="fas fa-leaf" style="font-size: 40px; color: white;"></i>
                </div>
                <div class="loading-spinner"></div>
                <p style="margin-top: 20px; font-size: 18px; font-weight: 600;">Cargando EcoTrack...</p>
            </div>
        `;
        
        document.body.appendChild(loader);
        
        // Remover loader después de que todo haya cargado
        window.addEventListener('load', () => {
            setTimeout(() => {
                loader.classList.add('fade-out');
                setTimeout(() => {
                    if (loader.parentNode) {
                        loader.parentNode.removeChild(loader);
                    }
                }, 500);
            }, 1000);
        });
    },

    // Mejorar las notificaciones toast existentes
    enhanceToastNotifications() {
        // Reemplazar función showToast global
        window.showToast = this.enhancedShowToast;
    },

    enhancedShowToast(message, type = 'info', duration = 4000) {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="${icons[type]}" style="font-size: 20px; color: var(--primary-color);"></i>
                <span style="flex: 1; font-weight: 500;">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 20px; cursor: pointer; opacity: 0.6;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toast);
        
        // Play notification sound
        if (window.AudioManager) {
            const soundType = type === 'success' ? 'success' : 
                             type === 'error' ? 'error' : 'notification';
            AudioManager.playNotificationSound(soundType);
        }
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 400);
            }
        }, duration);
    },

    // Efecto de ondas al hacer clic en el mapa
    addMapClickEffect(e) {
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(16, 185, 129, 0.3)';
        ripple.style.transform = 'translate(-50%, -50%)';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '1000';
        
        const mapContainer = document.getElementById('map');
        const rect = mapContainer.getBoundingClientRect();
        
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        ripple.style.width = '0px';
        ripple.style.height = '0px';
        
        mapContainer.appendChild(ripple);
        
        // Animar el ripple
        ripple.animate([
            { width: '0px', height: '0px', opacity: 1 },
            { width: '100px', height: '100px', opacity: 0 }
        ], {
            duration: 600,
            easing: 'ease-out'
        }).addEventListener('finish', () => {
            ripple.remove();
        });
    }
};

// Inicializar efectos al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    AudioManager.init();
    DarkModeManager.init();
    EffectsManager.init();
    // InteractionManager.init(); // Desactivado
    
    // ELIMINAR WIDGETS FORZADAMENTE
    setTimeout(() => {
        removeAllWidgets();
    }, 500);
    
    // Widgets completamente desactivados
    // setTimeout(() => {
    //     WidgetManager.init();
    // }, 1000);
});

// Función para eliminar widgets forzadamente
function removeAllWidgets() {
    // Eliminar contenedores de widgets
    const widgetContainers = document.querySelectorAll('.floating-widgets, .widget-toggle, .widget, .gesture-indicator');
    widgetContainers.forEach(element => {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    
    // Eliminar cualquier elemento con ID de widget
    const widgetIds = ['weather-widget', 'env-widget', 'activity-widget', 'performance-widget'];
    widgetIds.forEach(id => {
        const element = document.getElementById(id);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    
        // Función para limpiar código en producción
        function cleanupForProduction() {
            // Remover console.logs en producción
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                console.log = function() {};
                console.warn = function() {};
                console.info = function() {};
            }
        }
        
        cleanupForProduction();
        
        // Registrar Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                        // Registro exitoso solo en desarrollo
                        if (window.location.hostname === 'localhost') {
                            console.log('ServiceWorker registrado exitosamente:', registration.scope);
                        }
                    })
                    .catch(function(err) {
                        if (window.location.hostname === 'localhost') {
                            console.log('ServiceWorker registro falló:', err);
                        }
                    });
            });
        }
}

// Observer para eliminar widgets si aparecen
const widgetObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Solo elementos
                if (node.classList && (
                    node.classList.contains('floating-widgets') ||
                    node.classList.contains('widget-toggle') ||
                    node.classList.contains('widget') ||
                    node.classList.contains('gesture-indicator')
                )) {
                    console.log('🚫 Widget detectado y eliminado:', node.className);
                    if (node.parentNode) {
                        node.parentNode.removeChild(node);
                    }
                }
            }
        });
    });
});

// Iniciar el observer
widgetObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// Eliminar widgets cada 2 segundos como medida de seguridad
setInterval(() => {
    removeAllWidgets();
}, 2000);

// Export for use in other files
window.AppState = AppState;
window.Utils = Utils;
window.DataManager = DataManager;
window.MapManager = MapManager;
window.ChartManager = ChartManager;
window.MobileManager = MobileManager;
window.EffectsManager = EffectsManager;
window.DarkModeManager = DarkModeManager;
window.AudioManager = AudioManager;

// Dynamic Widgets System - COMPLETAMENTE DESACTIVADO
/*
const WidgetManager = (function() {
    let widgets = [];
    let widgetsContainer = null;
    let updateInterval = null;
    let weatherData = null;
    let environmentalData = null;

    function init() {
        createToggleButton();
        createWidgetsContainer();
        createWidgets();
        startUpdating();
        console.log('🎯 Widget Manager inicializado');
    }

    function createToggleButton() {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'widget-toggle';
        toggleBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
        toggleBtn.title = 'Toggle Widgets (Ctrl+W)';
        toggleBtn.addEventListener('click', toggleWidgets);
        document.body.appendChild(toggleBtn);
    }

    function createWidgetsContainer() {
        widgetsContainer = document.createElement('div');
        widgetsContainer.className = 'floating-widgets';
        widgetsContainer.style.display = 'none'; // Inicialmente ocultos
        document.body.appendChild(widgetsContainer);
    }

    function createWidgets() {
        // Solo mostrar 2 widgets principales para no saturar
        createEnvironmentalWidget(); // Más relevante para EcoTrack
        createActivityWidget(); // Información de la sesión
    }

    function createWidget(id, className, icon, title) {
        const widget = document.createElement('div');
        widget.className = `widget ${className}`;
        widget.id = id;
        widget.innerHTML = `
            <div class="widget-header">
                <i class="fas ${icon} widget-icon"></i>
                <span>${title}</span>
            </div>
            <div class="widget-content" id="${id}-content">
                <div class="widget-value" id="${id}-value">---</div>
                <div id="${id}-description">Cargando...</div>
                <div class="widget-trend" id="${id}-trend">
                    <i class="fas fa-circle trend-stable"></i>
                    <span>Estable</span>
                </div>
            </div>
        `;
        
        widgetsContainer.appendChild(widget);
        widgets.push({
            id: id,
            element: widget,
            lastUpdate: Date.now()
        });

        return widget;
    }

    function createWeatherWidget() {
        const widget = createWidget('weather-widget', 'weather-widget', 'fa-cloud-sun', 'Clima');
        updateWeatherData();
    }

    function createEnvironmentalWidget() {
        const widget = createWidget('env-widget', 'environmental-widget', 'fa-leaf', 'Calidad Ambiental');
        updateEnvironmentalData();
    }

    function createActivityWidget() {
        const widget = createWidget('activity-widget', 'activity-widget', 'fa-chart-line', 'Actividad');
        updateActivityData();
    }

    function createPerformanceWidget() {
        const widget = createWidget('performance-widget', 'performance-widget', 'fa-tachometer-alt', 'Rendimiento');
        updatePerformanceData();
    }

    function updateWeatherData() {
        // Simular datos de clima dinámicos
        const temperatures = [18, 22, 25, 28, 24, 20];
        const conditions = ['Soleado', 'Parcialmente nublado', 'Nublado', 'Lluvia ligera'];
        
        const temp = temperatures[Math.floor(Math.random() * temperatures.length)];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const humidity = Math.floor(Math.random() * 40) + 40; // 40-80%
        
        updateWidgetContent('weather-widget', {
            value: `${temp}°C`,
            description: `${condition}<br>Humedad: ${humidity}%`,
            trend: temp > 25 ? 'up' : temp < 20 ? 'down' : 'stable'
        });
    }

    function updateEnvironmentalData() {
        // Calcular calidad ambiental basada en eventos
        const totalEvents = window.ecoEvents ? window.ecoEvents.length : 0;
        const recentEvents = window.ecoEvents ? window.ecoEvents.filter(e => {
            const eventDate = new Date(e.fecha);
            const now = new Date();
            const daysDiff = (now - eventDate) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
        }).length : 0;

        let quality = 'Excelente';
        let score = 95;
        let trend = 'stable';

        if (recentEvents > 3) {
            quality = 'Preocupante';
            score = 45;
            trend = 'down';
        } else if (recentEvents > 1) {
            quality = 'Regular';
            score = 70;
            trend = 'down';
        } else if (totalEvents < 5) {
            quality = 'Muy Buena';
            score = 90;
            trend = 'up';
        }

        updateWidgetContent('env-widget', {
            value: `${score}/100`,
            description: `Estado: ${quality}<br>Eventos recientes: ${recentEvents}`,
            trend: trend
        });
    }

    function updateActivityData() {
        // Actividad del usuario y del sistema
        const mapInteractions = parseInt(localStorage.getItem('mapInteractions') || '0');
        const sessionTime = Math.floor((Date.now() - (window.sessionStartTime || Date.now())) / 1000 / 60);
        const reportsToday = parseInt(localStorage.getItem('reportsToday') || '0');

        updateWidgetContent('activity-widget', {
            value: `${mapInteractions}`,
            description: `Interacciones hoy<br>Sesión: ${sessionTime}min<br>Reportes: ${reportsToday}`,
            trend: mapInteractions > 10 ? 'up' : 'stable'
        });

        // Incrementar contador de interacciones
        localStorage.setItem('mapInteractions', (mapInteractions + 1).toString());
    }

    function updatePerformanceData() {
        // Métricas de rendimiento del sistema
        const loadTime = window.performance ? Math.round(window.performance.now()) : 1000;
        const memoryUsage = window.performance && window.performance.memory ? 
            Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) : 0;
        
        let status = 'Óptimo';
        let trend = 'stable';
        
        if (loadTime > 3000) {
            status = 'Lento';
            trend = 'down';
        } else if (loadTime > 1500) {
            status = 'Regular';
            trend = 'down';
        } else if (loadTime < 500) {
            status = 'Excelente';
            trend = 'up';
        }

        updateWidgetContent('performance-widget', {
            value: `${Math.round(loadTime)}ms`,
            description: `Estado: ${status}<br>Memoria: ${memoryUsage}MB`,
            trend: trend
        });
    }

    function updateWidgetContent(widgetId, data) {
        const valueElement = document.getElementById(`${widgetId}-value`);
        const descElement = document.getElementById(`${widgetId}-description`);
        const trendElement = document.getElementById(`${widgetId}-trend`);
        const widget = document.getElementById(widgetId);

        if (valueElement && descElement && trendElement && widget) {
            // Agregar clase de actualización
            widget.classList.add('updating');
            
            setTimeout(() => {
                valueElement.textContent = data.value;
                descElement.innerHTML = data.description;
                
                // Actualizar indicador de tendencia
                const icon = trendElement.querySelector('i');
                const text = trendElement.querySelector('span');
                
                icon.className = 'fas fa-circle';
                trendElement.className = 'widget-trend';
                
                switch(data.trend) {
                    case 'up':
                        icon.classList.add('fa-arrow-up');
                        trendElement.classList.add('trend-up');
                        text.textContent = 'Subiendo';
                        break;
                    case 'down':
                        icon.classList.add('fa-arrow-down');
                        trendElement.classList.add('trend-down');
                        text.textContent = 'Bajando';
                        break;
                    default:
                        icon.classList.add('fa-circle');
                        trendElement.classList.add('trend-stable');
                        text.textContent = 'Estable';
                }
                
                widget.classList.remove('updating');
            }, 200);
        }
    }

    function startUpdating() {
        // Actualizar widgets cada 2 minutos para ser menos intrusivo
        updateInterval = setInterval(() => {
            const container = document.querySelector('.floating-widgets');
            if (container && container.style.display !== 'none') {
                updateEnvironmentalData();
                updateActivityData();
            }
        }, 120000); // 2 minutos
    }

    function stopUpdating() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }

    function toggleWidgets() {
        const container = document.querySelector('.floating-widgets');
        const toggleBtn = document.querySelector('.widget-toggle');
        
        if (container && toggleBtn) {
            const isVisible = container.style.display !== 'none';
            container.style.display = isVisible ? 'none' : 'flex';
            toggleBtn.classList.toggle('active', !isVisible);
            toggleBtn.innerHTML = isVisible ? 
                '<i class="fas fa-chart-bar"></i>' : 
                '<i class="fas fa-times"></i>';
            
            // Reproducir sonido
            if (window.AudioManager) {
                window.AudioManager.playSound('click');
            }
            
            // Mostrar toast
            const message = isVisible ? 'Widgets ocultos' : 'Widgets mostrados';
            showToast('📊 Widgets', message, 'info', 1500);
        }
    }

    // API pública
    return {
        init: init,
        updateWidget: updateWidgetContent,
        toggleWidgets: toggleWidgets,
        stopUpdating: stopUpdating,
        startUpdating: startUpdating
    };
})();

// window.WidgetManager = WidgetManager; // DESACTIVADO
*/

// Advanced Interactions System - COMPLETAMENTE DESACTIVADO
/*
const InteractionManager = (function() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let isKeyboardShortcutsEnabled = true;
    let gesturesEnabled = true;

    function init() {
        initKeyboardShortcuts();
        initTouchGestures();
        // initMouseGestures(); // Desactivado temporalmente para evitar interferencias
        // createInteractionIndicators(); // Desactivado para reducir elementos visuales
        console.log('🎮 Interaction Manager inicializado');
    }

    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!isKeyboardShortcutsEnabled) return;

            // Prevenir shortcuts si estamos en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch(e.key.toLowerCase()) {
                case 'h':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        showHelpDialog();
                    }
                    break;
                case 'd':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (window.DarkModeManager) {
                            window.DarkModeManager.toggle();
                        }
                    }
                    break;
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        focusSearch();
                    }
                    break;
                case 'w':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (window.WidgetManager) {
                            window.WidgetManager.toggleWidgets();
                        }
                    }
                    break;
                case 'escape':
                    closeAllDialogs();
                    break;
                case 'f':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        toggleFullscreen();
                    }
                    break;
                case 'r':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        refreshData();
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    toggleMapInteraction();
                    break;
                case '+':
                case '=':
                    if (window.map) {
                        window.map.zoomIn();
                    }
                    break;
                case '-':
                    if (window.map) {
                        window.map.zoomOut();
                    }
                    break;
            }
        });
    }

    function initTouchGestures() {
        let touchDevice = 'ontouchstart' in window;
        if (!touchDevice) return;

        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });

        // Gestos de pellizco para zoom
        let initialDistance = 0;
        let currentDistance = 0;

        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = getDistance(e.touches[0], e.touches[1]);
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && window.map) {
                e.preventDefault();
                currentDistance = getDistance(e.touches[0], e.touches[1]);
                
                if (initialDistance > 0) {
                    const scale = currentDistance / initialDistance;
                    if (scale > 1.1) {
                        window.map.zoomIn();
                        initialDistance = currentDistance;
                    } else if (scale < 0.9) {
                        window.map.zoomOut();
                        initialDistance = currentDistance;
                    }
                }
            }
        });
    }

    function handleTouchStart(e) {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }

    function handleTouchMove(e) {
        // Detectar gestos de deslizamiento
        if (e.touches.length === 1) {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            
            const deltaX = currentX - touchStartX;
            const deltaY = currentY - touchStartY;
            
            // Si es un deslizamiento horizontal largo
            if (Math.abs(deltaX) > 100 && Math.abs(deltaY) < 50) {
                if (deltaX > 0) {
                    // Deslizar hacia la derecha - mostrar widgets
                    if (window.WidgetManager) {
                        window.WidgetManager.toggleWidgets();
                    }
                } else {
                    // Deslizar hacia la izquierda - ocultar widgets
                    if (window.WidgetManager) {
                        window.WidgetManager.toggleWidgets();
                    }
                }
            }
        }
    }

    function handleTouchEnd(e) {
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Detectar tap doble
        if (distance < 10) {
            handleDoubleTap(e);
        }
        
        // Detectar gestos de deslizamiento
        if (distance > 50) {
            handleSwipeGesture(deltaX, deltaY);
        }
    }

    function handleDoubleTap(e) {
        // Implementar doble tap para zoom
        let tapCount = parseInt(e.target.getAttribute('data-tap-count') || '0');
        tapCount++;
        e.target.setAttribute('data-tap-count', tapCount.toString());
        
        setTimeout(() => {
            e.target.setAttribute('data-tap-count', '0');
        }, 300);
        
        if (tapCount === 2 && window.map) {
            const rect = e.target.getBoundingClientRect();
            const x = e.changedTouches[0].clientX - rect.left;
            const y = e.changedTouches[0].clientY - rect.top;
            
            window.map.zoomIn();
            
            if (window.AudioManager) {
                window.AudioManager.playSound('success');
            }
        }
    }

    function handleSwipeGesture(deltaX, deltaY) {
        const minSwipeDistance = 100;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Deslizamiento horizontal
            if (Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // Deslizar derecha - mostrar panel lateral
                    toggleSidePanel(true);
                } else {
                    // Deslizar izquierda - ocultar panel lateral
                    toggleSidePanel(false);
                }
            }
        } else {
            // Deslizamiento vertical
            if (Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY < 0) {
                    // Deslizar arriba - mostrar información adicional
                    showQuickInfo();
                } else {
                    // Deslizar abajo - refrescar datos
                    refreshData();
                }
            }
        }
    }

    function initMouseGestures() {
        let mouseTrail = [];
        let isDrawing = false;

        document.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Botón derecho
                isDrawing = true;
                mouseTrail = [{x: e.clientX, y: e.clientY}];
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDrawing) {
                mouseTrail.push({x: e.clientX, y: e.clientY});
                
                // Limitar el trail a los últimos 10 puntos
                if (mouseTrail.length > 10) {
                    mouseTrail.shift();
                }
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isDrawing && e.button === 2) {
                isDrawing = false;
                analyzeMouseGesture(mouseTrail);
                mouseTrail = [];
            }
        });

        // Prevenir menú contextual para gestos
        document.addEventListener('contextmenu', (e) => {
            if (mouseTrail.length > 3) {
                e.preventDefault();
            }
        });
    }

    function analyzeMouseGesture(trail) {
        if (trail.length < 3) return;
        
        const start = trail[0];
        const end = trail[trail.length - 1];
        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;
        
        // Círculo: volver al inicio
        if (isCircularGesture(trail)) {
            returnToHome();
        }
        // Línea hacia arriba: zoom in
        else if (deltaY < -50 && Math.abs(deltaX) < 30) {
            if (window.map) window.map.zoomIn();
        }
        // Línea hacia abajo: zoom out
        else if (deltaY > 50 && Math.abs(deltaX) < 30) {
            if (window.map) window.map.zoomOut();
        }
        // Línea hacia la derecha: siguiente vista
        else if (deltaX > 50 && Math.abs(deltaY) < 30) {
            nextView();
        }
        // Línea hacia la izquierda: vista anterior
        else if (deltaX < -50 && Math.abs(deltaY) < 30) {
            previousView();
        }
    }

    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function isCircularGesture(trail) {
        if (trail.length < 8) return false;
        
        const center = {
            x: trail.reduce((sum, p) => sum + p.x, 0) / trail.length,
            y: trail.reduce((sum, p) => sum + p.y, 0) / trail.length
        };
        
        let angles = [];
        for (let point of trail) {
            const angle = Math.atan2(point.y - center.y, point.x - center.x);
            angles.push(angle);
        }
        
        // Verificar si los ángulos forman un círculo completo
        let totalRotation = 0;
        for (let i = 1; i < angles.length; i++) {
            let diff = angles[i] - angles[i-1];
            if (diff > Math.PI) diff -= 2 * Math.PI;
            if (diff < -Math.PI) diff += 2 * Math.PI;
            totalRotation += diff;
        }
        
        return Math.abs(totalRotation) > Math.PI * 1.5; // Al menos 3/4 de círculo
    }

    function createInteractionIndicators() {
        // Crear indicador de gestos
        const indicator = document.createElement('div');
        indicator.className = 'gesture-indicator';
        indicator.innerHTML = `
            <div class="gesture-hint">
                <i class="fas fa-hand-paper"></i>
                <span>Gestos disponibles</span>
            </div>
        `;
        indicator.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(34, 197, 94, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 1000;
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        
        document.body.appendChild(indicator);
        
        // Mostrar temporalmente al inicio
        setTimeout(() => {
            indicator.style.opacity = '1';
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 3000);
        }, 2000);
    }

    // Funciones de utilidad para los gestos
    function showHelpDialog() {
        const helpContent = `
            <h3>🎮 Atajos de Teclado</h3>
            <p><kbd>Ctrl/Cmd + H</kbd> - Mostrar ayuda</p>
            <p><kbd>Ctrl/Cmd + D</kbd> - Cambiar modo oscuro</p>
            <p><kbd>Ctrl/Cmd + S</kbd> - Enfocar búsqueda</p>
            <p><kbd>Ctrl/Cmd + W</kbd> - Toggle widgets</p>
            <p><kbd>Ctrl/Cmd + F</kbd> - Pantalla completa</p>
            <p><kbd>Espacio</kbd> - Pausar interacciones</p>
            <p><kbd>+/-</kbd> - Zoom in/out</p>
            
            <h3>👆 Gestos Táctiles</h3>
            <p>Deslizar horizontalmente - Toggle widgets</p>
            <p>Deslizar arriba - Información rápida</p>
            <p>Deslizar abajo - Refrescar datos</p>
            <p>Doble tap - Zoom in</p>
            <p>Pellizco - Zoom in/out</p>
            
            <h3>🖱️ Gestos de Ratón</h3>
            <p>Círculo (botón derecho) - Volver al inicio</p>
            <p>Línea arriba - Zoom in</p>
            <p>Línea abajo - Zoom out</p>
        `;
        
        showToast('Ayuda de Interacciones', helpContent, 'info', 8000);
    }

    function focusSearch() {
        const searchInput = document.querySelector('#searchInput, input[type="search"]');
        if (searchInput) {
            searchInput.focus();
            if (window.AudioManager) {
                window.AudioManager.playSound('click');
            }
        }
    }

    function closeAllDialogs() {
        // Cerrar todos los elementos emergentes
        const modals = document.querySelectorAll('.modal, .popup, .dialog');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        const overlays = document.querySelectorAll('.overlay');
        overlays.forEach(overlay => {
            overlay.style.display = 'none';
        });
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Error al activar pantalla completa:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    function refreshData() {
        // Refrescar todos los datos
        if (window.DataManager && window.DataManager.loadAllData) {
            window.DataManager.loadAllData();
        }
        if (window.WidgetManager) {
            window.WidgetManager.startUpdating();
        }
        
        showToast('✅ Datos actualizados', 'Información refrescada correctamente', 'success', 2000);
        
        if (window.AudioManager) {
            window.AudioManager.playSound('success');
        }
    }

    function toggleMapInteraction() {
        if (window.map) {
            const currentState = window.map.dragging.enabled();
            if (currentState) {
                window.map.dragging.disable();
                window.map.touchZoom.disable();
                window.map.doubleClickZoom.disable();
                window.map.scrollWheelZoom.disable();
                showToast('⏸️ Interacciones pausadas', 'Mapa bloqueado temporalmente', 'warning', 2000);
            } else {
                window.map.dragging.enable();
                window.map.touchZoom.enable();
                window.map.doubleClickZoom.enable();
                window.map.scrollWheelZoom.enable();
                showToast('▶️ Interacciones activas', 'Mapa desbloqueado', 'success', 2000);
            }
        }
    }

    function toggleSidePanel(show) {
        const searchPanel = document.querySelector('.search-panel');
        if (searchPanel) {
            if (show) {
                searchPanel.classList.add('active');
            } else {
                searchPanel.classList.remove('active');
            }
        }
    }

    function showQuickInfo() {
        const stats = {
            eventos: window.ecoEvents ? window.ecoEvents.length : 0,
            zoom: window.map ? window.map.getZoom() : 0,
            centro: window.map ? window.map.getCenter() : {lat: 0, lng: 0}
        };
        
        const info = `
            📊 <strong>Estado Actual</strong><br>
            Eventos: ${stats.eventos}<br>
            Zoom: ${stats.zoom.toFixed(1)}<br>
            Centro: ${stats.centro.lat.toFixed(4)}, ${stats.centro.lng.toFixed(4)}
        `;
        
        showToast('ℹ️ Información Rápida', info, 'info', 4000);
    }

    function returnToHome() {
        if (window.map) {
            window.map.setView([19.4326, -99.1332], 10);
            showToast('🏠 Regreso al inicio', 'Vista centrada en CDMX', 'success', 2000);
            
            if (window.AudioManager) {
                window.AudioManager.playSound('success');
            }
        }
    }

    function nextView() {
        // Ciclar entre diferentes vistas predefinidas
        const views = [
            {center: [19.4326, -99.1332], zoom: 10, name: 'CDMX General'},
            {center: [19.4204, -99.1462], zoom: 14, name: 'Centro Histórico'},
            {center: [19.3910, -99.2837], zoom: 13, name: 'Santa Fe'},
            {center: [19.4969, -99.1276], zoom: 13, name: 'Polanco'}
        ];
        
        const currentView = parseInt(localStorage.getItem('currentView') || '0');
        const nextView = (currentView + 1) % views.length;
        
        if (window.map) {
            const view = views[nextView];
            window.map.setView(view.center, view.zoom);
            showToast(`📍 Vista: ${view.name}`, '', 'info', 2000);
            localStorage.setItem('currentView', nextView.toString());
        }
    }

    function previousView() {
        const views = [
            {center: [19.4326, -99.1332], zoom: 10, name: 'CDMX General'},
            {center: [19.4204, -99.1462], zoom: 14, name: 'Centro Histórico'},
            {center: [19.3910, -99.2837], zoom: 13, name: 'Santa Fe'},
            {center: [19.4969, -99.1276], zoom: 13, name: 'Polanco'}
        ];
        
        const currentView = parseInt(localStorage.getItem('currentView') || '0');
        const prevView = currentView === 0 ? views.length - 1 : currentView - 1;
        
        if (window.map) {
            const view = views[prevView];
            window.map.setView(view.center, view.zoom);
            showToast(`📍 Vista: ${view.name}`, '', 'info', 2000);
            localStorage.setItem('currentView', prevView.toString());
        }
    }

    // API pública
    return {
        init: init,
        enableKeyboard: () => { isKeyboardShortcutsEnabled = true; },
        disableKeyboard: () => { isKeyboardShortcutsEnabled = false; },
        enableGestures: () => { gesturesEnabled = true; },
        disableGestures: () => { gesturesEnabled = false; },
        showHelp: showHelpDialog,
        refreshData: refreshData
    };
})();

// window.InteractionManager = InteractionManager; // DESACTIVADO
*/