// src/middleware/rateLimiter.js
import { RateLimitService } from "../services/RateLimitService.js";
import { rateLimitConfig } from "../config/rateLimit.js";
import { sendErrorResponse } from "../utils/responseHandler.js";
import AppError from "../utils/appError.js";

export const rateLimiter = async (req, res, next) => {
  try {
    // Validate API key
    const apiKey = await RateLimitService.validateApiKey(
      req.header(rateLimitConfig.headers.apiKey)
    );

    // Check and update rate limits
    const { remaining, reset } = await RateLimitService.checkAndUpdateLimits(apiKey, req.ip);

    // Set rate limit headers
    res.set(rateLimitConfig.headers.remaining, remaining);
    res.set(rateLimitConfig.headers.reset, reset.getTime());

    next();
  } catch (error) {
    if (error.message === "Invalid API key") {
      return sendErrorResponse(res, new AppError(error.message, 401));
    }
    if (error.message === "Rate limit exceeded") {
      return sendErrorResponse(
        res,
        new AppError(error.message, 429, { resetTime: reset.getTime() })
      );
    }
    sendErrorResponse(res, new AppError("Internal server error", 500));
  }
};
