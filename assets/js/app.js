/*
 * HydroFlujo - Aplicación Principal
 * Sistema de monitoreo colaborativo de riesgos hidrometeorológicos
 * Hermosillo, Sonora - México
 */

// ==========================================================================
// Global State Management
// ==========================================================================

const AppState = {
    incidents: [],
    map: null,
    charts: {},
    currentView: 'welcome',
    isLoading: false,
    filters: {
        severity: [],
        colonia: [],
        dateRange: null
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

    // Show notification
    showNotification: (message, type = 'success', duration = 3000) => {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <i class="fas fa-${type === 'success' ? 'check-circle text-green-500' : 
                                         type === 'error' ? 'exclamation-circle text-red-500' : 
                                         type === 'info' ? 'info-circle text-blue-500' :
                                         'exclamation-triangle text-yellow-500'}"></i>
                    <span>${message}</span>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-slate-600 ml-4">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
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

    // Update stats displays
    updateStatsDisplays: () => {
        const total = AppState.incidents.length;
        const highRisk = AppState.incidents.filter(i => i.gravedad === 'alto').length;
        const lastMonth = AppState.incidents.filter(i => {
            const date = new Date(i.fecha_evento);
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return date >= monthAgo;
        }).length;

        // Update main stats
        const statsTotal = document.getElementById('stats-total-reports');
        const statsHighRisk = document.getElementById('stats-high-risk');
        const statsLastMonth = document.getElementById('stats-last-month');
        
        if (statsTotal) statsTotal.textContent = total;
        if (statsHighRisk) statsHighRisk.textContent = highRisk;
        if (statsLastMonth) statsLastMonth.textContent = lastMonth;

        // Update about section stats
        const aboutReports = document.getElementById('about-reports');
        if (aboutReports) aboutReports.textContent = `${total}+`;
        
        // Update footer timestamp
        const footerUpdate = document.getElementById('footer-last-update');
        if (footerUpdate) footerUpdate.textContent = new Date().toLocaleTimeString('es-MX');
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
            lat: parseFloat(row.lat),
            lon: parseFloat(row.lon),
            mm_lluvia: parseInt(row.mm_lluvia_reportados) || 0,
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
            Utils.showNotification('Cargando datos históricos...', 'info');
            
            const response = await fetch('assets/data/eventos_hidro.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            const csvData = DataManager.parseCSV(csvText);
            const incidents = DataManager.convertCSVToIncidents(csvData);
            
            // Replace existing incidents with CSV data
            AppState.incidents = incidents;
            
            // Update map and UI
            MapManager.clearIncidents();
            incidents.forEach(incident => {
                MapManager.addIncidentToMap(incident);
            });
            
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

        // Layer control
        const baseLayers = {
            "Mapa": osmLayer,
            "Satélite": satelliteLayer
        };
        L.control.layers(baseLayers).addTo(AppState.map);

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
        const marker = L.marker([incident.lat, incident.lon], { 
            icon: MapManager.getIconBySeverity(incident.gravedad) 
        });
        
        marker.addTo(AppState.map)
              .bindPopup(`
                  <div class="p-4 max-w-sm">
                      <h3 class="font-bold text-sm mb-2">${incident.titulo}</h3>
                      <div class="space-y-1 text-xs text-slate-600">
                          <p><i class="fas fa-map-marker-alt w-4"></i> ${incident.colonia}</p>
                          <p><i class="fas fa-calendar w-4"></i> ${Utils.formatDate(incident.fecha_evento)}</p>
                          <p><i class="fas fa-tint w-4"></i> ${incident.mm_lluvia} mm</p>
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
              .on('click', () => {
                  UIManager.displayIncidentDetails(incident);
                  AppState.map.setView([incident.lat, incident.lon], 15);
              });

        // Store marker reference for cleanup
        MapManager.markers.push(marker);
    }
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

// Export for use in other files
window.AppState = AppState;
window.Utils = Utils;
window.DataManager = DataManager;
window.MapManager = MapManager;
window.ChartManager = ChartManager;