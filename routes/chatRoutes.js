const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authenticateToken = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");

/**
 * @swagger
 * components:
 *   schemas:
 *     FAQ:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         question:
 *           type: string
 *         answer:
 *           type: string
 *         category:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         priority:
 *           type: number
 *     ChatMessage:
 *       type: object
 *       properties:
 *         role:
 *           type: string
 *           enum: [user, assistant]
 *         content:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         messageType:
 *           type: string
 *           enum: [text, predefined, ai]
 */

/**
 * @swagger
 * /chat/faqs:
 *   get:
 *     summary: Get predefined FAQs (Flow 1)
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter FAQs by category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of FAQs to return
 *     responses:
 *       200:
 *         description: List of FAQs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FAQ'
 */
router.get("/faqs", chatController.getFAQs);

/**
 * @swagger
 * /chat/faq/{faqId}/answer:
 *   post:
 *     summary: Get specific FAQ answer (Flow 1)
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: faqId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: FAQ answer
 *       404:
 *         description: FAQ not found
 */
router.post("/faq/:faqId/answer", chatController.getFAQAnswer);

/**
 * @swagger
 * /chat/ai:
 *   post:
 *     summary: AI-powered conversation (Flow 2)
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: User's message
 *               sessionId:
 *                 type: string
 *                 description: Session ID (will be generated if not provided)
 *     responses:
 *       200:
 *         description: AI response with related products and FAQs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     sessionId:
 *                       type: string
 *                     intent:
 *                       type: string
 *                     confidence:
 *                       type: number
 *                     relatedProducts:
 *                       type: array
 *                     relatedFAQs:
 *                       type: array
 */
router.post("/ai", chatController.chatWithAI);

/**
 * @swagger
 * /chat/conversation/{sessionId}:
 *   get:
 *     summary: Get conversation history
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of messages to return
 *     responses:
 *       200:
 *         description: Conversation history
 */
router.get("/conversation/:sessionId", chatController.getConversationHistory);

// Admin routes for FAQ management
/**
 * @swagger
 * /chat/admin/faq:
 *   post:
 *     summary: Create new FAQ (Admin only)
 *     tags: [Chat Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               priority:
 *                 type: number
 *     responses:
 *       201:
 *         description: FAQ created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post("/admin/faq", authenticateToken, chatController.createFAQ);

/**
 * @swagger
 * /chat/admin/faq/{faqId}:
 *   put:
 *     summary: Update FAQ (Admin only)
 *     tags: [Chat Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: faqId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               priority:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: FAQ updated successfully
 *       404:
 *         description: FAQ not found
 */
router.put("/admin/faq/:faqId", authenticateToken, chatController.updateFAQ);

/**
 * @swagger
 * /chat/admin/faq/{faqId}:
 *   delete:
 *     summary: Delete FAQ (Admin only)
 *     tags: [Chat Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: faqId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FAQ deleted successfully
 *       404:
 *         description: FAQ not found
 */
router.delete("/admin/faq/:faqId", authenticateToken, chatController.deleteFAQ);

// Staff chat routes for customers
/**
 * @swagger
 * /chat/staff/connect:
 *   post:
 *     summary: Connect customer to staff chat
 *     tags: [Staff Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connected to staff chat
 */
router.post("/staff/connect", optionalAuth, chatController.connectToStaff);

/**
 * @swagger
 * /chat/staff/message:
 *   post:
 *     summary: Customer sends message to staff
 *     tags: [Staff Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - message
 *             properties:
 *               sessionId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent to staff
 */
router.post("/staff/message", optionalAuth, chatController.sendMessageToStaff);

/**
 * @swagger
 * /chat/staff/messages/{sessionId}:
 *   get:
 *     summary: Get new staff messages for customer
 *     tags: [Staff Chat]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: New staff messages
 */
router.get("/staff/messages/:sessionId", chatController.getStaffMessages);

// Admin routes for staff chat management
/**
 * @swagger
 * /chat/admin/active-chats:
 *   get:
 *     summary: Get all active customer chats (Admin only)
 *     tags: [Staff Chat Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active customer chats
 */
router.get("/admin/active-chats", authenticateToken, chatController.getActiveChats);

/**
 * @swagger
 * /chat/admin/messages/{sessionId}:
 *   get:
 *     summary: Get messages for a specific chat (Admin only)
 *     tags: [Staff Chat Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat messages
 */
router.get("/admin/messages/:sessionId", authenticateToken, chatController.getChatMessages);

/**
 * @swagger
 * /chat/admin/reply:
 *   post:
 *     summary: Staff replies to customer (Admin only)
 *     tags: [Staff Chat Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - message
 *             properties:
 *               sessionId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reply sent successfully
 */
router.post("/admin/reply", authenticateToken, chatController.staffReply);

/**
 * @swagger
 * /chat/find-user-conversation:
 *   get:
 *     summary: Find existing conversation for authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's existing conversation found or null if none exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversation:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         sessionId:
 *                           type: string
 *                         isStaffChat:
 *                           type: boolean
 *                         waitingForStaff:
 *                           type: boolean
 *                         lastActivity:
 *                           type: string
 *                           format: date-time
 */
router.get("/find-user-conversation", optionalAuth, chatController.findUserConversation);

module.exports = router;
