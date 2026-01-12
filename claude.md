# Menorca Rugby Club - Web Oficial
## Documento de Trabajo - Estado del Proyecto

**Fecha:** 12 de enero de 2026
**Última actualización:** Todo funcionando correctamente
**Producción:** https://web-3isfniu9d-menorca-rugby.vercel.app
**Sitio oficial:** https://www.menorcarugbyclub.com

---

## ✅ Estado Actual: TODO FUNCIONANDO

El sitio web está completamente operativo y todos los sistemas funcionan correctamente.

---

## 🎯 Funcionalidades Implementadas

### Sistema de Calendario
- ✅ Vista de calendario mensual (grid)
- ✅ Vista de lista de partidos
- ✅ Filtros por categoría (SENIOR, FEMENINO, SUB18, SUB16, SUB14, SUB12, SUB10, SUB8, SUB6)
- ✅ Navegación entre meses
- ✅ Banner de próximos partidos en home
- ✅ Responsive mobile/desktop
- ✅ Cálculo correcto de días hasta el próximo partido

### Internacionalización (i18n)
- ✅ 6 idiomas soportados: Español, Catalán, Inglés, Francés, Italiano, Portugués
- ✅ Detección automática del navegador
- ✅ Persistencia en localStorage

### Integración de APIs
- ✅ API de calendario: https://app.menorcarugbyclub.com/api/public/calendar
- ✅ Sistema de caché (5 minutos)
- ✅ Manejo de errores

### Chat Inteligente
- ✅ Integración con smartChatweb: https://smartchatweb-pi.vercel.app/
- ✅ Iframe modal para chat

---

## 📋 Últimos Cambios (12 enero 2026)

### Commit: `ebfc673` - Eliminación de números de teléfono
- Removidos números de teléfono del footer en todas las páginas
- Limpiado WhatsApp del archivo de configuración `data/external-urls.txt`
- Actualizado schema.org en index.html

**Archivos modificados:**
- `calendar.html` - Footer sin teléfono
- `calendar2.html` - Footer sin teléfono
- `index.html` - Footer y schema.org sin teléfono
- `supportus.html` - Footer sin teléfono
- `data/external-urls.txt` - WhatsApp vacío

---

## 🔧 Arquitectura Técnica

### API del Calendario

**Endpoint:** `https://app.menorcarugbyclub.com/api/public/calendar`

**Categorías soportadas:**
```javascript
['SENIOR', 'FEMENINO', 'SUB18', 'SUB16', 'SUB14', 'SUB12', 'SUB10', 'SUB8', 'SUB6']
```

**Parámetros opcionales:**
- `?category=SUB14` - Filtrar por categoría
- `?from=2025-10-01&to=2025-10-31` - Rango de fechas
- `?limit=5` - Limitar resultados

**Estructura de respuesta:**
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

### Componentes del Calendario

**Archivo principal:** `js/calendar.js`

**Objeto MatchesCalendar:**
- `init()` - Inicialización con delay de 500ms para i18n
- `loadMatches(month)` - Carga mes específico
- `loadAllMatches()` - Carga todos (para banner y lista)
- `renderCalendar()` - Decisión grid/list según vista
- `renderCalendarGrid()` - Vista calendario mensual
- `renderMatchesList()` - Vista lista completa
- `renderUpcomingBanner()` - Banner de próximos partidos en home
- `changeMonth(direction)` - Navegación entre meses
- `setupEventListeners()` - Registro de eventos

---

## 🎨 Diseño

### Colores del Sistema
```css
--navy: #182B49
--yellow: #FFC72C
--white: #FFFFFF
```

### Colores por Categoría
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

## 📁 Estructura del Proyecto

```
web/
├── calendar.html           # Página de calendario
├── calendar2.html          # Versión alternativa de calendario
├── index.html              # Home con banner de próximos partidos
├── supportus.html          # Página de donaciones
├── css/
│   └── styles.css          # Estilos globales
├── js/
│   ├── calendar.js         # Lógica del calendario
│   ├── i18n.js             # Sistema de traducción
│   ├── main.js             # JavaScript principal
│   ├── config-loader.js    # Carga de configuración
│   └── config-loader-backup.js
├── lang/
│   ├── es.json             # Español
│   ├── ca.json             # Catalán
│   ├── en.json             # Inglés
│   ├── fr.json             # Francés
│   ├── it.json             # Italiano
│   └── pt.json             # Portugués
├── data/
│   └── external-urls.txt   # URLs y configuración externa
├── assets/
│   └── images/
│       └── static/
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
- **Producción actual:** https://web-3isfniu9d-menorca-rugby.vercel.app
- **Sitio oficial:** https://www.menorcarugbyclub.com
- **API calendario:** https://app.menorcarugbyclub.com/api/public/calendar
- **Chat:** https://smartchatweb-pi.vercel.app/

### Vercel Deploy
- ✅ Desplegado en team "menorca-rugby"
- ✅ Deploy automático desde Git
- ✅ HTML estático (sin build command)

---

## 💡 Notas Importantes

1. **Sistema de idiomas**
   - Detección automática del navegador
   - No requiere selector visual
   - Almacena preferencia en localStorage

2. **Caché de API**
   - Duración: 5 minutos
   - Se limpia automáticamente
   - Reduce llamadas innecesarias

3. **Chat inteligente**
   - Proyecto separado: `G:\Mi unidad\no tocar\smartChatweb`
   - Se abre en iframe modal desde el sitio web
   - URL configurada en `js/main.js` y `js/config-loader.js`

4. **Información de contacto**
   - Email: hola@menorcarugbyclub.com
   - Dirección: Carrer d'Artrutx, 4, 07714 Maó, Illes Balears
   - Los teléfonos han sido removidos de todos los footers

---

## 📞 Recursos

- **API Docs:** https://app.menorcarugbyclub.com/api/public/docs
- **Vercel Dashboard:** https://vercel.com/menorca-rugby/web
- **Repositorio Git:** github.com/leandrorios-beep/menorcarugbyWEB.git

---

*Última actualización: 12 de enero de 2026*
*Estado: ✅ TODO FUNCIONANDO CORRECTAMENTE*
