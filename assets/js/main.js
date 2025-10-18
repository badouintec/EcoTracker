/*
 * HydroFlujo - Main Application
 * Inicialización y coordinación de la aplicación
 */

// ==========================================================================
// Application Initialization
// ==========================================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🌊 HydroFlujo iniciando...');

    // Hide loading screen after everything is ready
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                // Add fade-in animation to main content
                document.body.style.opacity = '0';
                document.body.style.transition = 'opacity 0.6s ease';
                setTimeout(() => document.body.style.opacity = '1', 100);
            }, 300);
        }, 1500);
    }

    // Initialize data (load CSV data)
    DataManager.loadCSVData();
    console.log('📊 Cargando datos desde CSV...');

    // Initialize map
    MapManager.initialize();
    console.log('🗺️ Mapa inicializado');

    // Initialize UI
    UIManager.initialize();
    console.log('🎨 Interfaz inicializada');

    // Setup main report button
    const addReportBtn = document.getElementById('add-report-btn');
    if (addReportBtn) {
        addReportBtn.addEventListener('click', () => {
            UIManager.showReportForm();
            // Setup form-specific functionality
            setTimeout(() => {
                FormManager.setupFormValidation();
                FormManager.setupAutoSave();
            }, 100);
        });
    }

    // Setup chart refresh buttons
    setupChartControls();

    // Setup time period selector
    const timePeriodSelect = document.getElementById('time-period');
    if (timePeriodSelect) {
        timePeriodSelect.addEventListener('change', ChartManager.updateTemporalChart);
    }

    // Initialize all incidents on map
    AppState.incidents.forEach(incident => {
        MapManager.addIncidentToMap(incident);
    });

    // Update charts and statistics
    ChartManager.updateCharts();
    Utils.updateStatsDisplays();
    
    // Setup periodic updates
    setupPeriodicUpdates();

    // Setup intersection observer for animations
    setupAnimationObserver();

    console.log('✅ HydroFlujo listo para usar');
});

// ==========================================================================
// Chart Controls Setup
// ==========================================================================

function setupChartControls() {
    // Severity chart refresh
    const refreshSeverity = document.getElementById('refresh-severity');
    if (refreshSeverity) {
        refreshSeverity.addEventListener('click', () => {
            const loading = document.getElementById('severity-loading');
            if (loading) loading.classList.remove('hidden');
            
            setTimeout(() => {
                ChartManager.updateSeverityChart();
                if (loading) loading.classList.add('hidden');
                Utils.showNotification('Gráfico actualizado');
            }, 500);
        });
    }

    // Colonia chart refresh
    const refreshColonia = document.getElementById('refresh-colonia');
    if (refreshColonia) {
        refreshColonia.addEventListener('click', () => {
            const loading = document.getElementById('colonia-loading');
            if (loading) loading.classList.remove('hidden');
            
            setTimeout(() => {
                ChartManager.updateColoniaChart();
                if (loading) loading.classList.add('hidden');
                Utils.showNotification('Gráfico actualizado');
            }, 500);
        });
    }

    // Temporal chart refresh
    const refreshTemporal = document.getElementById('refresh-temporal');
    if (refreshTemporal) {
        refreshTemporal.addEventListener('click', () => {
            const loading = document.getElementById('temporal-loading');
            if (loading) loading.classList.remove('hidden');
            
            setTimeout(() => {
                ChartManager.updateTemporalChart();
                if (loading) loading.classList.add('hidden');
                Utils.showNotification('Gráfico actualizado');
            }, 500);
        });
    }

    // Export chart buttons
    setupChartExports();
}

// ==========================================================================
// Chart Export Setup
// ==========================================================================

function setupChartExports() {
    const exportSeverity = document.getElementById('export-severity');
    if (exportSeverity) {
        exportSeverity.addEventListener('click', () => {
            exportChart('severityChart', 'reportes-por-gravedad.png');
        });
    }

    const exportColonia = document.getElementById('export-colonia');
    if (exportColonia) {
        exportColonia.addEventListener('click', () => {
            exportChart('coloniaChart', 'reportes-por-colonia.png');
        });
    }
}

function exportChart(chartId, filename) {
    const canvas = document.getElementById(chartId);
    if (canvas) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL();
        link.click();
        Utils.showNotification('Gráfico exportado exitosamente');
    }
}

// ==========================================================================
// Periodic Updates
// ==========================================================================

function setupPeriodicUpdates() {
    // Update timestamps every minute
    setInterval(() => {
        const lastUpdate = document.getElementById('last-update');
        if (lastUpdate) {
            lastUpdate.textContent = new Date().toLocaleTimeString('es-MX');
        }
        
        Utils.updateStatsDisplays();
    }, 60000);

    // Update charts every 5 minutes (in a real app, this might fetch new data)
    setInterval(() => {
        if (AppState.currentView !== 'form') {
            ChartManager.updateCharts();
            Utils.updateLegendCounts();
        }
    }, 300000);
}

// ==========================================================================
// Animation Observer
// ==========================================================================

function setupAnimationObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    // Observe elements that should animate in
    document.querySelectorAll('.card, .section-title, .section-subtitle').forEach(el => {
        observer.observe(el);
    });
}

// ==========================================================================
// Global Error Handling
// ==========================================================================

window.addEventListener('error', (event) => {
    console.error('Error global capturado:', event.error);
    Utils.showNotification('Ha ocurrido un error inesperado', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rechazada:', event.reason);
    Utils.showNotification('Error en operación asíncrona', 'error');
});

// ==========================================================================
// Service Worker Registration (for PWA capabilities)
// ==========================================================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registrado: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registro falló: ', registrationError);
            });
    });
}

// ==========================================================================
// Keyboard Shortcuts
// ==========================================================================

document.addEventListener('keydown', (event) => {
    // ESC key - close any open panel/form
    if (event.key === 'Escape') {
        if (AppState.currentView === 'form') {
            FormManager.cancelNewReport();
        } else if (AppState.currentView === 'details') {
            UIManager.showWelcomePanel();
        }
    }

    // Ctrl/Cmd + E - Export data
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) exportBtn.click();
    }

    // Ctrl/Cmd + N - New report
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        const addReportBtn = document.getElementById('add-report-btn');
        if (addReportBtn && !addReportBtn.classList.contains('hidden')) {
            addReportBtn.click();
        }
    }
});

// ==========================================================================
// Browser Compatibility Checks
// ==========================================================================

function checkBrowserCompatibility() {
    const features = {
        fetch: 'fetch' in window,
        geolocation: 'geolocation' in navigator,
        localStorage: 'localStorage' in window,
        canvas: 'getContext' in document.createElement('canvas')
    };

    const unsupported = Object.keys(features).filter(key => !features[key]);
    
    if (unsupported.length > 0) {
        console.warn('Características no soportadas:', unsupported);
        Utils.showNotification(
            'Algunas funciones pueden no estar disponibles en este navegador', 
            'warning', 
            5000
        );
    }
}

// Run compatibility check
checkBrowserCompatibility();

// ==========================================================================
// Performance Monitoring
// ==========================================================================

if (window.performance) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            const loadTime = perfData.loadEventEnd - perfData.fetchStart;
            console.log(`⚡ Tiempo de carga: ${loadTime}ms`);
            
            if (loadTime > 3000) {
                console.warn('⚠️ Tiempo de carga lento detectado');
            }
        }, 0);
    });
}