const express = require("express");
const router = express.Router();
const hrController = require("../controllers/hrController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

/**
 * @swagger
 * tags:
 *   name: HR
 *   description: Human Resource management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       required:
 *         - employeeId
 *         - firstName
 *         - lastName
 *         - email
 *         - department
 *         - position
 *         - startDate
 *         - salary
 *       properties:
 *         employeeId:
 *           type: string
 *           description: Unique employee identifier
 *         firstName:
 *           type: string
 *           description: Employee's first name
 *         lastName:
 *           type: string
 *           description: Employee's last name
 *         email:
 *           type: string
 *           description: Employee's email address
 *         phone:
 *           type: string
 *           description: Employee's phone number
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *         department:
 *           type: string
 *           enum: [engineering, marketing, sales, finance, hr, operations, customer_service, design, management]
 *         position:
 *           type: string
 *           description: Employee's job position
 *         employmentType:
 *           type: string
 *           enum: [full_time, part_time, contract, intern]
 *         status:
 *           type: string
 *           enum: [active, inactive, terminated, on_leave]
 *         salary:
 *           type: object
 *           properties:
 *             amount:
 *               type: number
 *             currency:
 *               type: string
 *             payFrequency:
 *               type: string
 *               enum: [hourly, monthly, yearly]
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         manager:
 *           type: string
 *           description: Manager's employee ID
 */

/**
 * @swagger
 * /hr/employees:
 *   get:
 *     summary: Get all employees
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by employment status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employees:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 total:
 *                   type: integer
 */
router.get("/employees", auth, role(["admin"]), hrController.getAllEmployees);

/**
 * @swagger
 * /hr/employees/search:
 *   get:
 *     summary: Search employees
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 */
router.get("/employees/search", auth, role(["admin"]), hrController.searchEmployees);

/**
 * @swagger
 * /hr/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 */
router.get("/employees/:id", auth, role(["admin"]), hrController.getEmployeeById);

/**
 * @swagger
 * /hr/employees:
 *   post:
 *     summary: Create new employee
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Invalid input or employee already exists
 */
router.post("/employees", auth, role(["admin"]), hrController.createEmployee);

/**
 * @swagger
 * /hr/employees/{id}:
 *   put:
 *     summary: Update employee
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 */
router.put("/employees/:id", auth, role(["admin"]), hrController.updateEmployee);

/**
 * @swagger
 * /hr/employees/{id}:
 *   delete:
 *     summary: Delete employee
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 */
router.delete("/employees/:id", auth, role(["admin"]), hrController.deleteEmployee);

/**
 * @swagger
 * /hr/analytics:
 *   get:
 *     summary: Get HR analytics and dashboard data
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: HR analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                 departmentBreakdown:
 *                   type: array
 *                 employmentTypeBreakdown:
 *                   type: array
 *                 recentHires:
 *                   type: array
 *                 upcomingAnniversaries:
 *                   type: array
 */
router.get("/analytics", auth, role(["admin"]), hrController.getHRAnalytics);

/**
 * @swagger
 * /hr/employees/{id}/performance:
 *   post:
 *     summary: Add performance review
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Performance review added successfully
 *       404:
 *         description: Employee not found
 */
router.post("/employees/:id/performance", auth, role(["admin"]), hrController.addPerformanceReview);

/**
 * @swagger
 * /hr/employees/{id}/leave-balance:
 *   put:
 *     summary: Update employee leave balance
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vacation:
 *                 type: number
 *               sick:
 *                 type: number
 *               personal:
 *                 type: number
 *     responses:
 *       200:
 *         description: Leave balance updated successfully
 *       404:
 *         description: Employee not found
 */
router.put("/employees/:id/leave-balance", auth, role(["admin"]), hrController.updateLeaveBalance);

/**
 * @swagger
 * /hr/employees/{id}/documents:
 *   post:
 *     summary: Upload employee document
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *               documentName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *       404:
 *         description: Employee not found
 */
router.post("/employees/:id/documents", auth, role(["admin"]), hrController.uploadDocument);

/**
 * @swagger
 * /hr/department-stats:
 *   get:
 *     summary: Get department statistics
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Department statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   department:
 *                     type: string
 *                   employeeCount:
 *                     type: number
 *                   averageSalary:
 *                     type: number
 *                   totalSalary:
 *                     type: number
 */
router.get("/department-stats", auth, role(["admin"]), hrController.getDepartmentStats);

/**
 * @swagger
 * /hr/payroll-summary:
 *   get:
 *     summary: Get payroll summary
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Month (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year
 *     responses:
 *       200:
 *         description: Payroll summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalMonthlyPayroll:
 *                   type: number
 *                 departmentPayroll:
 *                   type: object
 *                 employmentTypePayroll:
 *                   type: object
 *                 employeeCount:
 *                   type: number
 */
router.get("/payroll-summary", auth, role(["admin"]), hrController.getPayrollSummary);

/**
 * @swagger
 * /hr/employees/bulk-update:
 *   put:
 *     summary: Bulk update employees
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               updateData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Employees updated successfully
 *       400:
 *         description: Invalid input
 */
router.put("/employees/bulk-update", auth, role(["admin"]), hrController.bulkUpdateEmployees);

/**
 * @swagger
 * /hr/employees/manager/{managerId}:
 *   get:
 *     summary: Get employees by manager
 *     tags: [HR]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: managerId
 *         schema:
 *           type: string
 *         required: true
 *         description: Manager's employee ID
 *     responses:
 *       200:
 *         description: List of employees under the manager
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 */
router.get("/employees/manager/:managerId", auth, role(["admin"]), hrController.getEmployeesByManager);

module.exports = router;
