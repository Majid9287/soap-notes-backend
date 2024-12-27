// src/services/RateLimitService.js
import  IpLimit  from '../models/IpLimit.js';
import  ApiKey  from '../models/ApiKey.js';
import { DateUtils } from '../utils/dateUtils.js';
import { rateLimitConfig } from '../config/rateLimit.js';
import AppError from '../utils/appError.js';

export class RateLimitService {
 
 
  static async validateApiKey(key) {
    const apiKey = await ApiKey.findOne({ key }).populate('userId');
    if (!apiKey) {
      throw new AppError('Invalid API key', 401);
    }
    
    // Return both the apiKey and user information
    return {
      apiKey,
      user: {
        ...apiKey.userId.toObject(),
        id: apiKey.userId._id // Ensure id is accessible
      }
    };
  }

  
  static async checkAndUpdateLimits(apiKey, clientIp) {
    const today = new Date();

    // Reset API key usage count if it's a new day
    if (DateUtils.isNewDay(apiKey.lastReset)) {
      apiKey.usageCount = 0;
      apiKey.lastReset = today;
    }

    // Get or create IP limit document
    let ipLimit = await IpLimit.findOne({ ip: clientIp });
    if (!ipLimit) {
      ipLimit = new IpLimit({ ip: clientIp });
    }

    // Reset IP usage count if it's a new day
    if (DateUtils.isNewDay(ipLimit.lastReset)) {
      ipLimit.count = 0;
      ipLimit.lastReset = today;
    }

    // Check rate limits
    if (
      apiKey.usageCount >= rateLimitConfig.dailyLimit ||
      ipLimit.count >= rateLimitConfig.dailyLimit
    ) {
      throw new AppError('Rate limit exceeded', 429);
    }

    // Update usage counts
    apiKey.usageCount++;
    ipLimit.count++;

    // Save updates asynchronously
    await Promise.all([apiKey.save(), ipLimit.save()]);

    return {
      remaining: rateLimitConfig.dailyLimit - Math.max(apiKey.usageCount, ipLimit.count),
      reset: DateUtils.getNextResetTime(),
    };
  }
}
