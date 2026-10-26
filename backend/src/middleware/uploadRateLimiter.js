const WINDOW_MS = 60 * 1000;
const DEFAULT_UPLOADS_PER_MINUTE = 30;
const MAX_TRACKED_CLIENTS = 10_000;
const clients = new Map();
let lastCleanup = 0;

function getUploadLimit() {
  const configuredLimit = Number.parseInt(process.env.MAX_UPLOADS_PER_MINUTE, 10);
  return Number.isInteger(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : DEFAULT_UPLOADS_PER_MINUTE;
}

function removeExpiredClients(now) {
  if (now - lastCleanup < WINDOW_MS) {
    return;
  }

  for (const [clientAddress, client] of clients) {
    if (client.resetAt <= now) {
      clients.delete(clientAddress);
    }
  }
  lastCleanup = now;
}

function uploadRateLimiter(req, res, next) {
  const now = Date.now();
  removeExpiredClients(now);

  const clientAddress = req.ip || req.socket.remoteAddress || 'unknown';
  let client = clients.get(clientAddress);
  if (!client || client.resetAt <= now) {
    client = { count: 0, resetAt: now + WINDOW_MS };
  }

  if (client.count >= getUploadLimit()) {
    res.set('Retry-After', String(Math.ceil((client.resetAt - now) / 1000)));
    return res.status(429).json({
      error: {
        code: 'UPLOAD_RATE_LIMITED',
        message: 'Limite de uploads temporariamente excedido.',
      },
    });
  }

  client.count += 1;
  clients.set(clientAddress, client);

  if (clients.size > MAX_TRACKED_CLIENTS) {
    const oldestClient = clients.keys().next().value;
    clients.delete(oldestClient);
  }

  return next();
}

module.exports = uploadRateLimiter;