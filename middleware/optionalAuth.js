const jwt = require("jsonwebtoken");

// Optional authentication middleware - doesn't block if no token, but identifies user if token exists
module.exports = function (req, res, next) {
  console.log('🔍 Optional auth called for:', req.method, req.originalUrl);
  
  // Try Authorization header first (Bearer token format)
  let token = req.header("Authorization");
  
  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7, token.length); // Remove "Bearer " prefix
    console.log('🔍 Found Bearer token in optional auth');
  } else {
    // Fallback to x-auth-token for backward compatibility
    token = req.header("x-auth-token");
    console.log('🔍 Checking x-auth-token:', !!token);
  }

  // If no token, continue without user info (anonymous)
  if (!token) {
    console.log('🔍 No token found, continuing as anonymous');
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, "secret");
    req.user = decoded.user;
    console.log('🔍 Optional auth successful for user:', decoded.user?.username || decoded.user?.id);
    next();
  } catch (err) {
    // If token is invalid, continue as anonymous
    console.log('🔍 Token invalid in optional auth, continuing as anonymous');
    req.user = null;
    next();
  }
};