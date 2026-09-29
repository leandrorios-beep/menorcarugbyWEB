/**
 * Que la pantalla y el servidor acepten exactamente lo mismo.
 *
 *     node scripts/verificar-formulario.js
 *
 * Las reglas de los datos —qué es un correo, qué es un teléfono, qué es un
 * DNI, qué código postal es de Menorca— viven en js/formulario.js, y lo cargan
 * los DOS: el navegador para avisar mientras se escribe, y accion-enviar.js
 * para no fiarse del navegador.
 *
 * Esto comprueba que el servidor lo está cargando de verdad, y que las reglas
 * dan lo que tienen que dar. Si algún día alguien copia una de estas funciones
 * a un lado en vez de importarla, esto lo dice.
 */
const fs = require('fs');
const path = require('path');
const F = require('../js/formulario.js');

let fallos = 0;
function comprobar(que, bien, detalle) {
  if (bien) return;
  console.log(`  MAL  ${que}${detalle !== undefined ? ' -> ' + JSON.stringify(detalle) : ''}`);
  fallos++;
}

// ── El servidor lo usa, no tiene su propia copia ───────────────────────────
{
  const enviar = fs.readFileSync(path.join(__dirname, '../api/_lib/accion-enviar.js'), 'utf8');
  comprobar('accion-enviar carga js/formulario.js', /require\(['"]\.\.\/\.\.\/js\/formulario\.js['"]\)/.test(enviar));
  for (const fn of ['normalizarTelefono', 'telefonoValido', 'normalizarDocumento', 'documentoValido']) {
    comprobar(`accion-enviar usa F.${fn}`, enviar.includes(`F.${fn}`));
  }
}

// ── Correo ─────────────────────────────────────────────────────────────────
for (const [v, ok] of [
  ['pepe@gmail.com', true], ['pepe@gmail.co', true], ['pepe@gmail', false],
  ['pepe', false], ['@gmail.com', false], ['a b@gmail.com', false],
  ['x@menorcarugbyclub.com', true],
]) comprobar(`pareceCorreo(${v})`, F.pareceCorreo(v) === ok, F.pareceCorreo(v));

for (const [v, esperado] of [
  ['pepe@gmail.co', 'pepe@gmail.com'],
  ['ana@hotmal.com', 'ana@hotmail.com'],
  ['x@outlok.com', 'x@outlook.com'],
  ['bien@gmail.com', null],
  ['bien@menorcarugbyclub.com', null],
  ['sinarroba', null],
]) comprobar(`sugerirCorreo(${v})`, F.sugerirCorreo(v) === esperado, F.sugerirCorreo(v));

// ── Teléfono ───────────────────────────────────────────────────────────────
for (const [v, pref, esperado] of [
  ['971 36 12 34', '+34', '+34971361234'],
  ['609-12-34-56', '+34', '+34609123456'],
  ['(971) 361234', '+34', '+34971361234'],
  ['+44 7700 900123', '+34', '+447700900123'],
  ['0033612345678', '+34', '+33612345678'],
  ['612345678', '+351', '+351612345678'],
  ['', '+34', ''],
]) comprobar(`normalizarTelefono(${v})`, F.normalizarTelefono(v, pref) === esperado, F.normalizarTelefono(v, pref));

comprobar('un teléfono normalizado es válido', F.telefonoValido('+34612345678'));
comprobar('sin prefijo no es válido', !F.telefonoValido('612345678'));
comprobar('demasiado corto no es válido', !F.telefonoValido('+3412'));

// ── Documento ──────────────────────────────────────────────────────────────
comprobar('quita puntos y guiones', F.normalizarDocumento('12.345.678-z') === '12345678Z');
comprobar('quita espacios', F.normalizarDocumento(' x 1234567 l ') === 'X1234567L');
for (const [tipo, v, ok] of [
  ['DNI', '12345678Z', true], ['DNI', '12.345.678-Z', true],
  ['DNI', '1234567Z', false], ['DNI', '123456789', false],
  ['NIE', 'X1234567L', true], ['NIE', 'A1234567L', false],
  ['PASAPORTE', 'AB123456', true], ['PASAPORTE', 'AB', false],
  ['DNI', '', false],
]) comprobar(`documentoValido(${tipo}, ${v})`, F.documentoValido(tipo, v) === ok, F.documentoValido(tipo, v));

// ── Dónde vive ─────────────────────────────────────────────────────────────
for (const [cp, ok] of [
  ['07701', true], ['07760', true], ['07749', true],
  ['07001', false], ['07800', false], ['28001', false],
  ['0770', false], ['077011', false], ['', false],
]) comprobar(`cpDeMenorca(${cp})`, F.cpDeMenorca(cp) === ok, F.cpDeMenorca(cp));

comprobar('los ocho municipios de Menorca', F.POBLACIONES.length === 8, F.POBLACIONES.length);
comprobar('están Maó y Ciutadella', F.POBLACIONES.includes('Maó') && F.POBLACIONES.includes('Ciutadella de Menorca'));
comprobar('el prefijo de España va primero', F.PREFIJOS[0].codigo === '+34', F.PREFIJOS[0]);

// ── Y la pantalla lo carga ─────────────────────────────────────────────────
{
  const html = fs.readFileSync(path.join(__dirname, '../inscripcion.html'), 'utf8');
  comprobar('inscripcion.html carga js/formulario.js', html.includes('js/formulario.js'));
  comprobar('y lo usa', html.includes('MRCFormulario.'));
}

console.log(
  fallos === 0
    ? '\nLa pantalla y el servidor aceptan lo mismo.'
    : `\n${fallos} comprobaciones fallaron.`
);
process.exit(fallos === 0 ? 0 : 1);
