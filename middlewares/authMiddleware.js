import "dotenv/config";
import jwt from "jsonwebtoken";
import { sendSuccessResponse, sendErrorResponse } from "../utils/responseHandler.js";
import AppError from "../utils/appError.js";

export const protect = (req, res, next) => {
  try {
    // Extract token from cookies or Authorization header
    console.log(req.ip);
    let token = req.cookies.accessToken;
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1]; // Extract the token after "Bearer"
      }
    }

    if (!token) {
      throw new AppError("No token provided", 401);
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded; // Attach decoded user data (id, role) to request

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      sendErrorResponse(res, new AppError("Invalid or expired token", 401));
    } else {
      sendErrorResponse(res, error);
    }
  }
};
