// src/middleware/rateLimiter.js
import { RateLimitService } from "../services/RateLimitService.js";
import { rateLimitConfig } from "../config/rateLimit.js";
import { sendErrorResponse } from "../utils/responseHandler.js";
import AppError from "../utils/appError.js";
import { extractApiKey } from "../utils/helpers.js";
export const rateLimiter = async (req, res, next) => {
  try {
    // Get API key from header or URL
    const apiKey = await extractApiKey(req);

    // Validate API key and get user info
    const { apiKey: validatedKey, user } = await RateLimitService.validateApiKey(apiKey);
    
    req.user = user;

    const { remaining, reset } = await RateLimitService.checkAndUpdateLimits(
      validatedKey,
      req.ip
    );

    // Set rate limit headers
    res.set(rateLimitConfig.headers.remaining, remaining);
    res.set(rateLimitConfig.headers.reset, reset);

    next();
  } catch (error) {
    if (error.message === "Invalid API key") {
      return sendErrorResponse(res, new AppError(error.message, 401));
    }
    if (error.message === "Rate limit exceeded") {
      return sendErrorResponse(res, new AppError(error.message, 429));
    }
    sendErrorResponse(res, new AppError("Internal server error", 500));
  }
};
