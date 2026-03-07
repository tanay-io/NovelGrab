/**
 * NovelGrab – Error Handling Middleware
 *
 * Centralised error handler following nodejs-backend-patterns skill:
 *   - Operational vs programmer errors
 *   - Consistent error response format
 *   - Structured logging
 */

import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

export function errorHandler(err, req, res, _next) {
  // Default values
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (err.name === "ValidationError") {
    // Mongoose validation
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = err.message;
  } else if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_ID";
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Log error
  if (statusCode >= 500) {
    logger.error({ err, req: { method: req.method, url: req.url } }, message);
  } else {
    logger.warn({ code, url: req.url }, message);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.url} not found`,
    },
  });
}
