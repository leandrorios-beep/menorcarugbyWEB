/**
 * Busca en las páginas llamadas a funciones que no existen.
 *
 * POR QUÉ
 *
 * El formulario de inscripción se rompió entero —"tarifas is not defined"— por
 * una llamada que quedó viva después de borrar la función. No lo cazó nadie: el
 * HTML no se compila, el navegador sólo revienta cuando llega a esa línea, y la
 * línea estaba dentro de la tarjeta de cada jugador, o sea después de que la
 * familia hubiera escrito todos sus datos. La página se moría ahí.
 *
 * POR QUÉ CON UN PARSER Y NO CON EXPRESIONES REGULARES
 *
 * La primera versión de esto buscaba `nombre(` con una expresión regular y daba
 * 103 avisos, de los cuales uno era de verdad: leía texto de los comentarios,
 * `rgba(...)` dentro de cadenas de CSS, y se desincronizaba con cualquier
 * expresión regular del código que llevara una comilla. Un validador que grita
 * siempre es un validador que nadie mira.
 *
 * Así que usa un parser de verdad. Este repo no tiene dependencias de
 * desarrollo —es HTML plano y funciones sueltas— así que toma prestado el de
 * TypeScript del repo de la app, que está al lado. Si no lo encuentra, NO avisa
 * de nada y lo dice: callarse es mejor que inventar.
 *
 *   node scripts/validar-paginas.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

const DONDE_BUSCAR_EL_PARSER = [
    path.join(RAIZ, 'node_modules', 'typescript'),
    path.join(RAIZ, '..', 'rugby-manager', 'rugby-manager', 'node_modules', 'typescript'),
];

function cargarParser() {
    for (const ruta of DONDE_BUSCAR_EL_PARSER) {
        try {
            return require(ruta);
        } catch (e) {
            /* seguimos buscando */
        }
    }
    return null;
}

const ts = cargarParser();
if (!ts) {
    console.log('No encontré un parser de JavaScript, así que no se valida nada.');
    console.log('Se buscó en:');
    DONDE_BUSCAR_EL_PARSER.forEach((r) => console.log(`   ${r}`));
    process.exit(0);
}

// Globales del navegador y del lenguaje. No hace falta que esté completa: lo
// que falte sale como aviso falso y se agrega acá.
const YA_EXISTEN = new Set([
    'String', 'Number', 'Boolean', 'Array', 'Object', 'Date', 'Math', 'JSON', 'RegExp',
    'Error', 'TypeError', 'RangeError', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
    'Symbol', 'BigInt', 'Function', 'Intl', 'Proxy', 'Reflect', 'parseInt', 'parseFloat',
    'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI',
    'decodeURI', 'structuredClone', 'queueMicrotask', 'eval',
    'Uint8Array', 'Uint16Array', 'Int8Array', 'Float32Array', 'ArrayBuffer', 'DataView',
    'alert', 'confirm', 'prompt', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval',
    'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback',
    'console', 'document', 'window', 'globalThis', 'localStorage', 'sessionStorage',
    'navigator', 'location', 'history', 'screen', 'FormData', 'Blob', 'File', 'FileReader',
    'Image', 'Audio', 'URL', 'URLSearchParams', 'CustomEvent', 'Event', 'MessageChannel',
    'atob', 'btoa', 'AbortController', 'IntersectionObserver', 'MutationObserver',
    'ResizeObserver', 'getComputedStyle', 'matchMedia', 'scrollTo', 'scrollBy',
    'TextEncoder', 'TextDecoder', 'crypto', 'performance', 'open', 'close', 'print',
    'postMessage', 'Notification', 'XMLHttpRequest', 'WebSocket', 'Worker',
    // Librerías que entran por <script src> de un CDN
    'gtag', 'dataLayer', 'Chart', 'Swiper', 'AOS', 'emailjs', 'Stripe', 'html2canvas',
    'jsPDF', 'QRCode', 'Sortable', 'bootstrap', 'jQuery', '$',
]);

/**
 * Recorre el árbol y saca: qué nombres quedan definidos y qué nombres se llaman.
 *
 * Definido es cualquier cosa que cree una atadura —una función, una variable,
 * un parámetro, lo que se saque de una desestructuración— y también
 * `window.loQueSea = ...`, que es como se exponen varias de estas páginas.
 */
function analizar(codigo, nombreDelArchivo) {
    const fuente = ts.createSourceFile(
        nombreDelArchivo,
        codigo,
        ts.ScriptTarget.ES2020,
        true,
        ts.ScriptKind.JS
    );

    const definidos = new Set();
    const llamados = new Map(); // nombre -> línea (1 = primera del bloque)

    const anotarAtadura = (nodo) => {
        if (!nodo) return;
        if (ts.isIdentifier(nodo)) {
            definidos.add(nodo.text);
            return;
        }
        // const { a, b: c } = ... / const [x, y] = ...
        if (ts.isObjectBindingPattern(nodo) || ts.isArrayBindingPattern(nodo)) {
            for (const el of nodo.elements) {
                if (ts.isBindingElement(el)) anotarAtadura(el.name);
            }
        }
    };

    const recorrer = (nodo) => {
        if (ts.isFunctionDeclaration(nodo) || ts.isClassDeclaration(nodo)) {
            if (nodo.name) definidos.add(nodo.name.text);
        }
        if (ts.isVariableDeclaration(nodo) || ts.isParameter(nodo) || ts.isBindingElement(nodo)) {
            anotarAtadura(nodo.name);
        }
        if (ts.isCatchClause(nodo) && nodo.variableDeclaration) {
            anotarAtadura(nodo.variableDeclaration.name);
        }
        if (ts.isFunctionExpression(nodo) && nodo.name) definidos.add(nodo.name.text);

        // window.algo = ... deja `algo` disponible como global
        if (
            ts.isBinaryExpression(nodo) &&
            nodo.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isPropertyAccessExpression(nodo.left) &&
            ts.isIdentifier(nodo.left.expression) &&
            (nodo.left.expression.text === 'window' || nodo.left.expression.text === 'globalThis')
        ) {
            definidos.add(nodo.left.name.text);
        }

        // La llamada: sólo `nombre(...)`, no `algo.nombre(...)`
        if (ts.isCallExpression(nodo) && ts.isIdentifier(nodo.expression)) {
            const nombre = nodo.expression.text;
            if (!llamados.has(nombre)) {
                const pos = fuente.getLineAndCharacterOfPosition(nodo.expression.getStart(fuente));
                llamados.set(nombre, pos.line + 1);
            }
        }

        ts.forEachChild(nodo, recorrer);
    };

    recorrer(fuente);
    return { definidos, llamados };
}

function bloquesDeScript(html) {
    const bloques = [];
    const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html))) {
        if (/type\s*=\s*["'][^"']*json/i.test(m[1])) continue; // JSON-LD: son datos
        bloques.push({
            codigo: m[2],
            desde: html.slice(0, m.index).split('\n').length,
        });
    }
    return bloques;
}

/** Los <script src="js/..."> de la propia web: sus funciones son globales. */
function deLosScriptsDeLaPagina(html, pagina) {
    const nombres = new Set();
    const re = /<script[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
        if (/^https?:/i.test(m[1])) continue; // un CDN: va en YA_EXISTEN
        const ruta = path.join(RAIZ, m[1].replace(/^\//, '').split('?')[0]);
        if (!fs.existsSync(ruta)) continue;
        const { definidos } = analizar(fs.readFileSync(ruta, 'utf8'), `${pagina}:${m[1]}`);
        for (const n of definidos) nombres.add(n);
    }
    return nombres;
}

const paginas = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html'));
let problemas = 0;
let revisadas = 0;

for (const pagina of paginas) {
    const html = fs.readFileSync(path.join(RAIZ, pagina), 'utf8');
    const bloques = bloquesDeScript(html);
    if (!bloques.length) continue;
    revisadas += 1;

    const analisis = bloques.map((b) => ({ ...b, ...analizar(b.codigo, pagina) }));

    // Una función declarada en un bloque se puede llamar desde otro.
    const hay = new Set(YA_EXISTEN);
    for (const a of analisis) for (const n of a.definidos) hay.add(n);
    for (const n of deLosScriptsDeLaPagina(html, pagina)) hay.add(n);

    for (const a of analisis) {
        for (const [nombre, linea] of a.llamados) {
            if (hay.has(nombre)) continue;
            console.error(`${pagina}:${a.desde + linea - 1}  llama a "${nombre}()" y no existe`);
            problemas += 1;
        }
    }
}

if (problemas) {
    console.error(`\n${problemas} llamada(s) a funciones que no existen. La página revienta al llegar ahí.`);
    process.exit(1);
}
console.log(`${revisadas} páginas revisadas: ninguna llama a una función que no exista.`);
