const jwt = require("jsonwebtoken");
const { User } = require("../models/User");
const { env } = require("../config/env");

// Socket.IO middleware — runs once per connection attempt
// Frontend sends token in: socket = io(URL, { auth: { token: 'Bearer xxx' } })
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication token is required"));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.userId).lean();

    if (!user) return next(new Error("User not found"));
    if (!user.isActive) return next(new Error("Account is deactivated"));

    // Attach user data to socket — available in all event handlers
    socket.data.user = {
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
};

module.exports = { socketAuth };
