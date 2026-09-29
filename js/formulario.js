/**
 * Las reglas de los datos del formulario de inscripción.
 *
 * POR QUÉ EXISTE
 *
 * El formulario comprobaba la FORMA de los campos y nunca el contenido, así
 * que sólo funcionaba por el camino feliz. Escribir `@gmail.co` pasaba, el
 * teléfono entraba con espacios y sin prefijo, el DNI con puntos, y el código
 * postal podía ser cualquier cosa. Nada de eso se ve hasta que hace falta:
 * hasta que hay que llamar a una madre un domingo, o hasta que la federación
 * rechaza una licencia por un documento mal escrito.
 *
 * LO USA LA PANTALLA Y LO USA EL SERVIDOR
 *
 * Este archivo corre en los dos: en el navegador para avisar mientras se
 * escribe, y en api/_lib/accion-enviar.js para no fiarse del navegador. Es la
 * misma regla en un solo sitio; dos copias se separan sin que nadie se entere.
 * scripts/verificar-formulario.js comprueba que lo que el navegador acepta es
 * exactamente lo que el servidor acepta.
 */
(function (raiz) {
    'use strict';

    // ── Correo ─────────────────────────────────────────────────────────────

    /** La forma. Necesaria pero no suficiente: `pepe@gmail.co` la cumple. */
    function pareceCorreo(valor) {
        return /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(String(valor || '').trim());
    }

    /**
     * Dominios que la gente escribe mal, y su corrección.
     *
     * No se corrige solo: se SUGIERE. Corregirle el correo a alguien sin
     * preguntarle es cambiar la única forma que tenemos de encontrarlo, y si la
     * corrección estuviera mal se quedaría sin recibir nada y sin saber por qué.
     */
    var TIPICOS = {
        'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.con': 'gmail.com',
        'gmail.om': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com',
        'gmail.es': 'gmail.com', 'gamil.com': 'gmail.com',
        'hotmail.co': 'hotmail.com', 'hotmail.cm': 'hotmail.com', 'hotmal.com': 'hotmail.com',
        'hotmai.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
        'outlook.co': 'outlook.com', 'outlok.com': 'outlook.com', 'outlook.cm': 'outlook.com',
        'yahoo.co': 'yahoo.com', 'yaho.com': 'yahoo.com',
        'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com',
        'live.co': 'live.com'
    };

    /**
     * Si el correo parece tener una errata, devuelve el correo corregido.
     * Si no, null.
     */
    function sugerirCorreo(valor) {
        var v = String(valor || '').trim().toLowerCase();
        var i = v.lastIndexOf('@');
        if (i < 0) return null;
        var usuario = v.slice(0, i);
        var dominio = v.slice(i + 1);
        if (TIPICOS[dominio]) return usuario + '@' + TIPICOS[dominio];
        // Un dominio que acaba en .co cuando existe el mismo en .com es, casi
        // siempre, una tecla que no llegó. Colombia usa .co, pero acá no hay
        // ninguno y el coste de preguntar es cero.
        if (/\.co$/.test(dominio)) return usuario + '@' + dominio + 'm';
        return null;
    }

    // ── Teléfono ───────────────────────────────────────────────────────────

    /**
     * Un teléfono guardado es un teléfono al que se puede llamar sin pensar.
     *
     * Se guarda con prefijo y sin espacios, guiones ni paréntesis: así se puede
     * marcar de un toque desde el móvil y construir el enlace de WhatsApp sin
     * limpiar nada. Antes entraba tal cual se escribiera —«971 36 12 34», «971
     * 36-12-34»— y cada pantalla tenía que limpiarlo a su manera.
     *
     * NO HAY LISTA DE PAÍSES, A PROPÓSITO
     *
     * Hubo un desplegable con diez prefijos y era una lista arbitraria: el
     * undécimo país no existía. Se escribe el número y ya: si empieza por + o
     * por 00, manda lo que la persona puso; si no, se asume España, que es
     * donde vive casi todo el club. Así caben los 195 países sin mantener
     * ninguna lista.
     */
    function normalizarTelefono(valor, prefijo) {
        var crudo = String(valor || '').replace(/[\s\-().]/g, '');
        if (!crudo) return '';
        // Si ya trae prefijo internacional, manda el suyo.
        if (crudo.charAt(0) === '+') return crudo;
        if (crudo.slice(0, 2) === '00') return '+' + crudo.slice(2);
        return String(prefijo || '+34') + crudo;
    }

    /** Un teléfono es válido si tiene prefijo y entre 6 y 14 dígitos. */
    function telefonoValido(valor) {
        return /^\+\d{6,15}$/.test(String(valor || ''));
    }

    // ── Documento ──────────────────────────────────────────────────────────

    /**
     * Sin puntos, ni guiones, ni espacios, y en mayúsculas.
     *
     * Es lo que va a la federación y lo que después sirve para reconocer a una
     * persona: «12345678-Z», «12.345.678 z» y «12345678Z» son el mismo DNI y
     * tres cadenas distintas, y con tres cadenas distintas la misma persona
     * acaba con tres fichas.
     */
    function normalizarDocumento(valor) {
        return String(valor || '').replace(/[\s.\-]/g, '').toUpperCase();
    }

    /** Comprobación por tipo. El pasaporte no se valida: cada país es distinto. */
    function documentoValido(tipo, valor) {
        var v = normalizarDocumento(valor);
        if (!v) return false;
        if (tipo === 'DNI') return /^\d{8}[A-Z]$/.test(v);
        if (tipo === 'NIE') return /^[XYZ]\d{7}[A-Z]$/.test(v);
        return v.length >= 4;
    }

    // ── Dónde vive ─────────────────────────────────────────────────────────

    /**
     * Los ocho municipios de Menorca.
     *
     * Desplegable y no texto libre: escrito a mano aparecen «Mahón», «Maó»,
     * «MAO» y «mahon», que son cuatro poblaciones distintas para cualquier
     * listado y una sola en el mapa.
     */
    var POBLACIONES = [
        'Alaior',
        'Ciutadella de Menorca',
        'Es Castell',
        'Es Mercadal',
        'Es Migjorn Gran',
        'Ferreries',
        'Maó',
        'Sant Lluís'
    ];

    /**
     * Los códigos postales de Menorca son los 077xx. Mallorca es 070xx y 076xx,
     * Ibiza y Formentera 078xx.
     */
    function cpDeMenorca(valor) {
        return /^077\d{2}$/.test(String(valor || '').replace(/\s/g, ''));
    }

    var api = {
        pareceCorreo: pareceCorreo,
        sugerirCorreo: sugerirCorreo,
        normalizarTelefono: normalizarTelefono,
        telefonoValido: telefonoValido,
        normalizarDocumento: normalizarDocumento,
        documentoValido: documentoValido,
        POBLACIONES: POBLACIONES,
        cpDeMenorca: cpDeMenorca
    };

    raiz.MRCFormulario = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
