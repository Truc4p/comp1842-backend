const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Only log non-polling requests to reduce noise
  const isPollingRequest = req.originalUrl.includes('/chat/admin/active-chats') || 
                          req.originalUrl.includes('/chat/admin/messages/') ||
                          req.originalUrl.includes('/chat/staff/messages/');
  
  if (!isPollingRequest) {
    console.log('🔍 Auth middleware called for:', req.method, req.originalUrl);
  }
  
  // Try Authorization header first (Bearer token format)
  let token = req.header("Authorization");
  
  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7, token.length); // Remove "Bearer " prefix
  } else {
    // Fallback to x-auth-token for backward compatibility
    token = req.header("x-auth-token");
  }

  if (!token) {
    console.log('🔐 No token found in request headers for:', req.originalUrl);
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, "secret");
    req.user = decoded.user;
    
    // Only log successful auth for non-polling requests
    if (!isPollingRequest) {
      console.log('🔐 Token verified successfully for user:', decoded.user?.username || decoded.user?.id);
    }
    
    next();
  } catch (err) {
    console.log('🔐 Token verification failed for:', req.originalUrl, err.message);
    res.status(401).json({ msg: "Token is not valid" });
  }
};