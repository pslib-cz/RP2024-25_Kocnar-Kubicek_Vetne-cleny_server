import type express from 'express';

// Shared HTTP Basic Auth for all admin-only endpoints (sets manager, version,
// analytics dashboard and the login verify check).
export const ADMIN_USER = 'admin';
export const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';

export function basicAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="VetneClenyAdmin"');
    res.status(401).send('Authentication required');
    return;
  }
  const base64 = auth.split(' ')[1];
  const [user, pass] = Buffer.from(base64, 'base64').toString().split(':');
  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="VetneClenyAdmin"');
    res.status(401).send('Invalid credentials');
    return;
  }
  next();
}
