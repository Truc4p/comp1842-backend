const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  console.log('🔍 Auth middleware called for:', req.method, req.originalUrl);
  console.log('🔍 Headers received:', {
    authorization: req.header("Authorization"),
    xAuthToken: req.header("x-auth-token")
  });
  
  // Try Authorization header first (Bearer token format)
  let token = req.header("Authorization");
  
  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7, token.length); // Remove "Bearer " prefix
    console.log('🔍 Found Bearer token, length:', token.length);
  } else {
    // Fallback to x-auth-token for backward compatibility
    token = req.header("x-auth-token");
    console.log('🔍 No Bearer token, checking x-auth-token:', !!token);
  }

  if (!token) {
    console.log('🔐 No token found in request headers');
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, "secret");
    req.user = decoded.user;
    console.log('🔐 Token verified successfully for user:', decoded.user?.username || decoded.user?.id);
    next();
  } catch (err) {
    console.log('🔐 Token verification failed:', err.message);
    res.status(401).json({ msg: "Token is not valid" });
  }
};