require('dotenv').config();
const app = require("./app");
const WebSocketManager = require("./websocket");
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  Warning: GEMINI_API_KEY not set. AI chat functionality will use fallback responses.');
  } else {
    console.log('✅ Gemini AI is configured and ready for chat assistance.');
  }
});

// Initialize WebSocket server
const wsManager = new WebSocketManager(server);

// Make WebSocket manager available to other modules
app.locals.wsManager = wsManager;