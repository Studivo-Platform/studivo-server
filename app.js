const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");

const { env } = require("./src/config/env");
const passport = require("./src/config/passport");
const { errorHandler } = require("./src/middleware/error.middleware");
const { globalLimiter } = require('./src/middleware/rateLimit.middleware');

// Routes
const authRoutes = require("./src/routes/auth.routes");
const requestRoutes = require("./src/routes/request.routes");
const offerRoutes = require("./src/routes/offer.routes");
const chatRoutes = require("./src/routes/chat.routes");
const searchRoutes = require("./src/routes/search.routes");
const notificationRoutes = require("./src/routes/notification.routes");
const adminRoutes        = require('./src/routes/admin.routes');

const app = express();

// Security Middleware
// Security Headers
// app.use(helmet({
//   crossOriginEmbedderPolicy: false,   // Allow Cloudinary images to load
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       imgSrc:     ["'self'", 'data:', 'res.cloudinary.com'],
//       connectSrc: ["'self'", env.CLIENT_URL],
//     },
//   },
// }));

// CORS
app.use(cors({
  origin:      env.NODE_ENV === 'production' ? env.CLIENT_URL : 'http://localhost:3000',  
  credentials: true,  // Allow cookies
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token'], // Allowed headers
}));

// Global Rate Limiting
app.use(globalLimiter);

// Authentication Middleware
app.use(passport.initialize()); // No sessions — we use JWT

// Request Parsing
app.use(express.json({ limit: "10mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse form bodies
app.use(cookieParser()); // Parse cookies

// NoSQL Injection Prevention
// Strips $ and . from user input keys — prevents MongoDB operator injection
// app.use(mongoSanitize({
//   replaceWith: '_',    // Replace with _ instead of just removing
//   onSanitizeError: (req, res) => {
//     res.status(400).json({ success: false, message: 'Invalid characters in request' });
//   },
// }));

app.use((req, res, next) => {
  ["body", "params", "query"].forEach((key) => {
    if (req[key] && typeof req[key] === "object") {
      mongoSanitize.sanitize(req[key]);
    }
  });

  next();
});

// Logging
if (env.NODE_ENV === "development") {
  app.use(morgan("dev")); // Colorful request logs in development
}

// Make Socket.IO accessible via req.io in all controllers
app.use((req, res, next) => {
  req.io = req.app.get("io");
  next();
});

// Health Check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Studivo API is running",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/conversations", chatRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationRoutes);
app.use('/api/admin',         adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global Error Handler (must be last)
app.use(errorHandler);

module.exports = app;
