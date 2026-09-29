/**
 * Que las seis versiones del Reglamento sigan siendo el mismo documento.
 *
 *     node scripts/verificar-reglamento.js
 *
 * Es un documento LEGAL y cada inscripción guarda la versión que la familia
 * aceptó. Si la catalana dice una cosa y la castellana otra, no hay forma de
 * saber qué aceptó quien se inscribió en catalán — y eso no se arregla después.
 *
 * El generador ya hace imposible que difieran en estructura. Esto comprueba lo
 * que el generador no puede: que las páginas publicadas correspondan de verdad
 * a la estructura de hoy (o sea, que nadie las editó a mano), que todas
 * declaren la misma versión, y que la versión sea la que guarda el formulario
 * al inscribir.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const { VERSION, IDIOMAS, APARTADOS } = require(path.join(RAIZ, 'lang/reglamento/_estructura.js'));

let fallos = 0;
function comprobar(que, bien, detalle) {
  if (bien) return;
  console.log(`  MAL  ${que}${detalle !== undefined ? ' -> ' + JSON.stringify(detalle) : ''}`);
  fallos++;
}

// ── 1. Las páginas publicadas son las que saldrían hoy del generador ───────
//
// Se regenera en memoria y se compara. Si alguien editó un reglamento a mano,
// su cambio desaparecería en la próxima corrida sin que nadie se entere: mejor
// que falle acá.
{
  const antes = IDIOMAS.map((i) => {
    const p = path.join(RAIZ, i.archivo);
    return { i, existe: fs.existsSync(p), contenido: fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null };
  });
  execFileSync(process.execPath, [path.join(__dirname, 'generar-reglamento.js')], { cwd: RAIZ });
  for (const { i, existe, contenido } of antes) {
    const ahora = fs.readFileSync(path.join(RAIZ, i.archivo), 'utf8');
    comprobar(`${i.archivo} estaba al día`, existe && contenido === ahora,
      existe ? 'el archivo publicado no coincide con la estructura: ¿se editó a mano?' : 'no existía');
  }
}

// ── 2. Todas dicen la misma versión, y es la que se guarda al inscribir ────
{
  const enviar = fs.readFileSync(path.join(RAIZ, 'api/_lib/accion-enviar.js'), 'utf8');
  const m = enviar.match(/REGLAMENTO_VERSION\s*=\s*['"]([^'"]+)['"]/);
  comprobar('accion-enviar.js declara una versión de reglamento', Boolean(m), null);
  if (m) {
    comprobar(
      'la versión que se guarda en cada inscripción es la de las páginas',
      m[1] === VERSION,
      { en_el_formulario: m[1], en_las_paginas: VERSION }
    );
  }
  for (const i of IDIOMAS) {
    const html = fs.readFileSync(path.join(RAIZ, i.archivo), 'utf8');
    comprobar(`${i.archivo} publica la versión ${VERSION}`, html.includes(VERSION));
  }
}

// ── 3. Mismos apartados, mismos números, mismo ancla ──────────────────────
{
  const esperadosH2 = APARTADOS.length;
  const esperadosH3 = APARTADOS.reduce((n, a) => n + (a.subs || []).length, 0);
  for (const i of IDIOMAS) {
    const html = fs.readFileSync(path.join(RAIZ, i.archivo), 'utf8');
    const h2 = (html.match(/<h2[^>]*>/g) || []).length;
    const h3 = (html.match(/<h3[^>]*>/g) || []).length;
    comprobar(`${i.archivo} tiene ${esperadosH2} apartados`, h2 === esperadosH2, h2);
    // El pie de página trae un <h3> propio: por eso el +1.
    comprobar(`${i.archivo} tiene ${esperadosH3} subapartados`, h3 === esperadosH3 + 1, h3);

    // El formulario de inscripción enlaza a #imagenes. Si una traducción
    // perdiera el ancla, ese enlace llevaría al principio de la página y la
    // familia no encontraría lo que fue a leer.
    comprobar(`${i.archivo} conserva el ancla #imagenes`, html.includes('id="imagenes"'));

    // Y que la numeración sea la misma en los seis: 1..13.
    const numeros = (html.match(/<h2[^>]*>(\d+)\./g) || []).map((s) => Number(s.match(/(\d+)\./)[1]));
    comprobar(
      `${i.archivo} numera del 1 al ${esperadosH2}`,
      JSON.stringify(numeros) === JSON.stringify(APARTADOS.map((a) => a.n)),
      numeros
    );
  }
}

// ── 4. Se puede llegar a las seis desde cualquiera de ellas ───────────────
{
  for (const i of IDIOMAS) {
    const html = fs.readFileSync(path.join(RAIZ, i.archivo), 'utf8');
    for (const otro of IDIOMAS) {
      if (otro.code === i.code) continue;
      const ruta = '/' + otro.archivo.replace(/\.html$/, '');
      comprobar(`${i.archivo} enlaza a ${ruta}`, html.includes(`href="${ruta}"`));
    }
    comprobar(`${i.archivo} declara su idioma`, html.includes(`<html lang="${require(path.join(RAIZ, 'lang/reglamento', i.code + '.js')).html_lang}">`));
    // Una sola canónica, y la suya: si las seis se declaran canónicas de la
    // castellana, Google publica una y esconde cinco.
    const canon = html.match(/<link rel="canonical" href="([^"]*)">/g) || [];
    comprobar(`${i.archivo} tiene UNA canónica`, canon.length === 1, canon);
    comprobar(
      `${i.archivo} es canónica de sí misma`,
      canon[0] && canon[0].includes('/' + i.archivo.replace(/\.html$/, '"')),
      canon[0]
    );
  }
}

// ── 5. Las traducciones dicen cuál manda; la castellana no ────────────────
{
  for (const i of IDIOMAS) {
    const L = require(path.join(RAIZ, 'lang/reglamento', `${i.code}.js`));
    if (i.code === 'es') {
      comprobar('la castellana no dice que prevalece otra', !L.prevalece);
    } else {
      comprobar(`${i.code} avisa de que manda la castellana`, Boolean(L.prevalece));
      comprobar(
        `${i.code} enlaza a la castellana en ese aviso`,
        Boolean(L.prevalece) && L.prevalece.includes('/reglamento')
      );
    }
  }
}

console.log(
  fallos === 0
    ? `\nLas ${IDIOMAS.length} versiones del Reglamento son el mismo documento (${VERSION}).`
    : `\n${fallos} problemas.`
);
process.exit(fallos === 0 ? 0 : 1);
