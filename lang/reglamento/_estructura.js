/**
 * El Reglamento en seis idiomas, con UNA sola estructura.
 *
 * POR QUÉ NO SON SEIS HTML SUELTOS
 *
 * Seis copias de un documento legal se separan en cuanto alguien corrige una
 * coma en una de ellas. Y aquí separarse no es un detalle estético: cada
 * inscripción guarda la versión del reglamento que la familia aceptó, así que
 * si la versión catalana dice una cosa y la castellana otra, no hay forma de
 * saber qué aceptó quien se inscribió en catalán.
 *
 * Por eso cada idioma es sólo una lista de textos con la MISMA forma —mismos
 * apartados, mismos números, mismos enlaces, mismos identificadores— y las
 * seis páginas las escribe un generador a partir de esa forma:
 *
 *     node scripts/generar-reglamento.js
 *
 * Lo que puede diferir entre idiomas es la redacción. Lo que no puede diferir
 * —cuántos apartados hay, cómo se numeran, a qué correo se escribe para
 * revocar el consentimiento— está garantizado por construcción, y
 * scripts/verificar-reglamento.js lo comprueba antes de desplegar.
 *
 * QUÉ TEXTO MANDA
 *
 * El castellano. Las traducciones son informativas y cada página lo dice: el
 * Club tiene su domicilio en España, se rige por la legislación española y el
 * reglamento se interpreta conforme al texto castellano. Esto no es una
 * cortesía: sin decirlo, una discrepancia de traducción sería una discrepancia
 * entre dos textos igualmente vinculantes.
 */

/** La versión que se guarda en cada inscripción. Cambiarla acá y en accion-enviar.js. */
const VERSION = 'reglamento-2026.1';

/** Desde cuándo está en vigor, en formato ISO para poder formatearlo por idioma. */
const EN_VIGOR = '2026-09-28';

/**
 * El NIF y el nombre no se traducen: son los del registro.
 */
const NIF = 'G57441628';

/**
 * Los correos, en un solo sitio.
 *
 * OJO CON `comision.directiva@`: es un ALIAS, no un buzón.
 *
 * Recibe perfectamente —quien escriba ahí llega a la directiva— pero no puede
 * ENVIAR, y por eso el remitente de todo lo que sale del club es `noreply@`.
 * Son dos cosas distintas y conviene no confundirlas: quitarlo de acá dejaría
 * a la gente sin la dirección de la directiva, y usarlo como remitente haría
 * que los correos del club no salieran.
 */
const CORREOS = {
  general: 'comision.directiva@menorcarugbyclub.com',
  tesoreria: 'tesoreria@menorcarugbyclub.com',
  politicas: 'politicas@menorcarugbyclub.com',
  datos: 'info@menorcarugbyclub.com',
};

/** Los idiomas que sirve la web, en el orden en que se ofrecen. */
const IDIOMAS = [
  { code: 'es', nombre: 'Castellano', archivo: 'reglamento.html' },
  { code: 'ca', nombre: 'Català', archivo: 'reglamento-ca.html' },
  { code: 'en', nombre: 'English', archivo: 'reglamento-en.html' },
  { code: 'fr', nombre: 'Français', archivo: 'reglamento-fr.html' },
  { code: 'it', nombre: 'Italiano', archivo: 'reglamento-it.html' },
  { code: 'pt', nombre: 'Português', archivo: 'reglamento-pt.html' },
];

/**
 * Los apartados, en orden. Cada idioma tiene que traer exactamente estas
 * claves: el verificador falla si falta una o sobra otra.
 *
 * `id` sólo donde hace falta un ancla desde otra página. El formulario de
 * inscripción enlaza a #imagenes, así que ese ancla es parte del contrato con
 * el resto del sitio y no puede cambiar al traducir.
 */
const APARTADOS = [
  { clave: 'aceptacion', n: 1 },
  { clave: 'inscripcion', n: 2 },
  { clave: 'cuotas', n: 3, subs: ['formas_pago', 'compromiso'] },
  { clave: 'voluntarias', n: 4 },
  { clave: 'instalaciones', n: 5, subs: ['acceso', 'gimnasio', 'acompanantes', 'llaves', 'cuidado', 'conducta'] },
  { clave: 'disciplina', n: 6 },
  { clave: 'autorizaciones', n: 7 },
  { clave: 'imagen', n: 8, id: 'imagenes' },
  { clave: 'datos', n: 9 },
  { clave: 'riesgos', n: 10 },
  { clave: 'modificacion', n: 11 },
  { clave: 'contacto', n: 12 },
  { clave: 'legislacion', n: 13 },
];

module.exports = { VERSION, EN_VIGOR, NIF, CORREOS, IDIOMAS, APARTADOS };
