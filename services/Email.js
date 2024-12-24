// services/Email.js
import sgMail from "@sendgrid/mail";
import { config } from "dotenv";
import AppError from "../utils/appError.js";
import { sendErrorResponse } from "../utils/responseHandler.js";

config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async (to, subject, text) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject,
    text,
  };

  try {
    await sgMail.send(msg);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);

    // Handle known SendGrid errors (e.g., invalid email format)
    if (error.response && error.response.body && error.response.body.errors) {
      const detailedError = error.response.body.errors
        .map((err) => err.message)
        .join(", ");
      throw new AppError(`SendGrid error: ${detailedError}`, 400);
    }

    // Throw a generic error for unknown cases
    throw new AppError("Failed to send email. Please try again later.", 500);
  }
};
