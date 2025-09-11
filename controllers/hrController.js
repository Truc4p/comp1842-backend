const Employee = require("../models/employee");
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/hr-documents/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Only PDF, DOC, DOCX, JPG, JPEG, PNG files allowed!');
    }
  }
});

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const { department, status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (department) query.department = department;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    
    const employees = await Employee.find(query)
      .populate('manager', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await Employee.countDocuments(query);
    
    res.json({
      employees,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('manager', 'firstName lastName employeeId position')
      .populate('performance.reviewedBy', 'firstName lastName employeeId');
      
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    res.json(employee);
  } catch (err) {
    console.error("Error fetching employee:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Create new employee
exports.createEmployee = async (req, res) => {
  try {
    // Generate employee ID if not provided
    if (!req.body.employeeId) {
      const count = await Employee.countDocuments();
      req.body.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
    }

    const employee = new Employee(req.body);
    await employee.save();
    
    const populatedEmployee = await Employee.findById(employee._id)
      .populate('manager', 'firstName lastName employeeId');
    
    res.status(201).json(populatedEmployee);
  } catch (err) {
    console.error("Error creating employee:", err);
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: "Employee ID or email already exists",
        error: err.message 
      });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const updateData = req.body;

    console.log("Employee ID to update:", employeeId);
    console.log("Update data:", updateData);

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId, 
      updateData, 
      { new: true, runValidators: true }
    ).populate('manager', 'firstName lastName employeeId');

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(updatedEmployee);
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get HR analytics/dashboard data
exports.getHRAnalytics = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments({ status: 'active' });
    const inactiveEmployees = await Employee.countDocuments({ status: { $ne: 'active' } });
    
    // Department breakdown
    const departmentBreakdown = await Employee.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Employment type breakdown
    const employmentTypeBreakdown = await Employee.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$employmentType', count: { $sum: 1 } } }
    ]);
    
    // Salary statistics
    const salaryStats = await Employee.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          averageSalary: { $avg: '$salary.amount' },
          minSalary: { $min: '$salary.amount' },
          maxSalary: { $max: '$salary.amount' },
          totalPayroll: { $sum: '$salary.amount' }
        }
      }
    ]);
    
    // Recent hires (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentHires = await Employee.find({
      startDate: { $gte: thirtyDaysAgo },
      status: 'active'
    }).sort({ startDate: -1 }).limit(10);
    
    // Upcoming work anniversaries (next 60 days)
    const now = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(now.getDate() + 60);
    
    const upcomingAnniversaries = await Employee.find({
      status: 'active'
    }).then(employees => {
      return employees.filter(emp => {
        const anniversary = new Date(emp.startDate);
        anniversary.setFullYear(now.getFullYear());
        if (anniversary < now) {
          anniversary.setFullYear(now.getFullYear() + 1);
        }
        return anniversary <= sixtyDaysFromNow;
      }).sort((a, b) => {
        const aAnniversary = new Date(a.startDate);
        aAnniversary.setFullYear(now.getFullYear());
        if (aAnniversary < now) aAnniversary.setFullYear(now.getFullYear() + 1);
        
        const bAnniversary = new Date(b.startDate);
        bAnniversary.setFullYear(now.getFullYear());
        if (bAnniversary < now) bAnniversary.setFullYear(now.getFullYear() + 1);
        
        return aAnniversary - bAnniversary;
      }).slice(0, 10);
    });
    
    // Performance ratings distribution
    const performanceStats = await Employee.aggregate([
      { $match: { status: 'active', 'performance.0': { $exists: true } } },
      { $unwind: '$performance' },
      { $sort: { 'performance.reviewDate': -1 } },
      { $group: { _id: '$_id', latestRating: { $first: '$performance.rating' } } },
      { $group: { _id: '$latestRating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      overview: {
        totalEmployees,
        activeEmployees: totalEmployees,
        inactiveEmployees,
        totalPayroll: salaryStats[0]?.totalPayroll || 0,
        averageSalary: salaryStats[0]?.averageSalary || 0
      },
      departmentBreakdown,
      employmentTypeBreakdown,
      salaryStats: salaryStats[0] || {},
      recentHires,
      upcomingAnniversaries,
      performanceStats
    });
  } catch (err) {
    console.error("Error fetching HR analytics:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Add performance review
exports.addPerformanceReview = async (req, res) => {
  try {
    const { rating, comments } = req.body;
    const employeeId = req.params.id;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    employee.performance.push({
      rating,
      comments,
      reviewedBy: req.user.id, // Assuming auth middleware provides user info
      reviewDate: new Date()
    });
    
    await employee.save();
    
    const updatedEmployee = await Employee.findById(employeeId)
      .populate('performance.reviewedBy', 'firstName lastName employeeId');
    
    res.json(updatedEmployee);
  } catch (err) {
    console.error("Error adding performance review:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Update leave balance
exports.updateLeaveBalance = async (req, res) => {
  try {
    const { vacation, sick, personal } = req.body;
    const employeeId = req.params.id;
    
    const employee = await Employee.findByIdAndUpdate(
      employeeId,
      { 
        'leaveBalance.vacation': vacation,
        'leaveBalance.sick': sick,
        'leaveBalance.personal': personal
      },
      { new: true }
    );
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    res.json(employee);
  } catch (err) {
    console.error("Error updating leave balance:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Search employees
exports.searchEmployees = async (req, res) => {
  try {
    const { q, department, status } = req.query;
    
    const query = {};
    if (department) query.department = department;
    if (status) query.status = status;
    
    if (q) {
      query.$or = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { employeeId: { $regex: q, $options: 'i' } },
        { position: { $regex: q, $options: 'i' } }
      ];
    }
    
    const employees = await Employee.find(query)
      .populate('manager', 'firstName lastName employeeId')
      .sort({ firstName: 1 })
      .limit(50);
    
    res.json(employees);
  } catch (err) {
    console.error("Error searching employees:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Upload employee document
exports.uploadDocument = [
  upload.single('document'),
  async (req, res) => {
    try {
      const employeeId = req.params.id;
      const { documentType, documentName } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      employee.documents.push({
        name: documentName || req.file.originalname,
        type: documentType || 'other',
        filePath: req.file.path,
        uploadDate: new Date()
      });
      
      await employee.save();
      
      res.json({
        message: "Document uploaded successfully",
        document: employee.documents[employee.documents.length - 1]
      });
    } catch (err) {
      console.error("Error uploading document:", err);
      res.status(500).json({ message: "Server Error", error: err.message });
    }
  }
];

// Get department statistics
exports.getDepartmentStats = async (req, res) => {
  try {
    const departmentStats = await Employee.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$department',
          employeeCount: { $sum: 1 },
          averageSalary: { $avg: '$salary.amount' },
          totalSalary: { $sum: '$salary.amount' },
          employmentTypes: { $push: '$employmentType' }
        }
      },
      {
        $project: {
          department: '$_id',
          employeeCount: 1,
          averageSalary: { $round: ['$averageSalary', 2] },
          totalSalary: 1,
          fullTimeCount: {
            $size: {
              $filter: {
                input: '$employmentTypes',
                cond: { $eq: ['$$this', 'full_time'] }
              }
            }
          },
          partTimeCount: {
            $size: {
              $filter: {
                input: '$employmentTypes',
                cond: { $eq: ['$$this', 'part_time'] }
              }
            }
          }
        }
      },
      { $sort: { employeeCount: -1 } }
    ]);
    
    res.json(departmentStats);
  } catch (err) {
    console.error("Error fetching department stats:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get payroll summary
exports.getPayrollSummary = async (req, res) => {
  try {
    const { department, month, year } = req.query;
    
    const query = { status: 'active' };
    if (department) query.department = department;
    
    const employees = await Employee.find(query);
    
    let totalPayroll = 0;
    const departmentPayroll = {};
    const employmentTypePayroll = {};
    
    employees.forEach(emp => {
      const monthlySalary = emp.salary.payFrequency === 'yearly' 
        ? emp.salary.amount / 12 
        : emp.salary.payFrequency === 'hourly'
        ? emp.salary.amount * 160 // Assuming 160 hours per month
        : emp.salary.amount;
      
      totalPayroll += monthlySalary;
      
      if (!departmentPayroll[emp.department]) {
        departmentPayroll[emp.department] = 0;
      }
      departmentPayroll[emp.department] += monthlySalary;
      
      if (!employmentTypePayroll[emp.employmentType]) {
        employmentTypePayroll[emp.employmentType] = 0;
      }
      employmentTypePayroll[emp.employmentType] += monthlySalary;
    });
    
    res.json({
      totalMonthlyPayroll: Math.round(totalPayroll * 100) / 100,
      departmentPayroll,
      employmentTypePayroll,
      employeeCount: employees.length
    });
  } catch (err) {
    console.error("Error fetching payroll summary:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Bulk update employees
exports.bulkUpdateEmployees = async (req, res) => {
  try {
    const { employeeIds, updateData } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ message: "Employee IDs array is required" });
    }
    
    const result = await Employee.updateMany(
      { _id: { $in: employeeIds } },
      updateData
    );
    
    res.json({
      message: `${result.modifiedCount} employees updated successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error("Error bulk updating employees:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get employees by manager
exports.getEmployeesByManager = async (req, res) => {
  try {
    const managerId = req.params.managerId;
    
    const employees = await Employee.find({ 
      manager: managerId,
      status: 'active'
    }).populate('manager', 'firstName lastName employeeId');
    
    res.json(employees);
  } catch (err) {
    console.error("Error fetching employees by manager:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Export for multer middleware
exports.uploadMiddleware = upload;
