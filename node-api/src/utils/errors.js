/**
 * NovelGrab – Custom Error Classes
 *
 * Hierarchical error classes for consistent error handling.
 * Pattern from nodejs-backend-patterns skill: AppError hierarchy.
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service = "Service") {
    super(`${service} is currently unavailable`, 503, "SERVICE_UNAVAILABLE");
  }
}
