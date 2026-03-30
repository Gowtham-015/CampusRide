const jwt = require('jsonwebtoken');

const JWT_SECRET = 'mySuperSecretKey123';

const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader)
      return res.status(401).json({ message: 'No token, authorization denied' });
    if (!authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'Token format invalid. Use: Bearer <token>' });

    const token   = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError')
      return res.status(401).json({ message: 'Token has expired. Please login again.' });
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
