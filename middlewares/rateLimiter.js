import { RateLimitService } from "../services/RateLimitService.js";
import AppError from "../utils/appError.js";
import { extractApiKey } from "../utils/helpers.js";
import catchAsync from "../utils/catchAsync.js";

export const rateLimiter = catchAsync(async (req, res, next) => {
  let apiKey;
  try {
    apiKey = await extractApiKey(req);
  } catch (error) {
    throw new AppError(error.message, 401);
  }

  let validatedKey, user, userPackage;
  try {
    ({ apiKey: validatedKey, user, package: userPackage } = await RateLimitService.validateApiKey(apiKey));
  } catch (error) {
    throw new AppError("Invalid API key", 401);
  }

  req.user = user;
  req.userPackage = userPackage;

  const requestType = req.body.input_type;
  const audioFileLength = requestType === 'audio' && req.file ? parseFloat(req.file.duration || '0') : 0;

  let limits;
  try {
    limits = await RateLimitService.checkAndUpdateLimits(
      validatedKey,
      requestType,
      req.ip,
      audioFileLength
    );
  } catch (error) {
    throw new AppError(error.message, 429);
  }

  const { 
    audioRemaining, 
    textRemaining, 
    audioLengthAllowed, 
    reset,
    ipAudioRemaining,
    ipTextRemaining
  } = limits;

  res.set('X-RateLimit-Audio-Remaining', audioRemaining?.toString());
  res.set('X-RateLimit-Text-Remaining', textRemaining?.toString());
  res.set('X-RateLimit-AudioLength-Allowed', audioLengthAllowed?.toString());
  res.set('X-RateLimit-Reset', reset?.toString());

  if (ipAudioRemaining !== null) {
    res.set('X-RateLimit-IP-Audio-Remaining', ipAudioRemaining?.toString());
  }
  if (ipTextRemaining !== null) {
    res.set('X-RateLimit-IP-Text-Remaining', ipTextRemaining?.toString());
  }

  next();
});

