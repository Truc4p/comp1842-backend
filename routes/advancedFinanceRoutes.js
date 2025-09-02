const express = require("express");
const router = express.Router();
const advancedFinanceController = require("../controllers/advancedFinanceController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

/**
 * @swagger
 * tags:
 *   name: AdvancedFinance
 *   description: Advanced financial management and business expense tracking
 */

/**
 * @swagger
 * /advanced-finance/overview:
 *   get:
 *     summary: Get comprehensive financial overview
 *     tags: [AdvancedFinance]
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
 *         description: Comprehensive financial overview
 */
router.get("/overview", auth, role("admin"), advancedFinanceController.getFinancialOverview);

/**
 * @swagger
 * /advanced-finance/expenses:
 *   get:
 *     summary: Get business expenses with filtering and pagination
 *     tags: [AdvancedFinance]
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
 *           default: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [rent, utilities, payroll, marketing, shipping, equipment, software, other]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, overdue, cancelled]
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
 *       - in: query
 *         name: isRecurring
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: vendor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of business expenses with pagination and summary
 *   post:
 *     summary: Create a new business expense
 *     tags: [AdvancedFinance]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - amount
 *               - description
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [rent, utilities, payroll, marketing, shipping, equipment, software, other]
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               description:
 *                 type: string
 *               isRecurring:
 *                 type: boolean
 *                 default: false
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly, quarterly, yearly]
 *               vendor:
 *                 type: string
 *               invoiceNumber:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, credit_card, bank_transfer, check, other]
 *               status:
 *                 type: string
 *                 enum: [pending, paid, overdue, cancelled]
 *               dueDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Business expense created successfully
 */
router.get("/expenses", auth, role("admin"), advancedFinanceController.getBusinessExpenses);
router.post("/expenses", auth, role("admin"), advancedFinanceController.createBusinessExpense);

/**
 * @swagger
 * /advanced-finance/expenses/{id}:
 *   put:
 *     summary: Update a business expense
 *     tags: [AdvancedFinance]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Business expense updated successfully
 *   delete:
 *     summary: Delete a business expense
 *     tags: [AdvancedFinance]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Business expense deleted successfully
 */
router.put("/expenses/:id", auth, role("admin"), advancedFinanceController.updateBusinessExpense);
router.delete("/expenses/:id", auth, role("admin"), advancedFinanceController.deleteBusinessExpense);

/**
 * @swagger
 * /advanced-finance/expense-categories:
 *   get:
 *     summary: Get expense breakdown by categories
 *     tags: [AdvancedFinance]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Expense categories breakdown
 */
router.get("/expense-categories", auth, role("admin"), advancedFinanceController.getExpenseCategoriesBreakdown);

/**
 * @swagger
 * /advanced-finance/recurring-expenses:
 *   get:
 *     summary: Get recurring expenses and upcoming payments
 *     tags: [AdvancedFinance]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Recurring expenses data
 */
router.get("/recurring-expenses", auth, role("admin"), advancedFinanceController.getRecurringExpenses);

/**
 * @swagger
 * /advanced-finance/expense-trends:
 *   get:
 *     summary: Get expense trends and forecasting data
 *     tags: [AdvancedFinance]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 90
 *     responses:
 *       200:
 *         description: Expense trends and forecasting data
 */
router.get("/expense-trends", auth, role("admin"), advancedFinanceController.getExpenseTrends);

/**
 * @swagger
 * /advanced-finance/vendor-analysis:
 *   get:
 *     summary: Get vendor spending analysis
 *     tags: [AdvancedFinance]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 90
 *     responses:
 *       200:
 *         description: Vendor analysis data
 */
router.get("/vendor-analysis", auth, role("admin"), advancedFinanceController.getVendorAnalysis);

/**
 * @swagger
 * /advanced-finance/performance:
 *   get:
 *     summary: Get financial performance metrics with growth comparisons
 *     tags: [AdvancedFinance]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Financial performance metrics
 */
router.get("/performance", auth, role("admin"), advancedFinanceController.getFinancialPerformance);

module.exports = router;
