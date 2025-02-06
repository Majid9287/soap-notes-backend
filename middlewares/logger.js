// middleware/logger.js
import Log from '../models/Log.js';

const loggerMiddleware = async (req, res, next) => {
  console.log('Logging request:', req.method, req.originalUrl || req.url);
  const startTime = Date.now();
  
  // Create a copy of the original send function
  const originalSend = res.send;
  
  // Override the send function to capture response data
  res.send = function (data) {
    res.responseData = data;
    return originalSend.apply(res, arguments);
  };

  // Function to safely get header values
  const getHeaderSafe = (name) => {
    try {
      return req.get(name);
    } catch (error) {
      return null;
    }
  };

  res.on('finish', async () => {
    try {
      const logData = {
        // Request Details
        method: req.method,
        url: req.originalUrl || req.url,
        path: req.path,
        query: req.query,
        params: req.params,
        headers: sanitizeHeaders(req.headers),
        body: sanitizeRequestData(req.body),

        // Network/Client Info
        ip: req.ip || req.socket?.remoteAddress || 'unknown',
        protocol: req.protocol,
        secure: req.secure,
        hostname: req.hostname,
        subdomains: req.subdomains,
        referrer: getHeaderSafe('referrer'),
        userAgent: getHeaderSafe('user-agent'),

        // Response Details
        status: res.statusCode,
        statusMessage: res.statusMessage,
        contentType: getHeaderSafe('content-type'),
        contentLength: getHeaderSafe('content-length'),
        responseTime: Date.now() - startTime,
        finishedAt: new Date(),

        // Error Information
        ...(res.statusCode >= 400 && {
          error: res.locals?.error?.message || res.statusMessage,
          errorStack: process.env.NODE_ENV === 'development' 
            ? res.locals?.error?.stack 
            : undefined,
          errorDetails: res.locals?.error?.details
        }),

        // Authentication Context
        ...(req.user && {
          userId: req.user._id,
          userRole: req.user.role,
          authToken: maskSensitiveValue(getHeaderSafe('authorization'))
        })
      };

      const log = new Log(logData);
      await log.save();
    } catch (error) {
      console.error('Logging failed:', error);
      
      // Fallback logging to file system if MongoDB fails
      if (process.env.NODE_ENV === 'development') {
        const fs = await import('fs/promises');
        try {
          await fs.appendFile(
            'error_logs.txt',
            `${new Date().toISOString()} - Logging Error: ${error.message}\n`
          );
        } catch (fsError) {
          console.error('Fallback logging failed:', fsError);
        }
      }
    }
  });

  next();
};

// Security helper functions
const sensitiveFields = [
  'password',
  'creditCard',
  'token',
  'cvv',
  'secret',
  'api_key',
  'apiKey'
];

const sensitiveHeaders = [
  'authorization',
  'cookie',
  'x-api-key',
  'session',
  'jwt'
];

const sanitizeRequestData = (data) => {
  if (!data) return {};
  
  const sanitized = JSON.parse(JSON.stringify(data));
  
  const sanitizeObject = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        sanitizeObject(value);
      } else if (sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        obj[key] = '***REDACTED***';
      }
    }
  };

  sanitizeObject(sanitized);
  return sanitized;
};

const sanitizeHeaders = (headers) => {
  if (!headers) return {};
  
  const sanitized = { ...headers };
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '***REDACTED***';
    }
  });
  return sanitized;
};

const maskSensitiveValue = (value, visibleChars = 3) => {
  if (!value) return null;
  if (typeof value !== 'string') return '***REDACTED***';
  if (value.length <= visibleChars * 2) return '***';
  return `${value.slice(0, visibleChars)}***${value.slice(-visibleChars)}`;
};

export default loggerMiddleware;