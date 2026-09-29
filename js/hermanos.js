/**
 * La regla del descuento por hermano, para el NAVEGADOR.
 *
 * POR QUÉ EXISTE UNA COPIA
 *
 * El precio lo decide el servidor y sólo el servidor: lo que llega del
 * navegador se descarta. Pero la pantalla tiene que poder DECIR el precio
 * correcto antes de enviar, y hay tres cosas que lo mueven y que el servidor
 * todavía no sabe porque aún no se guardaron:
 *
 *   · marcar «este año no va a jugar» a un hermano
 *   · deshacer esa marca
 *   · marcar o desmarcar «Soy yo, el jugador» en una ficha
 *
 * Antes la pantalla no recalculaba nada: el importe llegaba del servidor al
 * abrir y se quedaba congelado. Una familia con dos hijos que marcaba que uno
 * no juega seguía leyendo 40 €/mes, apretaba enviar, y se le guardaban 50. Los
 * 90 € de diferencia aparecían después, sin que nadie hubiera cambiado nada.
 *
 * QUE NO SE SEPAREN
 *
 * Dos implementaciones de la misma regla se separan sin que nadie se entere.
 * Por eso este archivo es un ESPEJO de api/_lib/inscripcion.js —mismos nombres,
 * mismo comportamiento— y hay un script que compara las dos:
 *
 *     node scripts/verificar-hermanos.js
 *
 * Es el mismo arreglo que ya se hizo con la regla de categorías, que vive en la
 * base y tiene su espejo en lib/season.ts.
 *
 * Y una red debajo: el servidor guarda como TOPE la variante que la pantalla
 * tenía delante, así que si este espejo se equivocara hacia abajo el cobro se
 * bloquea en vez de cobrar de más.
 */
(function (raiz) {
    'use strict';

    function sinAcentos(texto) {
        return String(texto == null ? '' : texto)
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function soloAlfanumerico(texto) {
        return String(texto == null ? '' : texto).toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    /**
     * Dos fichas, ¿son la misma persona? El documento manda; si no hay, el
     * nombre completo Y la fecha de nacimiento, porque padre e hijo homónimos
     * son dos personas.
     */
    function esLaMismaPersona(a, b) {
        if (!a || !b) return false;

        var docA = soloAlfanumerico(a.numero_documento);
        var docB = soloAlfanumerico(b.numero_documento);
        if (docA && docB) return docA === docB;

        var nombreA = sinAcentos((a.nombre || '') + ' ' + (a.apellido || ''));
        var nombreB = sinAcentos((b.nombre || '') + ' ' + (b.apellido || ''));
        if (!nombreA || nombreA !== nombreB) return false;

        var fechaA = String(a.fecha_nacimiento || '').slice(0, 10);
        var fechaB = String(b.fecha_nacimiento || '').slice(0, 10);
        if (fechaA && fechaB) return fechaA === fechaB;

        // Uno de los dos no tiene ni fecha ni documento con que distinguirse.
        //
        // Pasa de verdad: la ficha de jugador SIEMPRE lleva fecha de nacimiento
        // (el formulario la exige) pero la del responsable no, y los dos campos
        // de documento son opcionales. Con la regla estricta, un padre que juega
        // y no rellenó su propia fecha dejaba de ser reconocido como el titular
        // y volvía a contar como hermano de su hijo: el agujero de los 90 €,
        // reabierto por un campo vacío.
        //
        // Con el nombre completo igual y nada con que separarlos, se da por
        // hecho que es la misma persona. Se equivoca sólo con un padre y un hijo
        // que se llamen exactamente igual Y en cuya cuenta no haya ni una fecha
        // ni un DNI, y el error cuesta un descuento que la familia puede
        // reclamar — al revés cuesta 90 € que nadie reclama nunca.
        return !(fechaA || docA) || !(fechaB || docB);
    }

    /**
     * Si este jugador cuenta como hermano de los demás de su familia.
     *
     * El padre o la madre que además juega no es hermano de su propio hijo. Se
     * mira la IDENTIDAD y no el desplegable de parentesco, porque el desplegable
     * lo rellena la familia y su valor por defecto regalaba el descuento.
     * La explicación larga está en api/_lib/inscripcion.js.
     */
    function cuentaComoHermano(jugador, titular, parentesco) {
        if (parentesco === 'el_mismo') return false;
        return !esLaMismaPersona(jugador, titular);
    }

    /**
     * Qué tarifa le toca sin preguntárselo a la familia: sólo los JUVENILES, y
     * sólo si la familia trae más de un hijo.
     */
    function varianteAutomatica(tramo, hijosDeLaFamilia) {
        if (tramo !== 'juvenil') return 'base';
        return hijosDeLaFamilia > 1 ? 'con_hermano' : 'base';
    }

    /** Cuántos HIJOS trae la familia, con la misma cuenta que hace el servidor. */
    function contarHijos(jugadores, titular) {
        return (jugadores || []).filter(function (j) {
            return !j.no_renueva && cuentaComoHermano(j, titular, j.parentesco);
        }).length;
    }

    var api = {
        sinAcentos: sinAcentos,
        soloAlfanumerico: soloAlfanumerico,
        esLaMismaPersona: esLaMismaPersona,
        cuentaComoHermano: cuentaComoHermano,
        varianteAutomatica: varianteAutomatica,
        contarHijos: contarHijos,
    };

    raiz.MRCHermanos = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
