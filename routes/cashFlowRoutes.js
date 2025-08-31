const express = require("express");
const router = express.Router();
const cashFlowController = require("../controllers/cashFlowController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

/**
 * @swagger
 * tags:
 *   name: CashFlow
 *   description: Cash flow management and analytics endpoints
 */

/**
 * @swagger
 * /cashflow/dashboard:
 *   get:
 *     summary: Get cash flow dashboard summary
 *     tags: [CashFlow]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Cash flow dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentBalance:
 *                   type: number
 *                 netCashFlow:
 *                   type: number
 *                 totalInflows:
 *                   type: number
 *                 totalOutflows:
 *                   type: number
 *                 cashBurnRate:
 *                   type: number
 *                 runway:
 *                   type: number
 *                 period:
 *                   type: integer
 */
router.get("/dashboard", auth, role("admin"), cashFlowController.getCashFlowDashboard);

/**
 * @swagger
 * /cashflow/history:
 *   get:
 *     summary: Get historical cash flow data for charts
 *     tags: [CashFlow]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days of history
 *     responses:
 *       200:
 *         description: Historical cash flow data
 */
router.get("/history", auth, role("admin"), cashFlowController.getCashFlowHistory);

/**
 * @swagger
 * /cashflow/categories:
 *   get:
 *     summary: Get cash flow breakdown by categories
 *     tags: [CashFlow]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Category breakdown data
 */
router.get("/categories", auth, role("admin"), cashFlowController.getCashFlowByCategory);

/**
 * @swagger
 * /cashflow/forecast:
 *   get:
 *     summary: Get 3-month cash flow forecast
 *     tags: [CashFlow]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Cash flow forecast data
 */
router.get("/forecast", auth, role("admin"), cashFlowController.getCashFlowForecast);

/**
 * @swagger
 * /cashflow/transactions:
 *   get:
 *     summary: Get all cash flow transactions with pagination
 *     tags: [CashFlow]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [inflow, outflow]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of cash flow transactions
 *   post:
 *     summary: Create a manual cash flow transaction
 *     tags: [CashFlow]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - category
 *               - amount
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [inflow, outflow]
 *               category:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Transaction created successfully
 */
router.get("/transactions", auth, role("admin"), cashFlowController.getCashFlowTransactions);
router.post("/transactions", auth, role("admin"), cashFlowController.createCashFlowTransaction);

/**
 * @swagger
 * /cashflow/dashboard-sync:
 *   get:
 *     summary: Get cash flow dashboard with optional real data sync
 *     tags: [CashFlow]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *       - in: query
 *         name: sync
 *         schema:
 *           type: string
 *           default: "false"
 *         description: Whether to sync real data before calculating dashboard
 *     responses:
 *       200:
 *         description: Cash flow dashboard data with sync status
 */
router.get("/dashboard-sync", auth, role("admin"), cashFlowController.getCashFlowDashboardWithSync);

/**
 * @swagger
 * /cashflow/sync:
 *   post:
 *     summary: Sync all real data to cash flow transactions
 *     tags: [CashFlow]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-31"
 *     responses:
 *       200:
 *         description: Data sync completed successfully
 */
router.post("/sync", auth, role("admin"), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: "Start date and end date are required" 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const results = await cashFlowController.syncAllDataToFlowTransactions(start, end);
    
    res.json({
      success: true,
      results,
      message: "Cash flow data sync completed successfully"
    });
  } catch (error) {
    console.error("Error in sync endpoint:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error during sync" 
    });
  }
});

/**
 * @swagger
 * /cashflow/sync-orders:
 *   post:
 *     summary: Sync completed orders to cash flow transactions
 *     tags: [CashFlow]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for order sync (optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for order sync (optional)
 *     responses:
 *       200:
 *         description: Orders successfully synced to cash flow transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 syncedCount:
 *                   type: integer
 *                 totalOrdersChecked:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
router.post("/sync-orders", auth, role("admin"), cashFlowController.syncOrdersToTransactions);

module.exports = router;
