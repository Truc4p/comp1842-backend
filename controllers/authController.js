const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
// const role = require("../middleware/role");

const validAdminKey = "secret"; // Define secret admin key

exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, role, adminKey } = req.body;

  // console.log("Role:", role, "Admin Key:", adminKey); // Debugging line to check the role and admin key

  // Validate admin key if the role is admin
  if (role === "admin" && adminKey !== validAdminKey) {
    return res.status(400).json({ msg: "Invalid admin key" });
  }

  try {
    let user = await User.findOne({ username });

    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    user = new User({ username, password, role });

    await user.save();

    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
    };

    jwt.sign(payload, "secret", { expiresIn: "12h" }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

exports.loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ msg: "Invalid Credentials" });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid Credentials" });
    }

    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };

    jwt.sign(payload, "secret", { expiresIn: "12h" }, (err, token) => {
      if (err) throw err;
      console.log("User role in backend:", user.role); // Debugging line to check the role
      res.json({ token, role: user.role, userId: user.id }); // Include role and userId in the response
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// exports.getUser = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select("-password");
//     res.json(user);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server error");
//   }
// };