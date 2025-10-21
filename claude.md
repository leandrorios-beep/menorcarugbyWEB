# Menorca Rugby Club - Calendario de Partidos
## Documento de Trabajo - Estado del Proyecto

**Fecha:** 14 de octubre de 2025
**Versión desplegada:** https://web-gxzsxeez1-leandro-rios-projects.vercel.app/calendar.html
**Producción oficial:** https://www.menorcarugbyclub.com/calendar.html

---

## 📋 Estado Actual

### ✅ Problemas Resueltos

1. **Cálculo de días hasta el próximo partido**
   - Problema: Calculaba mal los días (timezone issues)
   - Solución: Parseo correcto de fechas con `'T00:00:00'` y `Math.floor()` en lugar de `Math.ceil()`
   - Archivo: `js/calendar.js` líneas 795-820

2. **Banderas rotas en calendar.html**
   - Problema: Imágenes de banderas no existían, aparecían rotas
   - Solución: Eliminé el selector de idiomas visual (el sistema i18n detecta automáticamente)
   - Archivo: `calendar.html` líneas 48-53

3. **Categorías incorrectas**
   - Problema: Faltaban SUB10, SUB8, SUB6 y había que mantener FEMENINO
   - Solución: Actualizada lista completa de categorías
   - Archivos: `calendar.html` líneas 89-120, `js/calendar.js` línea 804

4. **Contraste de botones mejorado**
   - Botón banner "Ver Calendario": Blanco sobre azul (mejor contraste)
   - Filtros activos: Fondo amarillo con texto navy (en lugar de navy/blanco)
   - Toggle Calendario/Lista: Bordes visibles en ambos estados
   - Archivo: `css/styles.css` líneas 3710-3722, 4353-4385

5. **Vista de lista simplificada**
   - Reducido padding y margins en match-cards
   - Fuentes más pequeñas (0.95rem → 0.85rem)
   - Borders más finos (2px → 1px)
   - Archivo: `css/styles.css` líneas 3984-4110

6. **Navbar desplazado en calendar.html**
   - Problema: Faltaba `<div class="nav-container">`
   - Solución: Estructura igual a index.html
   - Archivo: `calendar.html` líneas 31-54

---

## ❌ Problemas Pendientes (CRÍTICOS)

### 1. **Las vistas no cargan correctamente**
   - **Síntoma:** El calendario no muestra los partidos
   - **Posibles causas:**
     - API no está respondiendo correctamente
     - JavaScript no está ejecutándose
     - Elementos del DOM no se están encontrando
   - **Debug:** Logs agregados en `js/calendar.js` líneas 42-72, 306-337
   - **Verificar en consola (F12):**
     ```
     🚀 DOM Content Loaded
     🔍 Calendar Grid exists: true/false
     📅 CALENDAR: API Response
     ```

### 2. **Navegación entre meses**
   - **Síntoma:** Botones de navegación no funcionan
   - **Código relevante:** `js/calendar.js` líneas 130-142
   - **Event listeners:** `js/calendar.js` líneas 74-86
   - **Estado:** Se creó nueva instancia de Date() para evitar mutaciones

### 3. **Scroll horizontal en mobile**
   - Cambiado de flexbox a grid responsive
   - Verificar si sigue ocurriendo en mobile

### 4. **Botón "Próximos Partidos" en hero**
   - Agregado pero falta verificar funcionamiento
   - Archivo: `index.html` línea 180-183

---

## 🔧 Cambios Técnicos Realizados

### API Integration
```javascript
// Endpoint principal
apiUrl: 'https://app.menorcarugbyclub.com/api/public/calendar'

// Categorías soportadas
['SENIOR', 'FEMENINO', 'SUB18', 'SUB16', 'SUB14', 'SUB12', 'SUB10', 'SUB8', 'SUB6']

// Parámetros opcionales
?category=SUB14
?from=2025-10-01&to=2025-10-31
?limit=5
```

### Estructura de Respuesta API
```json
{
  "success": true,
  "count": 5,
  "matches": [
    {
      "id": "M-1760291264566-1",
      "date": "2025-10-25",
      "time": "12:00",
      "category": "SUB14",
      "competition_type": "Rugby X",
      "opponent": "Bocs",
      "is_home": true,
      "location": "Campo de Menorca Rugby Club",
      "status": "confirmed"
    }
  ]
}
```

### Archivos Modificados

1. **calendar.html**
   - Eliminado selector de idiomas con banderas
   - Corregida estructura del navbar (agregado nav-container)
   - Agregadas todas las categorías (SUB6, SUB8, SUB10)

2. **js/calendar.js**
   - Arreglado cálculo de días (líneas 795-820)
   - Agregados logs de debug extensivos
   - Corregida navegación entre meses (líneas 130-142)
   - Logs en init(), renderCalendar(), loadMatches()

3. **css/styles.css**
   - Simplificada vista de lista (match-cards más compactos)
   - Mejorado contraste de botones activos
   - Filter chips con fondo amarillo cuando activos
   - View toggle con bordes visibles

4. **index.html**
   - Agregado botón "Próximos Partidos" en hero
   - Banner de próximos partidos con grid responsive

5. **lang/*.json (es, ca, en, fr, it, pt)**
   - Agregada traducción `hero.upcoming_matches`

---

## 🎨 Diseño y UX

### Colores del Sistema
```css
--navy: #182B49
--yellow: #FFC72C
--white: #FFFFFF
```

### Categorías y Colores
```css
.category-senior { background: #182B49; }     /* Navy */
.category-femenino { background: #d946ef; }   /* Pink/Magenta */
.category-sub18 { background: #2563eb; }      /* Blue */
.category-sub16 { background: #7c3aed; }      /* Purple */
.category-sub14 { background: #dc2626; }      /* Red */
.category-sub12 { background: #ea580c; }      /* Orange */
.category-sub10 { background: #16a34a; }      /* Green */
.category-sub8 { background: #0891b2; }       /* Cyan */
.category-sub6 { background: #a855f7; }       /* Light Purple */
```

### Responsive Breakpoints
- Desktop: > 768px
- Mobile: ≤ 768px
- Small mobile: ≤ 480px

---

## 🐛 Debugging

### Para identificar problemas en calendar.html:

1. **Abrir consola del navegador** (F12 → Console)

2. **Logs a buscar:**
   ```
   🚀 DOM Content Loaded - Calendar page
   📍 Current URL: ...
   🔍 Calendar Grid exists: true/false
   🔍 Upcoming Banner exists: true/false
   ⏰ Starting calendar initialization after timeout
   📅 CALENDAR: Initializing...
   📅 CALENDAR: Elements found - upcomingBanner: ... calendarGrid: ...
   📅 CALENDAR: API Response: {...}
   📅 CALENDAR: Loaded X matches
   ```

3. **Errores comunes:**
   - ❌ CALENDAR: Grid element not found
   - ❌ Error loading matches
   - HTTP error! status: XXX
   - CORS errors

4. **Verificar API manualmente:**
   ```bash
   curl "https://app.menorcarugbyclub.com/api/public/calendar?limit=5"
   ```

---

## 📁 Estructura de Archivos

```
web/
├── calendar.html           # Página de calendario (PROBLEMA ACTUAL)
├── index.html              # Home con banner de próximos partidos
├── css/
│   └── styles.css          # Estilos globales
├── js/
│   ├── calendar.js         # Lógica del calendario (LOGS AGREGADOS)
│   ├── i18n.js             # Sistema de traducción
│   ├── main.js             # JavaScript principal
│   └── config-loader.js    # Carga de configuración
├── lang/
│   ├── es.json             # Español
│   ├── ca.json             # Catalán
│   ├── en.json             # Inglés
│   ├── fr.json             # Francés
│   ├── it.json             # Italiano
│   └── pt.json             # Portugués
├── assets/
│   └── images/
│       └── static/
│           ├── logo.png
│           └── ...
└── vercel.json             # Configuración de Vercel
```

---

## 🚀 Deploy

### Comando de despliegue
```bash
cd "G:\Mi unidad\no tocar\web"
vercel --prod
```

### URLs
- **Desarrollo actual:** https://web-gxzsxeez1-leandro-rios-projects.vercel.app
- **Producción oficial:** https://www.menorcarugbyclub.com
- **API:** https://app.menorcarugbyclub.com/api/public/calendar

### Problema con el team de Vercel
- Actualmente desplegado en cuenta personal (leandro-rios-projects)
- Necesita ser desplegado en team "menorca-rugby"
- Error: "You do not have permission to access scope menorca-rugby"

---

## 📝 Próximos Pasos

### ALTA PRIORIDAD

1. **Diagnosticar por qué no carga el calendario**
   - Abrir calendar.html en navegador
   - Revisar consola (F12) y buscar errores
   - Verificar que la API responde correctamente
   - Revisar Network tab para ver requests

2. **Arreglar las vistas**
   - Vista de calendario (grid mensual)
   - Vista de lista (todos los partidos)
   - Responsive en mobile

3. **Verificar navegación entre meses**
   - Probar botones < y >
   - Verificar que cambia el mes y carga nuevos datos

4. **Testing de funcionalidades**
   - Filtros por categoría
   - Toggle Calendario/Lista
   - Upcoming matches banner en home

### MEDIA PRIORIDAD

5. **Optimizar rendimiento**
   - Caché funciona correctamente (5 min)
   - Lazy loading de imágenes si es necesario

6. **UI/UX mejorado**
   - Animaciones suaves
   - Loading states más claros
   - Error states informativos

7. **Mobile optimization**
   - Verificar todos los breakpoints
   - Touch interactions
   - Scroll behavior

### BAJA PRIORIDAD

8. **Documentación**
   - Comentar código complejo
   - Actualizar README si existe

9. **SEO**
   - Meta tags para calendar.html
   - Structured data para eventos

---

## 💡 Notas Importantes

1. **Fecha actual del proyecto:** Octubre 2025 (no 2024)

2. **API siempre tiene datos en 2025:**
   - Próximo partido SUB14 vs Bocs: 25 de octubre de 2025
   - No hay partidos en 2024

3. **Sistema de idiomas:**
   - Detección automática del navegador
   - No requiere selector visual
   - Almacena preferencia en localStorage

4. **Caché de API:**
   - 5 minutos de duración
   - Se limpia automáticamente
   - Reduce llamadas innecesarias

5. **Vercel deployment:**
   - Build automático desde Git
   - Sin build command (HTML estático)
   - Redirects configurados en vercel.json

---

## 🔍 Investigación Pendiente

### Preguntas a resolver:
1. ¿Por qué el calendario no renderiza en producción?
2. ¿Los event listeners se están registrando correctamente?
3. ¿La API tiene CORS configurado correctamente?
4. ¿El timeout de 500ms es suficiente para i18n?
5. ¿Los estilos CSS se están aplicando correctamente?

### Tests a realizar:
- [ ] Probar en diferentes navegadores (Chrome, Firefox, Safari)
- [ ] Verificar en mobile real (no solo DevTools)
- [ ] Testear con conexión lenta
- [ ] Verificar comportamiento sin JavaScript
- [ ] Probar todos los filtros de categoría

---

## 📞 Contacto y Recursos

- **Documentación API:** https://app.menorcarugbyclub.com/api/public/docs
- **Repositorio:** (Agregar URL del repo Git si existe)
- **Vercel Dashboard:** https://vercel.com/dashboard

---

## 🏗️ Arquitectura del Calendario

### Flujo de Datos
```
1. DOM Load
   ↓
2. Init calendar.js (500ms delay para i18n)
   ↓
3. Detectar página (home vs calendar)
   ↓
4. Home: loadAllMatches() → renderUpcomingBanner()
   Calendar: loadMatches(month) → renderCalendar()
   ↓
5. Fetch API con cache check
   ↓
6. Render según vista (grid/list) y device (desktop/mobile)
```

### Componentes Principales

**MatchesCalendar Object:**
- `init()` - Inicialización
- `loadMatches()` - Carga mes específico
- `loadAllMatches()` - Carga todos (para banner y lista)
- `renderCalendar()` - Decisión grid/list
- `renderCalendarGrid()` - Vista calendario
- `renderMatchesList()` - Vista lista
- `renderUpcomingBanner()` - Banner de próximos
- `changeMonth(direction)` - Navegación
- `setupEventListeners()` - Registro de eventos

---

## 🎯 Objetivos del Calendario

### Funcionales
- ✅ Mostrar todos los partidos de todas las categorías
- ✅ Filtrar por categoría específica
- ✅ Navegación entre meses
- ⚠️ Vista de calendario mensual (NO FUNCIONA)
- ⚠️ Vista de lista completa (NO FUNCIONA)
- ✅ Banner de próximos partidos en home
- ✅ Responsive mobile/desktop

### No Funcionales
- ✅ Performance: Cache de 5 minutos
- ✅ Accesibilidad: Semantic HTML
- ⚠️ UX: Loading states (MEJORABLE)
- ⚠️ Error handling (MEJORABLE)
- ✅ i18n: 6 idiomas soportados

---

## 🔥 PROBLEMA CRÍTICO ACTUAL

**El calendario NO MUESTRA NADA en producción**

**Últimas acciones antes de pausar:**
1. ✅ Agregados logs extensivos de debug
2. ✅ Corregido navbar
3. ✅ Verificado CSS de botones
4. ✅ Desplegado con logs en: https://web-gxzsxeez1-leandro-rios-projects.vercel.app/calendar.html

**SIGUIENTE PASO OBLIGATORIO:**
Abrir la URL en navegador, abrir consola (F12) y revisar:
- ¿Qué logs aparecen?
- ¿Hay errores en rojo?
- ¿La API responde en Network tab?
- ¿Los elementos existen en el DOM?

**Con esa información podremos identificar el problema exacto.**

---

*Documento generado: 14 de octubre de 2025*
*Última actualización: Después de agregar logs de debug*
*Estado: PAUSA - Esperando diagnóstico de consola*
