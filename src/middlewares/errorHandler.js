// Error handling middleware
const { AppError } = require('../utils/errors');

/**
 * Global error handler middleware
 * Formats all errors in catalogue spec format:
 * - HTTP status code
 * - error.code for machine processing
 * - error.message for display
 * - error.details for additional context
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: err.stack,
  });

  // Handle operational errors (custom AppError)
  if (err.isOperational) {
    const response = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Add validation errors if present
    if (err.errors) {
      response.error.details = err.errors;
    }

    // Add additional context for specific error types
    if (err.details) {
      response.error.details = { ...response.error.details, ...err.details };
    }

    return res.status(err.statusCode || 500).json(response);
  }

  // Handle Prisma unique constraint error
  if (err.code === 'P2002') {
    const fieldName = err.meta?.target?.[0] || 'field';
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `A ${fieldName} with this value already exists`,
        details: { field: fieldName },
      },
    });
  }

  // Handle Prisma not found error
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  }

  // Handle unexpected errors
  const statusCode = err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(statusCode).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isDevelopment
        ? err.message
        : 'An unexpected error occurred',
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};

/**
 * 404 handler middleware
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint not found: ${req.method} ${req.path}`,
    },
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
