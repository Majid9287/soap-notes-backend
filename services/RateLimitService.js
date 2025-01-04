import ApiKey from '../models/ApiKey.js';
import IpLimit from '../models/IpLimit.js';
import { DateUtils } from '../utils/dateUtils.js';
import AppError from '../utils/appError.js';

import { rateLimitConfig } from '../config/rateLimit.js';


export class RateLimitService {
  static async validateApiKey(key) {
    const apiKey = await ApiKey.findOne({ key }).populate('userId').populate('packageId');
    if (!apiKey) {
      throw new AppError('Invalid API key', 401);
    }
    
    return {
      apiKey,
      user: {
        ...apiKey.userId.toObject(),
        id: apiKey.userId._id
      },
      package: apiKey.packageId
    };
  }

  static async checkAndUpdateLimits(apiKey, requestType, clientIp, audioFileLength = 0) {
    const now = new Date();
    const userPackage = apiKey.packageId;

    // Check if it's time to reset API key usage
    if (now >= apiKey.nextReset) {
      apiKey.audioUsage = 0;
      apiKey.textUsage = 0;
      apiKey.lastReset = now;
      
      // Set next reset date
      apiKey.nextReset = DateUtils.getNextDay(now);
    }

    // Check and update IP limits for free package
    if (userPackage.name === 'Free') {
      let ipLimit = await IpLimit.findOne({ ip: clientIp });
      if (!ipLimit) {
        ipLimit = new IpLimit({ ip: clientIp });
      }

      // Reset IP limit if it's a new day
      if (DateUtils.isNewDay(ipLimit.lastReset)) {
        ipLimit.audioCount = 0;
        ipLimit.textCount = 0;
        ipLimit.lastReset = now;
      }

      // Check IP limit
      if (requestType === 'audio' && ipLimit.audioCount >= rateLimitConfig.dailyLimit) {
        throw new AppError('IP audio limit exceeded for free package', 429);
      }
      if (requestType === 'text' && ipLimit.textCount >= rateLimitConfig.dailyLimit) {
        throw new AppError('IP text limit exceeded for free package', 429);
      }

      // Increment IP limit counter
      if (requestType === 'audio') {
        ipLimit.audioCount++;
      } else if (requestType === 'text') {
        ipLimit.textCount++;
      }

      await ipLimit.save();
    }

    // Check limits based on package and request type
    if (requestType === 'audio') {
      if (userPackage.features.audioSoapNotes !== 'unlimited' && 
          apiKey.audioUsage >= userPackage.features.audioSoapNotes) {
        throw new AppError('Audio usage limit exceeded', 429);
      }

      // Check audio file length limit
      const packageAudioLengthLimit = userPackage.features.audioFileLength.value;
      const packageAudioLengthUnit = userPackage.features.audioFileLength.unit;
      const audioLengthLimitInMinutes = packageAudioLengthUnit === 'hours' ? packageAudioLengthLimit * 60 : packageAudioLengthLimit;

      if (audioFileLength > audioLengthLimitInMinutes) {
        throw new AppError(`Audio file length exceeds the limit of ${packageAudioLengthLimit} ${packageAudioLengthUnit}`, 429);
      }

      apiKey.audioUsage++;
      
    } else if (requestType === 'text') {
      if (userPackage.features.textSoapNotes !== 'unlimited' && 
          apiKey.textUsage >= userPackage.features.textSoapNotes) {
        throw new AppError('Text usage limit exceeded', 429);
      }
      apiKey.textUsage++;
    }

    // Save updates
    await apiKey.save();

    return {
      audioRemaining: userPackage.features.audioSoapNotes === 'unlimited' ? 
        'unlimited' : userPackage.features.audioSoapNotes - apiKey.audioUsage,
      textRemaining: userPackage.features.textSoapNotes === 'unlimited' ? 
        'unlimited' : userPackage.features.textSoapNotes - apiKey.textUsage,
      audioLengthAllowed: userPackage.features.audioFileLength.value * (userPackage.features.audioFileLength.unit === 'hours' ? 60 : 1),
      reset: apiKey.nextReset,
      ipAudioRemaining: userPackage.name === 'Free' ? rateLimitConfig.dailyLimit - (await IpLimit.findOne({ ip: clientIp })).audioCount : null,
      ipTextRemaining: userPackage.name === 'Free' ? rateLimitConfig.dailyLimit - (await IpLimit.findOne({ ip: clientIp })).textCount : null,
    };
  }
}

