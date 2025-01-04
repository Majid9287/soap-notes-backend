// utils/responseHandler.js
import logger from "./logger.js";

export const sendSuccessResponse = (res, data, message, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    docs: data || null,
  });
};

export const sendErrorResponse = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  logger.error(`${statusCode} - ${message}\n${error.stack}`);

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'production' ? {} : error,
  });
};