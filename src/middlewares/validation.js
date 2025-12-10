// Request validation middleware
const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Validation error handler middleware
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.param,
      message: err.msg,
      value: err.value,
    }));

    return next(
      new ValidationError('Request validation failed', errorMessages)
    );
  }

  next();
};

module.exports = {
  validateRequest,
};
