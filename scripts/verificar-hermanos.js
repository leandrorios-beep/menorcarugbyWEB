/**
 * Que la regla de hermanos no se haya separado entre el servidor y la pantalla.
 *
 *     node scripts/verificar-hermanos.js
 *
 * El precio lo decide el servidor, pero la pantalla tiene que poder DECIRLO
 * antes de enviar: marcar «este año no juega» o «Soy yo, el jugador» cambia el
 * importe de los hermanos y el servidor todavía no se ha enterado. Por eso hay
 * dos implementaciones de la misma regla —api/_lib/inscripcion.js y
 * js/hermanos.js— y dos implementaciones se separan sin que nadie se entere.
 *
 * Esto las compara sobre todas las combinaciones que importan. Es el mismo
 * arreglo que verificar-categorias.ts hace con la regla de categorías, que vive
 * en la base y tiene su espejo en lib/season.ts.
 */

const servidor = require('../api/_lib/inscripcion.js');
const pantalla = require('../js/hermanos.js');

let fallos = 0;
let probadas = 0;

function comparar(que, a, b) {
    probadas++;
    if (a !== b) {
        console.log(`  MAL  ${que}: servidor=${JSON.stringify(a)} pantalla=${JSON.stringify(b)}`);
        fallos++;
    }
}

// ── varianteAutomatica ─────────────────────────────────────────────────────
const TRAMOS = ['escuela', 'juvenil', 'senior', 'veterano', 'femenino', undefined, null, ''];
for (const tramo of TRAMOS) {
    for (let hijos = 0; hijos <= 4; hijos++) {
        comparar(
            `varianteAutomatica(${JSON.stringify(tramo)}, ${hijos})`,
            servidor.varianteAutomatica(tramo, hijos),
            pantalla.varianteAutomatica(tramo, hijos)
        );
    }
}

// ── esLaMismaPersona ───────────────────────────────────────────────────────
//
// Las combinaciones no son al azar: cada una es un caso que pasó o puede pasar.
const FICHAS = [
    { qué: 'vacía', v: {} },
    { qué: 'sólo nombre', v: { nombre: 'Leandro', apellido: 'Rios' } },
    { qué: 'nombre y fecha', v: { nombre: 'Leandro Eduardo', apellido: 'Rios', fecha_nacimiento: '1987-05-13' } },
    { qué: 'la misma con acentos y mayúsculas', v: { nombre: '  LEÁNDRO  eduardo ', apellido: 'RÍOS', fecha_nacimiento: '1987-05-13' } },
    { qué: 'hijo homónimo', v: { nombre: 'Leandro Eduardo', apellido: 'Rios', fecha_nacimiento: '2010-05-13' } },
    { qué: 'fecha con hora', v: { nombre: 'Leandro Eduardo', apellido: 'Rios', fecha_nacimiento: '1987-05-13T00:00:00+00:00' } },
    { qué: 'otra persona', v: { nombre: 'Unai', apellido: 'Rios Carrillo', fecha_nacimiento: '2021-06-14' } },
    { qué: 'con documento', v: { nombre: 'Jose', apellido: 'Uno', numero_documento: 'Y7538792G' } },
    { qué: 'mismo documento, otro nombre', v: { nombre: 'Pepe', apellido: 'Dos', numero_documento: 'y7538792-g' } },
    { qué: 'documento distinto, mismo nombre', v: { nombre: 'Jose', apellido: 'Uno', fecha_nacimiento: '1987-05-13', numero_documento: 'X0000000X' } },
    { qué: 'documento vacío', v: { nombre: 'Jose', apellido: 'Uno', fecha_nacimiento: '1987-05-13', numero_documento: '   ' } },
    { qué: 'nulo', v: null },
    { qué: 'apellido compuesto', v: { nombre: 'Maria Victoria', apellido: 'Lago Perezagua', fecha_nacimiento: '1980-02-02' } },
    { qué: 'sin fecha', v: { nombre: 'Maria Victoria', apellido: 'Lago Perezagua' } },
];

for (const a of FICHAS) {
    for (const b of FICHAS) {
        comparar(
            `esLaMismaPersona(${a.qué}, ${b.qué})`,
            servidor.esLaMismaPersona(a.v, b.v),
            pantalla.esLaMismaPersona(a.v, b.v)
        );
    }
}

// ── cuentaComoHermano ──────────────────────────────────────────────────────
const PARENTESCOS = ['madre', 'padre', 'tutor_legal', 'abuelo', 'hermano', 'otro', 'el_mismo', undefined, null];
for (const a of FICHAS) {
    for (const b of FICHAS) {
        for (const p of PARENTESCOS) {
            comparar(
                `cuentaComoHermano(${a.qué}, ${b.qué}, ${JSON.stringify(p)})`,
                servidor.cuentaComoHermano(a.v, b.v, p),
                pantalla.cuentaComoHermano(a.v, b.v, p)
            );
        }
    }
}

// ── Y el caso completo: la cuenta de hijos de una familia ──────────────────
//
// Es el número del que sale el precio, y el que la pantalla tiene que poder
// sacar sola mientras la familia toca las casillas.
const TITULAR = { nombre: 'Leandro Eduardo', apellido: 'Rios', fecha_nacimiento: '1987-05-13' };
const FAMILIAS = [
    { qué: 'un hijo solo', v: [{ nombre: 'Unai', apellido: 'Rios Carrillo', fecha_nacimiento: '2021-06-14', parentesco: 'padre' }] },
    {
        qué: 'el padre que juega y su hijo único',
        v: [
            Object.assign({ parentesco: 'el_mismo' }, TITULAR),
            { nombre: 'Unai', apellido: 'Rios Carrillo', fecha_nacimiento: '2021-06-14', parentesco: 'padre' },
        ],
    },
    {
        qué: 'el padre que juega sin marcar la casilla',
        v: [
            Object.assign({ parentesco: 'tutor_legal' }, TITULAR),
            { nombre: 'Unai', apellido: 'Rios Carrillo', fecha_nacimiento: '2021-06-14', parentesco: 'padre' },
        ],
    },
    {
        qué: 'dos hijos',
        v: [
            { nombre: 'Uno', apellido: 'Rios', fecha_nacimiento: '2010-01-01', parentesco: 'padre' },
            { nombre: 'Dos', apellido: 'Rios', fecha_nacimiento: '2012-01-01', parentesco: 'padre' },
        ],
    },
    {
        qué: 'dos hijos y uno no renueva',
        v: [
            { nombre: 'Uno', apellido: 'Rios', fecha_nacimiento: '2010-01-01', parentesco: 'padre' },
            { nombre: 'Dos', apellido: 'Rios', fecha_nacimiento: '2012-01-01', parentesco: 'padre', no_renueva: true },
        ],
    },
    {
        qué: 'hijo mayor de edad y su hermano',
        v: [
            { nombre: 'Mayor', apellido: 'Rios', fecha_nacimiento: '2006-01-01', parentesco: 'madre' },
            { nombre: 'Menor', apellido: 'Rios', fecha_nacimiento: '2011-01-01', parentesco: 'madre' },
        ],
    },
];

for (const f of FAMILIAS) {
    // El servidor no tiene contarHijos como función suelta: la hace inline en
    // accion-enviar. Se reproduce acá con SUS piezas, que es lo que importa que
    // coincida.
    const delServidor = f.v.filter(
        (j) => !j.no_renueva && servidor.cuentaComoHermano(j, TITULAR, j.parentesco)
    ).length;
    const deLaPantalla = pantalla.contarHijos(f.v, TITULAR);
    comparar(`contarHijos(${f.qué})`, delServidor, deLaPantalla);

    // Y que de ese número salga la misma variante para un juvenil.
    comparar(
        `variante juvenil de (${f.qué})`,
        servidor.varianteAutomatica('juvenil', delServidor),
        pantalla.varianteAutomatica('juvenil', deLaPantalla)
    );
}

console.log(
    fallos === 0
        ? `${probadas} comparaciones: el servidor y la pantalla dicen lo mismo.`
        : `${fallos} de ${probadas} comparaciones NO coinciden.`
);
process.exit(fallos === 0 ? 0 : 1);
