// Custom error classes
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

// Version mismatch error (optimistic locking)
class VersionMismatchError extends ConflictError {
  constructor(message = 'Version mismatch: Resource has been modified') {
    super(message);
    this.code = 'VERSION_MISMATCH';
  }
}

// Insufficient stock error
class InsufficientStockError extends AppError {
  constructor(productId, available, requested) {
    super(
      `Insufficient stock for product ${productId}. Available: ${available}, Requested: ${requested}`,
      400,
      'INSUFFICIENT_STOCK'
    );
    this.productId = productId;
    this.available = available;
    this.requested = requested;
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  VersionMismatchError,
  InsufficientStockError,
};
