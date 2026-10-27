const express = require('express');
const cors = require('cors');

const coursesRouter = require('./routes/courses');
const timetablesRouter = require('./routes/timetables');

const app = express();

// Enable CORS
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
const healthHandler = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Timetable Builder API'
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount CRUD routes
app.use('/api/courses', coursesRouter);
app.use('/api/timetables', timetablesRouter);

// Seam: Mount sessions router if provided by Teammate 4
try {
  const sessionsRouter = require('./routes/sessions');
  app.use('/api', sessionsRouter);
} catch (e) {
  // Session router seam: loaded dynamically when Teammate 4 branch merges
}

// 404 Catch-all handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      details: []
    }
  });
});

// Centralized JSON error handling middleware
app.use((err, req, res, next) => {
  // Handle syntax error for malformed JSON request bodies
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON payload in request body',
        details: []
      }
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Invalid format for field "${err.path}": ${err.value}`,
        details: []
      }
    });
  }

  // Handle Mongoose Schema Validation errors
  if (err.name === 'ValidationError') {
    const details = Object.keys(err.errors).map(field => ({
      field,
      message: err.errors[field].message
    }));
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details
      }
    });
  }

  // Handle MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'A resource with this key already exists.',
        details: []
      }
    });
  }

  // Generic internal server error (never leak raw stack traces)
  console.error('[API Server Error]', err);
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected server error occurred',
      details: []
    }
  });
});

module.exports = app;
