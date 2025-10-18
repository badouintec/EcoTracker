/*
 * HydroFlujo - Form Management
 * Gestión de formularios e interacciones de mapa
 */

// ==========================================================================
// Form Manager
// ==========================================================================

const FormManager = {
    tempMarker: null,

    // Handle map click for new reports
    onMapClick: (e) => {
        if (FormManager.tempMarker) {
            AppState.map.removeLayer(FormManager.tempMarker);
        }
        
        const { lat, lng } = e.latlng;
        
        const latInput = document.getElementById('lat');
        const lonInput = document.getElementById('lon');
        
        if (latInput && lonInput) {
            latInput.value = lat.toFixed(6);
            lonInput.value = lng.toFixed(6);
        }
        
        FormManager.tempMarker = L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(AppState.map)
          .bindPopup('<b>📍 Ubicación del nuevo reporte</b><br>Completa el formulario para guardar')
          .openPopup();
    },

    // Cancel new report
    cancelNewReport: () => {
        if (FormManager.tempMarker) {
            AppState.map.removeLayer(FormManager.tempMarker);
            FormManager.tempMarker = null;
        }
        AppState.map.off('click', FormManager.onMapClick);
        
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.cursor = '';
        }
        
        UIManager.showWelcomePanel();
    },

    // Handle form submission
    handleFormSubmit: async (e) => {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(e.target);
            
            // Validate required fields
            if (!formData.get('lat') || !formData.get('lon')) {
                throw new Error('Por favor, selecciona una ubicación en el mapa haciendo clic.');
            }

            if (!formData.get('titulo')) {
                throw new Error('El título del evento es requerido.');
            }

            if (!formData.get('fecha_evento')) {
                throw new Error('La fecha del evento es requerida.');
            }

            if (!formData.get('gravedad')) {
                throw new Error('El nivel de gravedad es requerido.');
            }

            if (!formData.get('afectaciones')) {
                throw new Error('La descripción de afectaciones es requerida.');
            }

            // Validate URL if provided
            const urlNoticia = formData.get('url_noticia');
            if (urlNoticia && !FormManager.isValidURL(urlNoticia)) {
                throw new Error('La URL de la noticia no es válida.');
            }

            // Create new incident object
            const newIncident = Object.fromEntries(formData.entries());
            newIncident.id = Utils.generateId();
            newIncident.lat = parseFloat(newIncident.lat);
            newIncident.lon = parseFloat(newIncident.lon);
            newIncident.mm_lluvia = newIncident.mm_lluvia || null;
            newIncident.direccion = newIncident.direccion || 'No especificada';
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Add to data
            DataManager.addIncident(newIncident);
            
            // Clean up form state
            FormManager.cancelNewReport();
            
            // Show incident details and center map
            UIManager.displayIncidentDetails(newIncident);
            AppState.map.setView([newIncident.lat, newIncident.lon], 15);
            
            Utils.showNotification('Reporte guardado exitosamente', 'success');
            
        } catch (error) {
            Utils.showNotification(error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    },

    // Validate URL
    isValidURL: (string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },

    // Get form validation rules
    getValidationRules: () => ({
        titulo: {
            required: true,
            minLength: 5,
            maxLength: 100
        },
        fecha_evento: {
            required: true,
            type: 'date'
        },
        colonia: {
            maxLength: 50
        },
        direccion: {
            maxLength: 100
        },
        gravedad: {
            required: true,
            enum: ['bajo', 'medio', 'alto']
        },
        afectaciones: {
            required: true,
            minLength: 10,
            maxLength: 500
        },
        mm_lluvia: {
            type: 'number',
            min: 0,
            max: 1000
        },
        url_noticia: {
            type: 'url'
        }
    }),

    // Real-time form validation
    setupFormValidation: () => {
        const form = document.getElementById('report-form');
        if (!form) return;

        const rules = FormManager.getValidationRules();
        
        Object.keys(rules).forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (!field) return;

            field.addEventListener('blur', () => {
                FormManager.validateField(field, rules[fieldName]);
            });

            field.addEventListener('input', () => {
                FormManager.clearFieldError(field);
            });
        });
    },

    // Validate individual field
    validateField: (field, rules) => {
        const value = field.value.trim();
        const fieldName = field.getAttribute('name');
        
        // Clear previous errors
        FormManager.clearFieldError(field);

        // Check required
        if (rules.required && !value) {
            FormManager.showFieldError(field, 'Este campo es requerido');
            return false;
        }

        // Check minLength
        if (rules.minLength && value.length < rules.minLength) {
            FormManager.showFieldError(field, `Mínimo ${rules.minLength} caracteres`);
            return false;
        }

        // Check maxLength
        if (rules.maxLength && value.length > rules.maxLength) {
            FormManager.showFieldError(field, `Máximo ${rules.maxLength} caracteres`);
            return false;
        }

        // Check type validations
        if (value && rules.type === 'url' && !FormManager.isValidURL(value)) {
            FormManager.showFieldError(field, 'URL no válida');
            return false;
        }

        if (value && rules.type === 'number') {
            const num = parseFloat(value);
            if (isNaN(num)) {
                FormManager.showFieldError(field, 'Debe ser un número válido');
                return false;
            }
            if (rules.min !== undefined && num < rules.min) {
                FormManager.showFieldError(field, `Valor mínimo: ${rules.min}`);
                return false;
            }
            if (rules.max !== undefined && num > rules.max) {
                FormManager.showFieldError(field, `Valor máximo: ${rules.max}`);
                return false;
            }
        }

        // Check enum
        if (rules.enum && !rules.enum.includes(value)) {
            FormManager.showFieldError(field, 'Valor no válido');
            return false;
        }

        return true;
    },

    // Show field error
    showFieldError: (field, message) => {
        field.classList.add('border-red-500');
        
        // Remove existing error
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error text-red-500 text-xs mt-1';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    },

    // Clear field error
    clearFieldError: (field) => {
        field.classList.remove('border-red-500');
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    },

    // Auto-save form data to localStorage
    autoSaveForm: () => {
        const form = document.getElementById('report-form');
        if (!form) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Don't save coordinates (they should be set fresh each time)
        delete data.lat;
        delete data.lon;

        localStorage.setItem('hydroflujo_form_draft', JSON.stringify(data));
    },

    // Restore form data from localStorage
    restoreFormDraft: () => {
        const draft = localStorage.getItem('hydroflujo_form_draft');
        if (!draft) return;

        try {
            const data = JSON.parse(draft);
            
            Object.keys(data).forEach(key => {
                const field = document.getElementById(key);
                if (field && data[key]) {
                    field.value = data[key];
                }
            });

            Utils.showNotification('Borrador restaurado', 'info', 2000);
        } catch (error) {
            console.error('Error restoring form draft:', error);
        }
    },

    // Clear form draft
    clearFormDraft: () => {
        localStorage.removeItem('hydroflujo_form_draft');
    },

    // Setup auto-save functionality
    setupAutoSave: () => {
        const form = document.getElementById('report-form');
        if (!form) return;

        // Auto-save on input change (debounced)
        const autoSave = Utils.debounce(FormManager.autoSaveForm, 1000);
        
        form.addEventListener('input', autoSave);
        form.addEventListener('change', autoSave);

        // Restore draft on load
        FormManager.restoreFormDraft();

        // Clear draft on successful submission
        form.addEventListener('submit', () => {
            setTimeout(() => {
                if (AppState.currentView !== 'form') {
                    FormManager.clearFormDraft();
                }
            }, 2000);
        });
    }
};

// Export for use in other files
window.FormManager = FormManager;