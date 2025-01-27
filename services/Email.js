// emailService.js
import sgMail from "@sendgrid/mail";
import { config } from "dotenv";
import AppError from "../utils/appError.js";

config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// OTP Email Template
const createOtpEmailTemplate = (name, otp) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background-color: #ffffff;
        }
        .header {
            background-color: #B68F62;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content { padding: 20px; }
        .otp-code { 
            font-size: 24px; 
            color: #B68F62; 
            text-align: center; 
            margin: 20px 0;
            letter-spacing: 5px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 4px;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Authentication Code</h2>
        </div>
        <div class="content">
            <p>Hi ${name},</p>
            <p>Here's your OTP for authentication:</p>
            <div class="otp-code">${otp}</div>
            <p>This OTP is valid for 10 minutes. Do not share it with anyone.</p>
            <p>If you didn't request this, please ignore the email.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Your Application Team</p>
            <p>This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>
`;

// Password Reset Email Template
const createPasswordResetTemplate = (name, resetUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background-color: #ffffff;
        }
        .header {
            background-color: #B68F62;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content { padding: 20px; }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #B68F62;
            color: white;
            border-radius: 4px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Password Reset Request</h2>
        </div>
        <div class="content">
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
            <p>To reset your password, click the button below:</p>
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>This link will expire in 10 minutes for security reasons.</p>
            <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Your Application Team</p>
            <p>This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>
`;

export const sendOtpEmail = async (to, name, otp) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject: 'Your One-Time Password (OTP)',
    html: createOtpEmailTemplate(name, otp)
  };

  try {
    await sgMail.send(msg);
    console.log("OTP email sent successfully");
  } catch (error) {
    console.error("Email sending error:", error);
    throw new AppError("Failed to send OTP email", 500);
  }
};

export const sendPasswordResetEmail = async (to, name, resetUrl) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject: 'Password Reset Request',
    html: createPasswordResetTemplate(name, resetUrl)
  };

  try {
    await sgMail.send(msg);
    console.log("Password reset email sent successfully");
  } catch (error) {
    console.error("Email sending error:", error);
    throw new AppError("Failed to send password reset email", 500);
  }
};