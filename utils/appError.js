import logger from './logger.js';

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${this.statusCode}`.startsWith(4) ? 'fail' : 'error';
    this.isOperational = true;

    // Capture stack trace for internal errors
    Error.captureStackTrace(this, this.constructor);

    // Log the error using winston
    this.logError();
  }

  // Method to log error details using winston
  logError() {
    if (this.isOperational) {
      // Log error to file and console, including the message and stack trace
      logger.error(`${this.message}\n${this.stack}`);
    }
  }
}

export default AppError;
