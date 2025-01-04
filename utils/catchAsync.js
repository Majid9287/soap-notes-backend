// utils/catchAsync.js
import { sendErrorResponse } from './responseHandler.js';
import AppError from './appError.js';

export default (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    if (!(err instanceof AppError)) {
      err = new AppError(err.message, err.statusCode);
    }
    sendErrorResponse(res, err);
  });
};