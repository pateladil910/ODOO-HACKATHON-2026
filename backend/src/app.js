const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const apiRouter = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');
const loggerMiddleware = require('./middlewares/logger.middleware');
const ApiError = require('./utils/apiError');

const app = express();

// 1. Configure CORS
app.use(cors({
  origin: '*', // Set wildcards for hackathon speed; can lock down to specific domains later
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// 2. Request body parsers
app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ extended: true, limit: '16mb' }));

// 3. Logger configurations
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
  app.use(loggerMiddleware);
}

// 4. Static files serving configuration
// Serves frontend static site from backend for single-deploy architectures (Heroku/Render/etc.)
app.use(express.static(path.join(__dirname, '../../frontend')));

// 5. Mount API Routes
app.use('/api/v1', apiRouter);

// 6. Handle Undefined Route fallbacks
app.all('*', (req, res, next) => {
  next(new ApiError(404, `Cannot find ${req.method} request for route '${req.originalUrl}' on this server.`));
});

// 7. Global Error Handler Middleware
app.use(errorMiddleware);

module.exports = app;
