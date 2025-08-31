const express = require("express");
const router = express.Router();
const { 
  triggerRecurringExpenses, 
  getAutomationStats 
} = require("../middleware/cashFlowAutomation");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

/**
 * 🤖 AUTOMATION ROUTES - Phase 4
 * 
 * These routes handle automated cash flow operations:
 * - Manual triggers for testing
 * - Automation statistics and monitoring
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AutomationStats:
 *       type: object
 *       properties:
 *         totalAutomatedTransactions:
 *           type: number
 *         orderBasedTransactions:
 *           type: number
 *         recurringExpenses:
 *           type: number
 *         totalAutomatedInflows:
 *           type: number
 *         totalAutomatedOutflows:
 *           type: number
 *         categoryBreakdown:
 *           type: object
 */

/**
 * @swagger
 * /automation/trigger-recurring:
 *   post:
 *     summary: Manually trigger recurring expenses generation
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recurring expenses check completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /automation/stats:
 *   get:
 *     summary: Get automation statistics
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: number
 *           default: 30
 *         description: Number of days to include in statistics
 *     responses:
 *       200:
 *         description: Automation statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AutomationStats'
 */

/**
 * @swagger
 * /automation/templates:
 *   get:
 *     summary: Get recurring expense templates
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recurring expense templates
 */

// 🔄 Manually trigger recurring expenses (for testing/admin override)
router.post("/trigger-recurring", auth, role(['admin']), triggerRecurringExpenses);

// 📊 Get automation statistics
router.get("/stats", auth, role(['admin']), getAutomationStats);

// 📋 Get recurring expense templates (for admin review)
router.get("/templates", auth, role(['admin']), (req, res) => {
  const templates = [
    {
      category: 'rent',
      amount: 2500,
      description: 'Monthly office rent',
      frequency: 'monthly',
      dayOfMonth: 1
    },
    {
      category: 'utilities',
      amount: 300,
      description: 'Monthly utilities (electricity, internet, water)',
      frequency: 'monthly',
      dayOfMonth: 5
    },
    {
      category: 'payroll',
      amount: 8000,
      description: 'Monthly staff salaries',
      frequency: 'monthly',
      dayOfMonth: 15
    },
    {
      category: 'marketing',
      amount: 1200,
      description: 'Monthly digital marketing spend',
      frequency: 'monthly',
      dayOfMonth: 10
    },
    {
      category: 'operating_expenses',
      amount: 500,
      description: 'Software subscriptions and licenses',
      frequency: 'monthly',
      dayOfMonth: 1
    }
  ];
  
  res.json({
    success: true,
    templates,
    message: "Recurring expense templates configured for automated generation"
  });
});

module.exports = router;
