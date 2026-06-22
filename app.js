const express          = require('express');
const cors             = require('cors');
const helmet           = require('helmet');
const morgan           = require('morgan');
const mongoSanitize    = require('express-mongo-sanitize');

const { env }          = require('./src/config/env');
const passport         = require('./src/config/passport');
const { errorHandler } = require('./src/middleware/error.middleware');
const authRoutes       = require('./src/routes/auth.routes');

const app = express();

// Security Middleware
app.use(helmet());                         // Sets secure HTTP headers
app.use(cors({
  origin:      env.CLIENT_URL,             // Only allow our Next.js frontend
  credentials: true,                       // Allow cookies (for refresh token)
}));
// app.use(mongoSanitize());                  // Strip MongoDB operators from user input

// Authentication Middleware
app.use(passport.initialize());            // No sessions — we use JWT

// Request Parsing
app.use(express.json({ limit: '10mb' }));           // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));     // Parse form bodies

// Sanitize user input after request parsing. Express 5 exposes a read-only getter for
// req.query, so we sanitize the existing object in place instead of reassigning it.
app.use((req, res, next) => {
    ['body', 'params', 'headers', 'query'].forEach((key) => {
        if (req[key] && typeof req[key] === 'object') {
            mongoSanitize.sanitize(req[key]);
        }
    });
    next();
});

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));                  // Colorful request logs in development
}

// Health Check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Studivo API is running',
        environment: env.NODE_ENV,
        timestamp:   new Date().toISOString(),
    });
});

// API Routes
app.use('/api/auth', authRoutes);
// More routes will be added here each sprint:
// app.use('/api/requests',      requestRoutes);
// app.use('/api/offers',        offerRoutes);
// app.use('/api/search',        searchRoutes);
// app.use('/api/conversations', chatRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/admin',         adminRoutes);

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