import User from "../models/UserModel.js";
import Package from "../models/Package.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateApiKey,
} from "../utils/tokenUtils.js";
import bcrypt from "bcrypt";
import { sendSuccessResponse } from "../utils/responseHandler.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

// Signup
export const signup = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("User already exists", 400);
  }

  const freePackage = await Package.findOne({ name: "Free" });
  if (!freePackage) {
    throw new AppError("Free package not found", 500);
  }

  const newUser = new User({ name, email, password });
  const apiKey = await generateApiKey(newUser._id, freePackage._id);
  newUser.apiKey = apiKey._id;
  newUser.package = freePackage._id;
  await newUser.save();

  const accessToken = generateAccessToken(newUser._id, newUser.role, null);
  const refreshToken = generateRefreshToken(newUser._id);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  sendSuccessResponse(
    res,
    { accessToken,refreshToken},
    "User registered successfully",
    201
  );
});

// Signin
export const signin = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new AppError("Invalid credentials", 401);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError("Invalid credentials", 401);

  const accessToken = generateAccessToken(
    user._id,
    user.role,
    user.organization || null
  );
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  sendSuccessResponse(
    res,
    { accessToken,refreshToken},
    "Signed in successfully"
  );
});

// Refresh Token
export const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) throw new AppError("No refresh token provided", 401);

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
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  sendSuccessResponse(
    res,
    { accessToken: newAccessToken },
    "Access token refreshed"
  );
});

// Forgot Password
export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new AppError("User not found", 404);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = Date.now() + 10 * 60 * 1000;
  const hashedOtp = await bcrypt.hash(otp, 10);

  user.resetOtp = hashedOtp;
  user.resetOtpExpires = otpExpires;
  await user.save();

  // TODO: Implement actual email sending logic here
  sendSuccessResponse(res, null, "OTP sent to email");
});

// Verify OTP
export const verifyOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new AppError("User not found", 404);

  if (
    !(await bcrypt.compare(otp, user.resetOtp)) ||
    user.resetOtpExpires < Date.now()
  ) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  user.otpVerified = true;
  await user.save();

  sendSuccessResponse(res, null, "OTP verified successfully");
});

// Reset Password
export const resetPassword = catchAsync(async (req, res) => {
  const { email, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new AppError("User not found", 404);

  if (!user.otpVerified) throw new AppError("OTP verification required", 400);

  user.password = newPassword;
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;
  user.otpVerified = false;
  await user.save();

  sendSuccessResponse(res, null, "Password reset successful");
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

