/**
 * Escribe las seis páginas del Reglamento a partir de una sola estructura.
 *
 *     node scripts/generar-reglamento.js
 *
 * El marco —cabecera, navegación, pie— sale de reglamento.html, que sigue
 * siendo la página castellana y la que manda. El cuerpo sale de
 * lang/reglamento/<idioma>.js. Así el único sitio donde dos idiomas pueden
 * diferir es la redacción: la numeración de los apartados, los enlaces, los
 * correos y el ancla #imagenes son los mismos por construcción.
 *
 * Es idempotente: correrlo dos veces da el mismo resultado. Si hace falta
 * cambiar el marco (añadir un enlace al menú, por ejemplo), se cambia en
 * reglamento.html y se vuelve a correr esto.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const { VERSION, EN_VIGOR, IDIOMAS, APARTADOS } = require(path.join(RAIZ, 'lang/reglamento/_estructura.js'));

/** De la página castellana salen la cabecera y el pie que comparten las seis. */
function marco() {
  const html = fs.readFileSync(path.join(RAIZ, 'reglamento.html'), 'utf8');
  const iniMain = html.indexOf('<main class="legal-section"');
  const finMain = html.indexOf('</main>') + '</main>'.length;
  if (iniMain < 0 || finMain < 7) {
    throw new Error('No encuentro el <main> de reglamento.html: ¿cambió la plantilla?');
  }
  return {
    // Se quitan las alternates de la corrida anterior: si no, cada pasada
    // sumaría otras seis y en tres corridas la cabecera tendría dieciocho.
    cabeza: html
      .slice(0, iniMain)
      .replace(/[ \t]*<link rel="alternate" hreflang="[^"]*"[^>]*>\r?\n/g, ''),
    pie: html.slice(finMain),
  };
}

/** La barra de idiomas. Es la única forma de llegar a las traducciones. */
function barraDeIdiomas(actual, etiqueta) {
  const enlaces = IDIOMAS.map((i) =>
    i.code === actual
      ? `<strong>${i.nombre}</strong>`
      : `<a href="/${i.archivo.replace(/\.html$/, '')}">${i.nombre}</a>`
  ).join(' · ');
  return `
        <p style="opacity:.75;font-size:.9rem;margin-top:1.25rem;">
          ${etiqueta}: ${enlaces}
        </p>`;
}

function seccion(t, numero, cuerpo, id) {
  const ancla = id ? ` id="${id}"` : '';
  return `
        <h2${ancla}>${numero}. ${t}</h2>${cuerpo}`;
}

function subseccion(t, numero, cuerpo) {
  return `
        <h3>${numero} ${t}</h3>${cuerpo}`;
}

function generar(idioma) {
  const L = require(path.join(RAIZ, 'lang/reglamento', `${idioma.code}.js`));
  const { cabeza, pie } = marco();

  // Cada apartado, en el orden de la estructura. Si a un idioma le falta uno,
  // se para acá y no se escribe media página.
  const cuerpo = APARTADOS.map((ap) => {
    const bloque = L[ap.clave];
    if (!bloque || !bloque.t) {
      throw new Error(`[${idioma.code}] falta el apartado "${ap.clave}" (${ap.n})`);
    }
    let salida = seccion(bloque.t, ap.n, bloque.html || '', ap.id);
    for (const [i, subClave] of (ap.subs || []).entries()) {
      const sub = (bloque.subs || {})[subClave];
      if (!sub || !sub.t) {
        throw new Error(`[${idioma.code}] falta el subapartado "${ap.clave}.${subClave}"`);
      }
      salida += subseccion(sub.t, `${ap.n}.${i + 1}`, sub.html || '');
    }
    return salida;
  }).join('\n');

  // El aviso de qué texto manda. Sólo en las traducciones: en la castellana
  // sería decir que el original prevalece sobre sí mismo.
  const aviso = L.prevalece
    ? `
        <p style="border-left:3px solid var(--primary-yellow,#FFC72C);padding-left:1rem;opacity:.9;">
          ${L.prevalece}
        </p>`
    : '';

  const main = `<main class="legal-section" style="padding:140px 0 60px;">
      <div class="container" style="max-width:840px;">

        <h1>${L.titulo}</h1>
        <p style="opacity:.75;">
          Menorca Rugby Club · NIF G57441628<br>
          ${L.version_linea(VERSION, L.fecha)}
        </p>${barraDeIdiomas(idioma.code, L.otros_idiomas)}${aviso}
${L.intro}
${cuerpo}

      </div>
    </main>`;

  let salida = cabeza + main + pie;

  // La cabecera es la castellana: hay que ponerle a cada página su idioma, su
  // título, su descripción y su canónica, o las seis se anuncian a Google como
  // la misma página en español.
  salida = salida
    .replace(/<html lang="[^"]*">/, `<html lang="${L.html_lang}">`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${L.meta_titulo}</title>`)
    .replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${L.meta_desc}">`
    )
    .replace(
      /<link rel="canonical" href="[^"]*">/,
      `<link rel="canonical" href="https://www.menorcarugbyclub.com/${idioma.archivo.replace(/\.html$/, '')}">` +
        '\n' +
        IDIOMAS.map(
          (i) =>
            `    <link rel="alternate" hreflang="${i.code}" href="https://www.menorcarugbyclub.com/${i.archivo.replace(/\.html$/, '')}">`
        ).join('\n')
    );

  return salida;
}

let escritas = 0;
for (const idioma of IDIOMAS) {
  const destino = path.join(RAIZ, idioma.archivo);
  const contenido = generar(idioma);
  const antes = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8') : null;
  if (antes === contenido) {
    console.log(`  = ${idioma.archivo} (sin cambios)`);
    continue;
  }
  fs.writeFileSync(destino, contenido, 'utf8');
  console.log(`  ✓ ${idioma.archivo}`);
  escritas++;
}
console.log(
  `\n${IDIOMAS.length} idiomas, ${APARTADOS.length} apartados cada uno, versión ${VERSION} (en vigor ${EN_VIGOR}).` +
    (escritas ? ` ${escritas} archivo(s) reescrito(s).` : ' Todo estaba al día.')
);
