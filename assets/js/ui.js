/*
 * HydroFlujo - UI Management
 * Gestión de interfaz de usuario y plantillas
 */

// ==========================================================================
// UI Templates
// ==========================================================================

const UITemplates = {
    welcomePanel: () => `
        <div class="fade-in">
            <h2 class="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                <div class="p-3 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl floating-animation pulse-glow">
                    <i class="fas fa-home text-cyan-600"></i>
                </div>
                <span class="gradient-text">Bienvenido a HydroFlujo</span>
            </h2>
            <p class="text-slate-600 mt-4 leading-relaxed">
                Explora el mapa interactivo para descubrir los reportes de afectaciones por lluvias 
                e inundaciones en Hermosillo, Sonora.
            </p>
            <div class="mt-6 p-6 welcome-gradient rounded-2xl border border-cyan-200 shine-effect">
                <h4 class="font-bold text-cyan-800 text-lg flex items-center gap-2 mb-3">
                    <i class="fas fa-lightbulb text-yellow-500 floating-animation"></i> 
                    <span class="gradient-text">¿Cómo funciona?</span>
                </h4>
                <ul class="text-sm text-cyan-700 space-y-2">
                    <li class="flex items-start gap-2">
                        <i class="fas fa-map-marker-alt text-red-500 mt-1"></i>
                        <span>Haz clic en los marcadores del mapa para ver detalles de eventos</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <i class="fas fa-plus-circle text-green-500 mt-1"></i>
                        <span>Usa el botón "Añadir Reporte" para contribuir con información</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <i class="fas fa-chart-bar text-blue-500 mt-1"></i>
                        <span>Revisa las estadísticas para análisis detallados</span>
                    </li>
                </ul>
            </div>
            <div class="mt-6 grid grid-cols-2 gap-4 text-center">
                <div class="p-4 bg-gradient-to-br from-white to-cyan-50 rounded-2xl border border-slate-200 shine-effect hover:scale-105 transition-all duration-300">
                    <div class="text-2xl font-bold gradient-text">${AppState.incidents.length}</div>
                    <div class="text-xs text-slate-600 font-medium">Reportes Activos</div>
                </div>
                <div class="p-4 bg-gradient-to-br from-white to-green-50 rounded-2xl border border-slate-200 shine-effect hover:scale-105 transition-all duration-300">
                    <div class="text-2xl font-bold text-green-600 floating-animation">24/7</div>
                    <div class="text-xs text-slate-600 font-medium">Monitoreo</div>
                </div>
            </div>
        </div>
    `,

    incidentDetails: (incident) => {
        const severityConfig = {
            alto: { class: 'status-alto', icon: 'fas fa-exclamation-triangle' },
            medio: { class: 'status-medio', icon: 'fas fa-exclamation-circle' },
            bajo: { class: 'status-bajo', icon: 'fas fa-info-circle' }
        };
        const config = severityConfig[incident.gravedad] || severityConfig.bajo;

        return `
            <div class="fade-in">
                <div class="flex justify-between items-start mb-6">
                    <h2 class="text-xl font-bold gradient-text leading-tight pr-4">${incident.titulo}</h2>
                    <button id="close-details-btn" class="text-slate-400 hover:text-slate-600 text-2xl p-2 rounded-full hover:bg-gradient-to-br hover:from-red-50 hover:to-red-100 transition-all duration-300 hover:scale-110" title="Cerrar">
                        &times;
                    </button>
                </div>
                
                <div class="space-y-4">
                    <!-- Información básica -->
                    <div class="card p-6 bg-gradient-to-br from-slate-50 to-blue-50 shine-effect">
                        <div class="grid grid-cols-1 gap-4 text-sm">
                            <div>
                                <span class="font-semibold text-slate-500 block mb-1">FECHA DEL EVENTO</span>
                                <span class="text-slate-700 flex items-center gap-2">
                                    <i class="fas fa-calendar-alt text-blue-500"></i>
                                    ${Utils.formatDate(incident.fecha_evento)}
                                </span>
                            </div>
                            <div>
                                <span class="font-semibold text-slate-500 block mb-1">UBICACIÓN</span>
                                <span class="text-slate-700 flex items-center gap-2">
                                    <i class="fas fa-map-pin text-red-500"></i>
                                    ${incident.direccion || 'No especificada'}, ${incident.colonia}
                                </span>
                            </div>
                            <div>
                                <span class="font-semibold text-slate-500 block mb-2">NIVEL DE GRAVEDAD</span>
                                <div class="status-indicator ${config.class}">
                                    <i class="${config.icon}"></i>
                                    ${incident.gravedad.toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Datos meteorológicos -->
                    ${incident.mm_lluvia ? `
                        <div class="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 shine-effect">
                            <i class="fas fa-cloud-rain text-blue-600 text-2xl floating-animation"></i>
                            <div>
                                <span class="font-semibold text-blue-800 block">Precipitación Reportada</span>
                                <span class="text-blue-700 text-lg font-bold">${incident.mm_lluvia} mm</span>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Afectaciones -->
                    <div>
                        <span class="font-semibold text-slate-500 block mb-2">AFECTACIONES REPORTADAS</span>
                        <div class="p-4 bg-white border border-slate-200 rounded-lg">
                            <p class="text-slate-700 leading-relaxed">${incident.afectaciones}</p>
                        </div>
                    </div>

                    <!-- Información adicional -->
                    ${incident.notas ? `
                        <div>
                            <span class="font-semibold text-slate-500 block mb-2">NOTAS TÉCNICAS</span>
                            <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p class="text-amber-800 text-sm">${incident.notas}</p>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Fuente de información -->
                    ${incident.medio || incident.autora ? `
                        <div class="card p-3 bg-gray-50 border border-gray-200">
                            <span class="font-semibold text-slate-500 block mb-1 text-xs">FUENTE</span>
                            <div class="text-xs text-slate-600">
                                ${incident.medio ? `<span class="font-medium">${incident.medio}</span>` : ''}
                                ${incident.autora ? ` - ${incident.autora}` : ''}
                                ${incident.fecha_publicacion ? `<br><span class="text-slate-500">Publicado: ${Utils.formatDate(incident.fecha_publicacion)}</span>` : ''}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Enlaces externos -->
                    ${incident.url_noticia ? `
                        <a href="${incident.url_noticia}" target="_blank" 
                           class="inline-flex items-center gap-2 mt-4 text-cyan-600 font-semibold hover:text-cyan-700 transition-colors w-full p-3 bg-cyan-50 rounded-lg border border-cyan-200 hover:bg-cyan-100">
                            <i class="fas fa-external-link-alt"></i>
                            <span>Ver fuente de noticia</span>
                        </a>
                    ` : ''}

                    <div class="flex gap-3 mt-6">
                        <button onclick="AppState.map.setView([${incident.lat}, ${incident.lon}], 16)" 
                                class="flex-1 text-sm py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 shine-effect hover:scale-105 font-semibold">
                            <i class="fas fa-crosshairs mr-2"></i>Centrar en mapa
                        </button>
                        <button onclick="UIManager.shareIncident('${incident.titulo}', '${incident.afectaciones.substring(0, 100)}...')" 
                                class="text-sm py-3 px-4 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-xl hover:from-slate-200 hover:to-slate-300 transition-all duration-300 shine-effect hover:scale-105 font-semibold">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    reportForm: () => `
        <div class="fade-in">
            <div class="flex justify-between items-start mb-6">
                <h2 class="text-xl font-bold gradient-text flex items-center gap-3">
                    <div class="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl floating-animation pulse-glow">
                        <i class="fas fa-plus-square text-green-600"></i>
                    </div>
                    <span class="gradient-text">Nuevo Reporte</span>
                </h2>
                <button id="cancel-form-btn" class="text-slate-400 hover:text-slate-600 text-2xl p-1 rounded-full hover:bg-slate-100 transition-colors">
                    &times;
                </button>
            </div>
            
            <div class="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl shine-effect">
                <div class="flex items-start gap-4">
                    <i class="fas fa-info-circle text-blue-600 mt-1 text-lg floating-animation"></i>
                    <div class="text-sm text-blue-800">
                        <p class="font-bold mb-2 gradient-text">Instrucciones:</p>
                        <p>Haz clic en el mapa para marcar la ubicación del evento y luego completa el formulario.</p>
                    </div>
                </div>
            </div>

            <form id="report-form" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="form-label">Latitud</label>
                        <input type="text" id="lat" name="lat" class="form-input" readonly required>
                    </div>
                    <div>
                        <label class="form-label">Longitud</label>
                        <input type="text" id="lon" name="lon" class="form-input" readonly required>
                    </div>
                </div>
                
                <div>
                    <label class="form-label">Título del evento</label>
                    <input type="text" id="titulo" name="titulo" class="form-input" 
                           placeholder="Ej: Inundación en calle principal" required>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="form-label">Fecha del evento</label>
                        <input type="date" id="fecha_evento" name="fecha_evento" class="form-input" required>
                    </div>
                    <div>
                        <label class="form-label">Precipitación (mm)</label>
                        <input type="number" id="mm_lluvia" name="mm_lluvia" class="form-input" 
                               placeholder="Opcional" min="0" step="0.1">
                    </div>
                </div>

                <div>
                    <label class="form-label">Colonia</label>
                    <input type="text" id="colonia" name="colonia" class="form-input" 
                           placeholder="Ej: Villas de San Lorenzo" list="colonias-list">
                    <datalist id="colonias-list">
                        <option value="Villas de San Lorenzo">
                        <option value="Centro">
                        <option value="Los Naranjos">
                        <option value="Villa de Seris">
                        <option value="San Benito">
                        <option value="Pitic">
                        <option value="Modelo">
                        <option value="Bugambilias">
                        <option value="Olivares">
                        <option value="Recursos Hidráulicos">
                    </datalist>
                </div>

                <div>
                    <label class="form-label">Dirección específica</label>
                    <input type="text" id="direccion" name="direccion" class="form-input" 
                           placeholder="Ej: Calle Sonora #123 (Opcional)">
                </div>
                
                <div>
                    <label class="form-label">Nivel de gravedad</label>
                    <select id="gravedad" name="gravedad" class="form-input" required>
                        <option value="">Seleccionar nivel</option>
                        <option value="bajo">🟡 Bajo - Afectaciones menores</option>
                        <option value="medio">🟠 Medio - Afectaciones moderadas</option>
                        <option value="alto">🔴 Alto - Afectaciones severas</option>
                    </select>
                </div>
                
                <div>
                    <label class="form-label">Descripción de afectaciones</label>
                    <textarea id="afectaciones" name="afectaciones" rows="4" class="form-input" 
                             placeholder="Describe las afectaciones observadas: calles anegadas, vehículos varados, daños en viviendas, etc." required></textarea>
                </div>

                <div>
                    <label class="form-label">URL de noticia o referencia</label>
                    <input type="url" id="url_noticia" name="url_noticia" class="form-input" 
                           placeholder="https://... (Opcional)">
                </div>
                
                <div class="flex gap-3 pt-4">
                    <button type="submit" class="flex-1 btn btn-primary">
                        <i class="fas fa-save mr-2"></i>Guardar Reporte
                    </button>
                    <button type="button" id="clear-form" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                        <i class="fas fa-eraser"></i>
                    </button>
                </div>
            </form>
        </div>
    `
};

// ==========================================================================
// UI Manager
// ==========================================================================

const UIManager = {
    // Initialize UI
    initialize: () => {
        UIManager.setupNavigation();
        UIManager.setupLegend();
        UIManager.setupExportButtons();
        UIManager.showWelcomePanel();
    },

    // Setup navigation
    setupNavigation: () => {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
                const icon = mobileMenuButton.querySelector('svg path');
                if (mobileMenu.classList.contains('hidden')) {
                    icon.setAttribute('d', 'M4 6h16M4 12h16m-7 6h7');
                } else {
                    icon.setAttribute('d', 'M6 18L18 6M6 6l12 12');
                }
            });

            // Close mobile menu when clicking links
            document.querySelectorAll('#mobile-menu a').forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.add('hidden');
                    mobileMenuButton.querySelector('svg path').setAttribute('d', 'M4 6h16M4 12h16m-7 6h7');
                });
            });
        }

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    },

    // Setup legend
    setupLegend: () => {
        const toggleLegend = document.getElementById('toggle-legend');
        if (toggleLegend) {
            toggleLegend.addEventListener('click', () => {
                const content = document.getElementById('legend-content');
                const icon = toggleLegend.querySelector('i');
                
                if (content && icon) {
                    content.classList.toggle('hidden');
                    icon.className = content.classList.contains('hidden') ? 'fas fa-eye-slash' : 'fas fa-eye';
                }
            });
        }
    },

    // Setup export buttons
    setupExportButtons: () => {
        // Export data button
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const dataStr = JSON.stringify(AppState.incidents, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `hydroflujo-data-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
                Utils.showNotification('Datos exportados exitosamente');
            });
        }

        // Share button
        const shareBtn = document.getElementById('share-map-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                const shareData = {
                    title: 'HydroFlujo - Monitor de Riesgos de Hermosillo',
                    text: `Mira los ${AppState.incidents.length} reportes de riesgos hidrometeorológicos en Hermosillo`,
                    url: window.location.href
                };
                
                if (navigator.share) {
                    try {
                        await navigator.share(shareData);
                        Utils.showNotification('Compartido exitosamente');
                    } catch (err) {
                        console.log('Error sharing:', err);
                    }
                } else {
                    navigator.clipboard.writeText(window.location.href);
                    Utils.showNotification('URL copiada al portapapeles');
                }
            });
        }
    },

    // Show welcome panel
    showWelcomePanel: () => {
        AppState.currentView = 'welcome';
        const infoPanelContent = document.getElementById('info-panel-content');
        const addReportBtn = document.getElementById('add-report-btn');
        
        if (infoPanelContent) {
            infoPanelContent.innerHTML = UITemplates.welcomePanel();
        }
        if (addReportBtn) {
            addReportBtn.classList.remove('hidden');
        }
        
        Utils.updateLegendCounts();
    },

    // Display incident details
    displayIncidentDetails: (incident) => {
        AppState.currentView = 'details';
        const infoPanelContent = document.getElementById('info-panel-content');
        const addReportBtn = document.getElementById('add-report-btn');
        
        if (infoPanelContent) {
            infoPanelContent.innerHTML = UITemplates.incidentDetails(incident);
            
            const closeBtn = document.getElementById('close-details-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', UIManager.showWelcomePanel);
            }
        }
        
        if (addReportBtn) {
            addReportBtn.classList.remove('hidden');
        }
    },

    // Show report form
    showReportForm: () => {
        AppState.currentView = 'form';
        const infoPanelContent = document.getElementById('info-panel-content');
        const addReportBtn = document.getElementById('add-report-btn');
        
        if (infoPanelContent) {
            infoPanelContent.innerHTML = UITemplates.reportForm();
            
            // Set today's date as default
            const fechaInput = document.getElementById('fecha_evento');
            if (fechaInput) {
                fechaInput.value = new Date().toISOString().split('T')[0];
            }
            
            // Setup form event listeners
            UIManager.setupReportForm();
        }
        
        if (addReportBtn) {
            addReportBtn.classList.add('hidden');
        }
        
        // Change cursor and enable map clicking
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.cursor = 'crosshair';
        }
        AppState.map.on('click', FormManager.onMapClick);
    },

    // Setup report form
    setupReportForm: () => {
        const cancelBtn = document.getElementById('cancel-form-btn');
        const reportForm = document.getElementById('report-form');
        const clearBtn = document.getElementById('clear-form');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', FormManager.cancelNewReport);
        }
        
        if (reportForm) {
            reportForm.addEventListener('submit', FormManager.handleFormSubmit);
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                reportForm.reset();
                const fechaInput = document.getElementById('fecha_evento');
                if (fechaInput) {
                    fechaInput.value = new Date().toISOString().split('T')[0];
                }
            });
        }
    },

    // Share incident
    shareIncident: async (title, text) => {
        const shareData = { title, text, url: window.location.href };
        
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                Utils.showNotification('Compartido exitosamente');
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(`${title} - ${text} ${window.location.href}`);
            Utils.showNotification('Información copiada al portapapeles');
        }
    }
};

// Export for use in other files
window.UITemplates = UITemplates;
window.UIManager = UIManager;