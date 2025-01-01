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
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
        error: "Invalid Key",
      });
    }
    if (error.message === "Rate limit exceeded") {
      return res.status(429).json({
        success: false,
        message: "APIs calls limit exceeded",
        error: "Rate limit exceeded",
      });
    }
    sendErrorResponse(res, new AppError("Internal server error", 500));
  }
};
