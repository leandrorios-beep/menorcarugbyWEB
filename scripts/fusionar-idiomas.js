/**
 * Mete lang/_inscripcion.json dentro de cada lang/<idioma>.json.
 *
 * POR QUÉ NO SE EDITAN LOS SEIS A MANO
 *
 * Los textos de una pantalla nueva son los mismos treinta en seis idiomas. Si
 * se pegan a mano en seis archivos, la próxima vez que alguien cambie una frase
 * la cambia en uno y los otros cinco quedan viejos sin que nadie lo note — y
 * nadie lo nota porque el sistema de idiomas, cuando falta una clave, se queda
 * con el castellano del HTML en vez de dejar un hueco.
 *
 * Con el archivo aparte, las seis versiones de cada frase están una al lado de
 * la otra y se ve de un vistazo cuál falta.
 *
 *   node scripts/fusionar-idiomas.js
 */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'lang');
const FUENTE = path.join(DIR, '_inscripcion.json');

const fuente = JSON.parse(fs.readFileSync(FUENTE, 'utf8'));
const idiomas = Object.keys(fuente).filter((k) => !k.startsWith('_'));

// Que ninguna traducción se haya quedado a medias: todas tienen que tener las
// mismas claves que el castellano, que es el original.
const claves = Object.keys(fuente.es);
let faltan = 0;
for (const lang of idiomas) {
    const ausentes = claves.filter((k) => !(k in fuente[lang]));
    if (ausentes.length) {
        console.error(`  ${lang}: faltan ${ausentes.length} -> ${ausentes.join(', ')}`);
        faltan += ausentes.length;
    }
    const sobran = Object.keys(fuente[lang]).filter((k) => !claves.includes(k));
    if (sobran.length) console.warn(`  ${lang}: sobran ${sobran.join(', ')} (¿se renombró una clave?)`);
}
if (faltan) {
    console.error(`\n${faltan} textos sin traducir. No se fusiona nada.`);
    process.exit(1);
}

for (const lang of idiomas) {
    const destino = path.join(DIR, `${lang}.json`);
    const actual = JSON.parse(fs.readFileSync(destino, 'utf8'));
    actual.inscripcion = Object.assign({}, actual.inscripcion, fuente[lang]);
    fs.writeFileSync(destino, JSON.stringify(actual, null, 2) + '\n', 'utf8');
    console.log(`  ${lang}.json  <- ${Object.keys(fuente[lang]).length} textos`);
}

console.log(`\n${idiomas.length} idiomas al día.`);
