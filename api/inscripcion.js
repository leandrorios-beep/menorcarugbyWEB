// ---------------------------------------------------------------------------
// Una sola función para todo el alta y la renovación.
//
// POR QUÉ UNA Y NO CINCO
//
// El plan Hobby de Vercel despliega como mucho 12 funciones serverless. La web
// ya tenía 12 justas —de hecho una mejora anterior tuvo que fusionar el
// endpoint de importes dentro de sync-stripe-payments por este mismo motivo—,
// así que cinco endpoints nuevos habrían hecho fallar el despliegue entero, y
// sin desplegar no anda ni lo viejo.
//
// El patrón ya existía en la casa: send-welcome-email.js reparte según
// req.body.action. Acá es igual, con `accion`. Cada acción vive en su propio
// archivo dentro de _lib/, que Vercel empaqueta pero no cuenta como función,
// así que el código sigue separado aunque la puerta sea una sola.
//
//   POST /api/inscripcion  {"accion":"inicio",   "email":"..."}
//   POST /api/inscripcion  {"accion":"recordar", "email":"..."}
//   POST /api/inscripcion  {"accion":"acceso",   "email":"...", "password":"..."}
//   GET  /api/inscripcion?accion=estado          (con Authorization: Bearer)
//   POST /api/inscripcion  {"accion":"enviar",   "tutor":{...}, "jugadores":[...]}
// ---------------------------------------------------------------------------

const { cors } = require('./_lib/inscripcion');

const ACCIONES = {
    inicio: { metodo: 'POST', handler: require('./_lib/accion-inicio') },
    recordar: { metodo: 'POST', handler: require('./_lib/accion-recordar') },
    acceso: { metodo: 'POST', handler: require('./_lib/accion-acceso') },
    estado: { metodo: 'GET', handler: require('./_lib/accion-estado') },
    enviar: { metodo: 'POST', handler: require('./_lib/accion-enviar') },
};

module.exports = async function handler(req, res) {
    if (cors(req, res, 'GET, POST, OPTIONS')) return;

    // En GET la acción viaja en la query; en POST, en el cuerpo.
    const nombre = String(
        (req.method === 'GET' ? (req.query || {}).accion : (req.body || {}).accion) || ''
    ).trim();

    const accion = Object.prototype.hasOwnProperty.call(ACCIONES, nombre) ? ACCIONES[nombre] : null;
    if (!accion) {
        return res.status(404).json({
            error: `No conozco la acción "${nombre}". Son: ${Object.keys(ACCIONES).join(', ')}.`,
        });
    }
    if (req.method !== accion.metodo) {
        return res.status(405).json({ error: `La acción "${nombre}" se pide con ${accion.metodo}.` });
    }

    return accion.handler(req, res);
};
