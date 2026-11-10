# 🏉 Menorca Rugby Club - Sistema Multiidioma y Noticias Dinámicas

## 🌍 **Sistema de Internacionalización**

### Idiomas Soportados
- **Español (es)** - Idioma por defecto
- **Catalán (ca)** - Català
- **Inglés (en)** - English
- **Francés (fr)** - Français
- **Italiano (it)** - Italiano
- **Portugués (pt)** - Português

### Detección Automática
El sistema detecta automáticamente el idioma del navegador del usuario y carga las traducciones correspondientes. Si el idioma no está soportado, usa español por defecto.

### Selector de Idioma
En la barra de navegación encontrarás un selector de idiomas con banderas que permite cambiar el idioma manualmente.

## 📰 **Sistema Dinámico de Noticias**

### Estructura de Carpetas
```
news/
├── partidos/
│   └── 2025-09-21-victoria-senior/
│       ├── titulo.txt
│       ├── noticia.txt
│       ├── fecha.txt
│       ├── categoria.txt
│       └── imagen.jpg
├── entrenamientos/
│   └── 2025-09-10-escuela-rugby/
│       ├── titulo.txt
│       ├── noticia.txt
│       ├── fecha.txt
│       ├── categoria.txt
│       └── imagen.jpg
├── eventos/
└── general/
```

### Cómo Añadir Noticias

1. **Crea una carpeta** en la categoría correspondiente con formato: `YYYY-MM-DD-slug`
2. **Añade los archivos requeridos:**
   - `titulo.txt` - Título de la noticia **en todos los idiomas**
   - `noticia.txt` - Contenido completo **en todos los idiomas**
   - `fecha.txt` - Fecha en formato YYYY-MM-DD
   - `categoria.txt` - Categoría **en todos los idiomas**
   - `imagen.jpg` - Imagen principal (opcional)
   - `destacado.txt` - Archivo vacío para marcar como destacada (opcional)

### Formato Multiidioma con Separadores

Cada archivo `.txt` puede contener todos los idiomas usando separadores `#ES`, `#EN`, `#CA`, `#FR`, `#IT`, `#PT`:

**titulo.txt:**
```
#ES
Victoria espectacular 28-14
#EN
Spectacular victory 28-14
#CA
Victòria espectacular 28-14
#FR
Victoire spectaculaire 28-14
#IT
Vittoria spettacolare 28-14
#PT
Vitória espetacular 28-14
```

**noticia.txt:**
```
#ES
El Menorca Rugby consiguió una victoria increíble...
#EN
Menorca Rugby achieved an incredible victory...
#CA
El Menorca Rugby va aconseguir una victòria increïble...
#FR
Menorca Rugby a remporté une victoire incroyable...
#IT
Il Menorca Rugby ha ottenuto una vittoria incredibile...
#PT
O Menorca Rugby conseguiu uma vitória incrível...
```

### Ejemplo de Noticia Completa
```
news/partidos/2025-10-15-nueva-victoria/
├── titulo.txt → Títulos en 6 idiomas con separadores #ES, #EN, etc.
├── noticia.txt → Contenido completo en 6 idiomas
├── fecha.txt → "2025-10-15"
├── categoria.txt → Categorías en 6 idiomas
├── imagen.jpg → Imagen principal
└── destacado.txt → (archivo vacío = noticia destacada)
```

### ⭐ Cómo Marcar una Noticia como Destacada

1. **Crea un archivo vacío** llamado `destacado.txt` en la carpeta de la noticia
2. **La noticia aparecerá** con el badge "★ Destacado" dorado y animado
3. **Solo hazlo** para noticias muy importantes

## 📁 **Estructura de Archivos**

```
menorca-rugby-club/
├── index.html                  # Página principal
├── css/
│   └── styles.css             # Estilos principales
├── js/
│   ├── i18n.js               # Sistema de internacionalización
│   ├── news-system.js        # Sistema dinámico de noticias
│   └── main.js               # Funcionalidades principales
├── lang/                     # Traducciones
│   ├── es.json              # Español
│   ├── ca.json              # Catalán
│   ├── en.json              # Inglés
│   ├── fr.json              # Francés
│   ├── it.json              # Italiano
│   └── pt.json              # Portugués
├── assets/
│   └── images/
│       ├── static/          # Logos, iconos
│       └── gallery/         # Fotos del club
├── news/                    # Sistema de noticias
│   ├── partidos/           # Noticias de partidos
│   ├── entrenamientos/     # Noticias de entrenamientos
│   ├── eventos/            # Eventos del club
│   └── general/            # Noticias generales
└── data/                   # Datos estructurados
```

## 🚀 **Características Principales**

### ✅ **Completadas**
- **Sistema multiidioma** con detección automática
- **6 idiomas completos** con todas las traducciones
- **Sistema dinámico de noticias** basado en carpetas
- **Estructura organizativa** de archivos
- **Galería responsive** sin subida de fotos
- **Tipografía moderna** (Space Grotesk + JetBrains Mono)
- **Tienda online** integrada
- **SEO multiidioma** optimizado

### 🎨 **Diseño**
- **Colores del club** mantenidos (#FFC72C amarillo, #182B49 azul marino)
- **Responsive design** completo
- **Animations suaves** y modernas
- **UI/UX optimizada** para múltiples idiomas

### 📱 **Mobile-First**
- **Navegación móvil** optimizada
- **Galería táctil** para móviles
- **Formularios adaptivos**

## 🛠️ **Administración**

### Actualizar Noticias
1. Crea la carpeta con el formato de fecha
2. Añade los archivos .txt requeridos
3. Opcionalmente añade imagen.jpg
4. La página se actualiza automáticamente

### Añadir Traducciones
1. Edita el archivo JSON del idioma en `/lang/`
2. Usa la estructura de claves existente
3. Las traducciones se aplican automáticamente

### Actualizar Galería
1. Añade imágenes a `/assets/images/gallery/`
2. Las imágenes aparecen automáticamente en la galería

## 🌐 **Soporte Técnico**

- **HTML5** semántico
- **CSS Grid/Flexbox** moderno
- **JavaScript ES6+** sin frameworks
- **Detección de idioma** nativa del navegador
- **LocalStorage** para preferencias de usuario
- **Lazy loading** para optimización

## 📞 **Contacto**

Para soporte técnico o dudas sobre el sistema:
- **Email**: info@menorcarugby.com

---

*Diseñado con ❤️ para la comunidad rugbística de Menorca*