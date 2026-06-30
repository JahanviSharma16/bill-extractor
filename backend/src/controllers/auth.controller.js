const jwt = require("jsonwebtoken");
const User = require("../models/User");

const createToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const userCount = await User.countDocuments();
    const assignedRole =
      userCount === 0 ? "admin" : role === "admin" ? "user" : "user";

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
    });

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = createToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProfile = async (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
};

module.exports = {
  register,
  login,
  getProfile,
};
