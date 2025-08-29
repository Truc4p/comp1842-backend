const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authenticateToken = require("../middleware/auth");

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

module.exports = router;
