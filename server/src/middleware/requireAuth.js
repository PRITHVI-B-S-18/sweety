const jwt = require('jsonwebtoken');

const INVALID_TOKEN = 'Invalid or expired token.';

module.exports = function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
  } catch {
    return res.status(401).json({ error: INVALID_TOKEN });
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId)) {
    return res.status(401).json({ error: INVALID_TOKEN });
  }

  req.userId = userId;
  return next();
};
