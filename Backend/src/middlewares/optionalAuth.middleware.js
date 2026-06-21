const jwt = require("jsonwebtoken");

// Like auth, but doesn't reject — just populates req.user if a valid token is present
module.exports = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return next(); // No token = anonymous, continue

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    // Invalid token — still allow but treat as anonymous
    req.user = null;
  }
  next();
};
