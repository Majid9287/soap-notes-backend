//utils/helpers.js
import rateLimit from 'express-rate-limit'
import AppError from './appError.js'
import mongoose from 'mongoose'
import { rateLimitConfig } from '../config/rateLimit.js'
export const extractApiKey = async (req) => {
    // First check header
    const headerKey = req.header(rateLimitConfig.headers.apiKey);
    if (headerKey) {
      return headerKey;
    }
  
    // Then, check the URL for the API key using the defined pattern
  const match = req.originalUrl.match(rateLimitConfig.urlPattern);

  if (match && match[1]) {
    return match[1]; // If the pattern matches, return the API key found in the URL
  }
  
    throw new AppError('Invalid API key', 401);
  };


  
export const checkReferenceId = async (Model, foreignKey, next) => {
    const referenceKey = await mongoose.model(Model).findById(foreignKey)
    if (!referenceKey) {
        return next(
            new AppError(
                `Referenced ${Model.toLowerCase()} ID does not exist`,
                400
            )
        )
    }
}

export const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 50, // limit each IP to 5 requests per windowMs
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            status: 'fail',
            message: `Too many login attempts from this IP, please try again after ${Math.ceil(
                options.windowMs / 1000 / 60
            )} minutes.`,
        })
    },
    standardHeaders: true, // Send rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

export const createPasswordResetMessage = (
    email,
    ipAddress,
    timestamp,
    resetUrl
) => {
    const brandLogoURL =
        'https://i.pinimg.com/originals/c8/51/e1/c851e1918e356d0bfdcd090fb2c2332c.jpg'

    return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 10px; background-color: #e7e7e7">
            <div style="padding: 20px; width: 50%; margin: 0 auto; background-color: #fff">
                <div style="text-align: left; margin-bottom: 20px; border-bottom: 1px solid #444">
                        <img src="${brandLogoURL}" alt="Brand Logo" style="max-width: 150px;">
                    </div>

                    <div>
                        <h2 style="color: #222; font-size: 24px;">Reset Password</h2>
                        <p>A password reset event has been triggered. The password reset window 
                            is limited to 10 minutes. If you do not reset your password within 10 minutes, 
                            you will need to submit a new request.To complete the password reset process, 
                            visit the following link:
                        </p>
                        <a href=${resetUrl} target='_blank'>${resetUrl}</a>
                        <table style="width: 100%; margin-top: 20px;">
                            <tr>
                                <td style="font-weight: bold;">Username</td>
                                <td>${email}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold;">IP Address</td>
                                <td>${ipAddress}</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold;">Reset Timestamp</td>
                                <td>${timestamp}</td>
                            </tr>
                        </table>
                    </div>
            </div>
        </div>
    `
}

export const createPasswordResetConfirmationMessage = (
    email,
    ipAddress,
    timestamp
) => {
    const brandLogoURL =
        'https://i.pinimg.com/originals/c8/51/e1/c851e1918e356d0bfdcd090fb2c2332c.jpg'

    return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 10px">
            <div style="text-align: left; margin-bottom: 20px; border-bottom: 1px solid #444">
                <img src="${brandLogoURL}" alt="Brand Logo" style="max-width: 150px;">
            </div>
            <div style="padding: 20px; width: 70%; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Confirmation</h2>
                <p>Your password was successfully reset.</p>
                <table style="width: 100%; margin-top: 20px;">
                    <tr>
                        <td style="font-weight: bold;">Username</td>
                        <td>${email}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">IP Address</td>
                        <td>${ipAddress}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">Reset Timestamp</td>
                        <td>${timestamp}</td>
                    </tr>
                </table>
            </div>
        </div>
    `
}
