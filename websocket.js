const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const ChatConversation = require('./models/chatConversation');

class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      port: 8080,
      verifyClient: this.verifyClient.bind(this)
    });
    
    // Store connections by sessionId for customers and by userId for admins
    this.customerConnections = new Map(); // sessionId -> { ws, userId, userRole }
    this.adminConnections = new Map(); // userId -> { ws, userRole }
    
    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('🔗 WebSocket server running on port 8080');
  }

  // Verify client connection (optional authentication)
  verifyClient(info) {
    // For now, allow all connections
    // You can add authentication here if needed
    return true;
  }

  handleConnection(ws, req) {
    console.log('🔌 New WebSocket connection established');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        await this.handleMessage(ws, data);
      } catch (error) {
        console.error('❌ Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      // Remove connection from customer tracking
      for (const [sessionId, conn] of this.customerConnections.entries()) {
        if (conn.ws === ws) {
          this.customerConnections.delete(sessionId);
          console.log(`🔌 Customer WebSocket disconnected for session: ${sessionId}`);
          return;
        }
      }
      
      // Remove connection from admin tracking
      for (const [userId, conn] of this.adminConnections.entries()) {
        if (conn.ws === ws) {
          this.adminConnections.delete(userId);
          console.log(`🔌 Admin WebSocket disconnected for user: ${userId}`);
          return;
        }
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  async handleMessage(ws, data) {
    const { type, sessionId, content, token, userId } = data;

    switch (type) {
      case 'register':
        await this.registerConnection(ws, sessionId, token);
        break;
      
      case 'register_admin':
        await this.registerAdminConnection(ws, userId, token);
        break;
      
      case 'staff_message':
        await this.handleStaffMessage(sessionId, content);
        break;
        
      default:
        console.log('❓ Unknown message type:', type);
    }
  }

  async registerConnection(ws, sessionId, token) {
    try {
      let userId = null;
      let userRole = 'anonymous';

      // Try to extract user info from token if provided
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.id;
          userRole = decoded.role;
        } catch (err) {
          console.log('⚠️ Invalid token, treating as anonymous');
        }
      }

      // Store the customer connection
      this.customerConnections.set(sessionId, {
        ws,
        userId,
        userRole
      });

      console.log(`✅ Registered customer WebSocket connection: ${sessionId} (${userRole})`);

      // Send confirmation
      ws.send(JSON.stringify({
        type: 'registered',
        sessionId,
        status: 'connected'
      }));

    } catch (error) {
      console.error('❌ Error registering connection:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Registration failed'
      }));
    }
  }

  async registerAdminConnection(ws, userId, token) {
    try {
      let userRole = 'admin';

      // Verify admin token
      if (token) {
        try {
          console.log('🔐 Verifying admin token...', {
            tokenPresent: !!token,
            tokenStart: token ? token.substring(0, 20) + '...' : 'N/A',
            jwtSecretPresent: !!process.env.JWT_SECRET,
            actualSecret: 'secret' // Use same as auth middleware
          });
          
          const decoded = jwt.verify(token, "secret"); // Use same secret as auth middleware
          console.log('🔓 Token decoded successfully:', {
            id: decoded.user?.id,
            role: decoded.user?.role,
            username: decoded.user?.username
          });
          
          if (!decoded.user || (decoded.user.role !== 'admin' && decoded.user.role !== 'staff')) {
            throw new Error(`Insufficient permissions: role is ${decoded.user?.role}`);
          }
          userId = decoded.user.id;
          userRole = decoded.user.role;
        } catch (err) {
          console.error('⚠️ Admin token verification failed:', err.message);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Authentication failed'
          }));
          return;
        }
      } else {
        console.error('⚠️ No token provided for admin registration');
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Token required'
        }));
        return;
      }

      // Store the admin connection
      this.adminConnections.set(userId, {
        ws,
        userRole
      });

      console.log(`✅ Registered admin WebSocket connection: ${userId} (${userRole})`);

      // Send confirmation
      ws.send(JSON.stringify({
        type: 'admin_registered',
        userId,
        status: 'connected'
      }));

    } catch (error) {
      console.error('❌ Error registering admin connection:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Admin registration failed'
      }));
    }
  }

  // Send message to a specific session (customer)
  async sendToSession(sessionId, message) {
    const connection = this.customerConnections.get(sessionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Send staff reply to customer via WebSocket
  async sendStaffReply(sessionId, content) {
    const message = {
      type: 'staff_reply',
      message: content,
      timestamp: new Date().toISOString()
    };

    const sent = await this.sendToSession(sessionId, message);
    if (sent) {
      console.log(`📤 Sent staff message via WebSocket to session: ${sessionId}`);
    } else {
      console.log(`⚠️ Could not send via WebSocket to session: ${sessionId} (not connected)`);
    }
    return sent;
  }

  // Handle incoming staff messages (when staff replies via admin interface)
  async handleStaffMessage(sessionId, content) {
    // This would be called when staff sends a message
    // The message should already be saved to DB by the staff reply endpoint
    // We just need to notify the customer via WebSocket
    await this.sendStaffReply(sessionId, content);
  }

  // Send customer message to all connected admins
  async broadcastCustomerMessage(sessionId, message, customerName = 'Customer') {
    const adminMessage = {
      type: 'customer_message',
      sessionId,
      message,
      customerName,
      timestamp: new Date().toISOString()
    };

    let sent = 0;
    for (const [userId, connection] of this.adminConnections.entries()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(adminMessage));
        sent++;
      }
    }

    console.log(`📤 Broadcasted customer message to ${sent} admin(s) for session: ${sessionId}`);
    return sent > 0;
  }

  // Get connection status for a customer session
  isSessionConnected(sessionId) {
    const connection = this.customerConnections.get(sessionId);
    return connection && connection.ws.readyState === WebSocket.OPEN;
  }

  // Get connection status for an admin
  isAdminConnected(userId) {
    const connection = this.adminConnections.get(userId);
    return connection && connection.ws.readyState === WebSocket.OPEN;
  }

  // Get number of connected admins
  getConnectedAdminCount() {
    let count = 0;
    for (const connection of this.adminConnections.values()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        count++;
      }
    }
    return count;
  }

  // Broadcast to all connections (if needed)
  broadcast(message) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Close all connections
  close() {
    this.wss.close();
  }
}

module.exports = WebSocketManager;