const User = require("../models/user");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err); // Log the error
    res.status(500).send("Server Error");
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).send("User not found");
    }
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;

    console.log("User ID to update:", userId);
    console.log("Update data:", updateData);

    // If password is being updated, hash it before saving
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });

    if (!updatedUser) {
      console.log("User not found");
      return res.status(404).send("User not found");
    }

    console.log("Updated user:", updatedUser);
    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).send("Server Error");
  }
};

// exports.deleteUser = async (req, res) => {

// };