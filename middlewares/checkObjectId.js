// @ts-check
import { isValidObjectId } from "mongoose";
import { sendErrorResponse } from "../utils/responseHandler.js";
import AppError from "../utils/appError.js";

/**
 * Middleware to validate the Mongoose ObjectId in req.params.id.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 */
function checkObjectId(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError(`Invalid ObjectId: ${req.params.id}`, 404);
    }
    next();
  } catch (error) {
    sendErrorResponse(res, error);
  }
}

export default checkObjectId;
