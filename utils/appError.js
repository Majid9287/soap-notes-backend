// utils/appError.js
import logger from './logger.js';

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode || 500;
    this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);

    this.logError();
  }

  logError() {
    logger.error(`${this.statusCode} - ${this.message}\n${this.stack}`);
  }
}

export default AppError;