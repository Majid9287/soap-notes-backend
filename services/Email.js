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
        }
        .otp-code { 
            font-size: 24px; 
            color: #1a73e8; 
            text-align: center; 
            margin: 20px 0;
            letter-spacing: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Your One-Time Password (OTP)</h2>
        <p>Hi ${name},</p>
        <p>Here's your OTP for authentication:</p>
        <div class="otp-code">${otp}</div>
        <p>This OTP is valid for 10 minutes. Do not share it with anyone.</p>
        <p>If you didn't request this, please ignore the email.</p>
        <p>Best regards,<br>Your Application Team</p>
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