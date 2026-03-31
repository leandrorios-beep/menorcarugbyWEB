const crypto = require('crypto');

const JWT_SECRET = 'mrc-s3mpenta-rugby-m3n0rca-2025-jwt-k3y';

// ── Password hashing with scrypt ──
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const test = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
}

// ── Generate random password (8 chars, alphanumeric) ──
function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
        pwd += chars[bytes[i] % chars.length];
    }
    return pwd;
}

// ── Simple JWT with HMAC-SHA256 ──
function signJWT(payload, expiresInHours = 72) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const body = Buffer.from(JSON.stringify({
        ...payload,
        iat: now,
        exp: now + expiresInHours * 3600
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}

function verifyJWT(token) {
    try {
        const [header, body, signature] = token.split('.');
        const expected = crypto.createHmac('sha256', JWT_SECRET)
            .update(`${header}.${body}`)
            .digest('base64url');
        if (signature !== expected) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

// ── Extract JWT from Authorization header ──
function getAuthPayload(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return verifyJWT(auth.slice(7));
}

module.exports = {
    hashPassword,
    verifyPassword,
    generatePassword,
    signJWT,
    verifyJWT,
    getAuthPayload
};
