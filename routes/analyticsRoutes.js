const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics and reporting endpoints
 */

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get overall dashboard statistics
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalOrders:
 *                   type: number
 *                 totalProducts:
 *                   type: number
 *                 totalUsers:
 *                   type: number
 *                 totalCategories:
 *                   type: number
 *                 totalRevenue:
 *                   type: number
 *                 averageOrderValue:
 *                   type: number
 *                 recentOrders:
 *                   type: number
 *                 lowStockProducts:
 *                   type: number
 */
router.get("/dashboard", auth, role(["admin"]), analyticsController.getDashboardStats);

/**
 * @swagger
 * /analytics/sales:
 *   get:
 *     summary: Get sales analytics
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: "30"
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Sales analytics data
 */
router.get("/sales", auth, role(["admin"]), analyticsController.getSalesAnalytics);

/**
 * @swagger
 * /analytics/products:
 *   get:
 *     summary: Get product analytics
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Product analytics data
 */
router.get("/products", auth, role(["admin"]), analyticsController.getProductAnalytics);

/**
 * @swagger
 * /analytics/users:
 *   get:
 *     summary: Get user analytics
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: "30"
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: User analytics data
 */
router.get("/users", auth, role(["admin"]), analyticsController.getUserAnalytics);

/**
 * @swagger
 * /analytics/orders:
 *   get:
 *     summary: Get order analytics
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Order analytics data
 */
router.get("/orders", auth, role(["admin"]), analyticsController.getOrderAnalytics);

module.exports = router;
