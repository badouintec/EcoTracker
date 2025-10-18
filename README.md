# HydroFlujo

Una aplicación web interactiva para el monitoreo y gestión del agua en Hermosillo. Permite el registro de incidencias hídricas, visualización en tiempo real mediante mapas interactivos y análisis predictivo para prevenir problemas como inundaciones y fallas de drenaje.

## 🚀 Características

- **Mapa Interactivo**: Visualización georreferenciada de incidencias hídricas con múltiples capas (OpenStreetMap y satelital)
- **Sistema de Registro**: Formulario intuitivo para reportar incidencias con validación en tiempo real
- **Analytics**: Gráficos y estadísticas de tendencias y patrones de datos
- **Responsive Design**: Optimizado para dispositivos móviles y desktop
- **PWA Ready**: Soporte para instalación como aplicación progresiva
- **Exportación de Datos**: Funcionalidad para exportar datos en múltiples formatos

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Estilos**: Tailwind CSS + CSS custom properties
- **Mapas**: Leaflet.js v1.9.4
- **Gráficos**: Chart.js
- **Iconos**: Font Awesome 6.5.1
- **Tipografía**: Google Fonts (Inter, Poppins)

## 📁 Estructura del Proyecto

```
HydroFlujo/
├── index.html                 # Página principal
├── assets/
│   ├── css/
│   │   └── styles.css         # Estilos principales
│   ├── js/
│   │   ├── app.js            # Lógica core y state management
│   │   ├── ui.js             # Templates y gestión de UI
│   │   ├── forms.js          # Validación y manejo de formularios
│   │   └── main.js           # Inicialización de la aplicación
│   └── data/
│       └── incidents.json    # Datos de ejemplo
├── README.md
└── LICENSE
```

## 🚀 Instalación y Uso

### Opción 1: GitHub Pages (Recomendado)
1. Fork este repositorio
2. Ve a Settings → Pages
3. Selecciona "Deploy from a branch" → main
4. La aplicación estará disponible en `https://tu-usuario.github.io/HydroFlujo`

### Opción 2: Servidor Local
```bash
# Clona el repositorio
git clone https://github.com/tu-usuario/HydroFlujo.git
cd HydroFlujo

# Sirve con cualquier servidor HTTP estático
python -m http.server 8000
# o
npx serve .

# Abre http://localhost:8000
```

## 📱 Funcionalidades

### Registro de Incidencias
- Selección de ubicación mediante click en el mapa
- Formulario con validación en tiempo real
- Auto-guardado de datos
- Categorización por tipo de incidencia

### Visualización
- Mapa interactivo con clustering de marcadores
- Múltiples capas de visualización
- Filtros por fecha y tipo
- Vista satelital y callejero

### Analytics
- Gráficos de tendencias temporales
- Estadísticas por categoría
- Exportación de reportes
- Predicciones básicas

## 🔧 Configuración

La aplicación incluye configuración mediante variables CSS y constantes JavaScript:

```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #1e40af;
  /* Más variables en assets/css/styles.css */
}
```

```javascript
// Configuración del mapa en assets/js/app.js
const MAP_CONFIG = {
  center: [29.0892, -110.9617], // Hermosillo
  zoom: 11,
  maxZoom: 19
};
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ve el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Créditos

- Desarrollado para la gestión hídrica de Hermosillo, Sonora
- Mapas proporcionados por OpenStreetMap
- Iconografía por Font Awesome
