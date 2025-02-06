import User from '../models/UserModel.js';
import Package from "../models/Package.js";
import dotenv from 'dotenv';

dotenv.config();

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateApiKey,
} from "../utils/tokenUtils.js";
import bcrypt from "bcrypt";
import crypto from 'crypto';
import { sendOtpEmail, sendPasswordResetEmail } from '../services/Email.js';
import { sendSuccessResponse } from "../utils/responseHandler.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

// Signup with OTP
export const signupWithOTP = catchAsync(async (req, res) => {
  const { name, email, password, phoneNumber, gender, dateOfBirth } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("A user with this email already exists", 400);
  }

  const freePackage = await Package.findOne({ name: "Free" });
  if (!freePackage) {
    throw new AppError("Free package not found", 500);
  }

  const newUser = new User({ 
    name, 
    email, 
    password,
    phoneNumber,
    gender,
    dateOfBirth,
    accountStatus: 'active'
  });

  const apiKey = await generateApiKey(newUser._id, freePackage._id);
  newUser.apiKey = apiKey._id;
  newUser.package = freePackage._id;

  const otp = newUser.generateOTP();
  await sendOtpEmail(email, name, otp);
  await newUser.save();

  sendSuccessResponse(
    res,
    { email },
    "OTP sent for verification",
    201
  );
});

// Signin with 2FA OTP
export const signinWithOTP = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email })
    .select('+password +failedLoginAttempts +lockUntil');
    
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  // Check account status
  if (user.accountStatus !== 'active') {
    throw new AppError(`Your account is ${user.accountStatus}. Please contact support.`, 403);
  }

  // Check if account is locked
  if (user.isLocked()) {
    const lockTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
    throw new AppError(`Account is temporarily locked. Please try again in ${lockTime} minutes.`, 423);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.handleFailedLogin();
    await user.save();
    throw new AppError("Invalid credentials", 401);
  }

  // Reset login attempts on successful password match
  user.resetLoginAttempts();
  
  const otp = user.generateOTP();
  await sendOtpEmail(email, user.name, otp);
  await user.save();

  sendSuccessResponse(
    res,
    { email },
    "OTP sent for login verification"
  );
});

// Request Password Reset
export const requestPasswordReset = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email })
    .select('+passwordResetAttempts');

  // Generic message for security
  const genericMessage = "If a user with this email exists, a password reset link will be sent.";

  if (!user || user.accountStatus !== 'active') {
    sendSuccessResponse(res, {}, genericMessage);
    return;
  }

  if (user.passwordResetAttempts >= 5) {
    throw new AppError("Too many reset attempts. Please try again in 24 hours.", 429);
  }

  const resetToken = user.createPasswordResetToken();
  user.passwordResetAttempts += 1;
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  try {
    await sendPasswordResetEmail(user.email, user.name, resetURL);
    sendSuccessResponse(res, {}, genericMessage);
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError("Error sending reset email. Please try again later.", 500);
  }
});

// Reset Password
export const resetPassword = catchAsync(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
console.log(token,password)
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
    accountStatus: 'active'
  });

  if (!user) {
    throw new AppError('Invalid or expired password reset token', 400);
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetAttempts = 0;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  const accessToken = generateAccessToken(user._id, user.role, user.organization || null);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 7 days
  });

  sendSuccessResponse(
    res,
    { accessToken, refreshToken },
    "Password reset successful"
  );
});

// Logout
export const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;
  
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { lastLogout: Date.now() }
    });
  }

  // Clear cookies
  res.cookie('accessToken', 'logged_out', {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.cookie('refreshToken', 'logged_out', {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  sendSuccessResponse(
    res,
    {},
    "Logged out successfully"
  );
});

// Update Password
export const updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError("Current password is incorrect", 401);
  }

  user.password = newPassword;
  await user.save();

  const accessToken = generateAccessToken(user._id, user.role, user.organization || null);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });

  sendSuccessResponse(
    res,
    {},
    "Password updated successfully"
  );
});
// Get User Profile
export const getUserProfile = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError("User not authenticated", 401);
  }

  const user = await User.findById(req.user.id)
    .select("-password")
    .populate("apiKey")
    .populate("package");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  sendSuccessResponse(res, { user }, "User profile retrieved successfully");
});
export const refreshToken = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken ||req.headers["x-refresh-token"];

  if (!refreshToken) throw new AppError("No refresh token provided", 401);
   console.log("refresh call",refreshToken)
  const verifiedToken = verifyRefreshToken(refreshToken);
  if (!verifiedToken) throw new AppError("Invalid refresh token", 403);

  const user = await User.findById(verifiedToken.id);
  if (!user) throw new AppError("User not found", 404);

  const newAccessToken = generateAccessToken(
    user._id,
    user.role,
    user.profileId || null
  );
  res.cookie("accessToken", newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });

  sendSuccessResponse(
    res,
    { accessToken: newAccessToken },
    "Access token refreshed"
  );
});
// Resend OTP
export const resendOTP = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email })
    .select('+otpAttempts +otpCode +otpExpires +accountStatus');

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Check account status
  if (user.accountStatus !== 'active') {
    throw new AppError(`Your account is ${user.accountStatus}. Please contact support.`, 403);
  }

//   // Check if previous OTP exists and isn't expired
//  if (user.otpCode && user.otpExpires > Date.now()) {
//   const timeLeftSeconds = Math.ceil((user.otpExpires - Date.now()) / 1000);
//   const timeLeftMinutes = Math.ceil(timeLeftSeconds / 60);

//   if (timeLeftSeconds > 60) { // 1 minute restriction
//     throw new AppError(
//       `Please wait ${timeLeftMinutes} minute(s) before requesting a new OTP`,
//       429
//     );
//   }
// }


  // Check resend attempts within time window (e.g., max 5 attempts per hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  if (user.otpAttempts >= 10 && user.otpExpires > oneHourAgo) {
    throw new AppError("Too many OTP requests. Please try again in an hour.", 429);
  }

  // Generate and send new OTP
  const otp = user.generateOTP();
  try {
    await sendOtpEmail(email, user.name, otp);
    await user.save();

    sendSuccessResponse(
      res,
      { email },
      "New OTP sent successfully"
    );
  } catch (error) {
    // Reset OTP fields if email fails
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    throw new AppError("Failed to send OTP. Please try again later.", 500);
  }
});

// Verify Signup OTP
export const verifySignupOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+otpCode +otpExpires');
  if (!user) throw new AppError("User not found", 404);

  if (!user.validateOTP(otp)) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  user.isOtpVerified = true;
  user.otpCode = undefined;
  user.otpExpires = undefined;
  await user.save();

  const accessToken = generateAccessToken(user._id, user.role, null);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("accessToken", accessToken, { /* existing cookie options */ });
  res.cookie("refreshToken", refreshToken, { /* existing cookie options */ });

  sendSuccessResponse(
    res,
    { accessToken, refreshToken },
    "User registered successfully"
  );
});



// Verify Signin OTP
export const verifySigninOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+otpCode +otpExpires');
  if (!user) throw new AppError("User not found", 404);

  if (!user.validateOTP(otp)) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  const accessToken = generateAccessToken(
    user._id,
    user.role,
    user.organization || null
  );
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("accessToken", accessToken, { /* existing cookie options */ });
  res.cookie("refreshToken", refreshToken, { /* existing cookie options */ });

  user.otpCode = undefined;
  user.otpExpires = undefined;
  await user.save();

  sendSuccessResponse(
    res,
    { accessToken, refreshToken },
    "Signed in successfully"
  );
});
