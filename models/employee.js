const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: false,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  department: {
    type: String,
    required: true,
    enum: ["engineering", "marketing", "sales", "finance", "hr", "operations", "customer_service", "design", "management"]
  },
  position: {
    type: String,
    required: true,
  },
  employmentType: {
    type: String,
    enum: ["full_time", "part_time", "contract", "intern"],
    default: "full_time"
  },
  status: {
    type: String,
    enum: ["active", "inactive", "terminated", "on_leave"],
    default: "active"
  },
  salary: {
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD"
    },
    payFrequency: {
      type: String,
      enum: ["hourly", "monthly", "yearly"],
      default: "monthly"
    }
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: false,
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: false,
  },
  skills: [{
    type: String
  }],
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  documents: [{
    name: String,
    type: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    filePath: String
  }],
  performance: [{
    reviewDate: {
      type: Date,
      default: Date.now
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    }
  }],
  leaveBalance: {
    vacation: {
      type: Number,
      default: 0
    },
    sick: {
      type: Number,
      default: 0
    },
    personal: {
      type: Number,
      default: 0
    }
  },
  benefits: {
    healthInsurance: {
      type: Boolean,
      default: false
    },
    dentalInsurance: {
      type: Boolean,
      default: false
    },
    retirementPlan: {
      type: Boolean,
      default: false
    },
    lifeInsurance: {
      type: Boolean,
      default: false
    }
  },
  notes: {
    type: String,
    required: false,
  },
  profilePhoto: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Update the updatedAt field on save
employeeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for years of service
employeeSchema.virtual('yearsOfService').get(function() {
  const now = new Date();
  const start = new Date(this.startDate);
  return Math.floor((now - start) / (365.25 * 24 * 60 * 60 * 1000));
});

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
