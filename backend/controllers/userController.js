const bcrypt = require("bcryptjs");
const User = require("../models/User");

// @route  GET /api/users/profile
// @desc   Return the logged-in user's profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
};

// @route  PUT /api/users/profile
// @desc   Update name, email, and/or password for the logged-in user
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If changing email, make sure no other account already uses it
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: "Email already in use" });
      }
      user.email = email;
    }

    if (name) user.name = name;

    // Only touch the password if a new one was actually provided —
    // the pre-save hook in User.js re-hashes it automatically
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      user.password = password;
    }

    await user.save();

    res.status(200).json({
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

// @route  DELETE /api/users/profile
// @desc   Permanently delete the logged-in user's account
exports.deleteProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete account", error: error.message });
  }
};
