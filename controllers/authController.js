import User from "../models/UserModel.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateApiKey
} from "../utils/tokenUtils.js";
import bcrypt from "bcrypt";
import{sendSuccessResponse, sendErrorResponse} from "../utils/responseHandler.js";
import AppError from '../utils/appError.js';
// Signup
export const signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("User already exists", 400);
    }

    const newUser = new User({ name, email, password });
    
    const apiKey = await generateApiKey(newUser._id);
    newUser.apiKey = apiKey._id;
    await newUser.save();
    const accessToken =  generateAccessToken(newUser._id, newUser.role, null);
    const refreshToken = generateRefreshToken(newUser._id);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    sendSuccessResponse(res, { accessToken, refreshToken }, "User registered successfully");
  } catch (err) {
    if (err instanceof AppError) {
      sendErrorResponse(res, err);
    } else {
      sendErrorResponse(res, new AppError("Error registering user", 500));
    }
  }
};

// Signin
export const signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user) throw new AppError("Invalid credentials", 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError("Invalid credentials", 401);

    const accessToken = generateAccessToken(user._id, user.role, user.organization || null);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    sendSuccessResponse(res, { accessToken, refreshToken }, "Signed in successfully");
  } catch (err) {
    if (err instanceof AppError) {
      sendErrorResponse(res, err);
    } else {
      sendErrorResponse(res, new AppError("Error signing in", 500));
    }
  }
};

// Refresh Token
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;
  try {
    if (!refreshToken) throw new AppError("No refresh token provided", 401);

    const verifiedToken = verifyRefreshToken(refreshToken);
    if (!verifiedToken) throw new AppError("Invalid refresh token", 403);

    const user = await User.findById(verifiedToken.id);
    if (!user) throw new AppError("User not found", 404);

    const newAccessToken = generateAccessToken(user._id, user.role, user.profileId || null);
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    sendSuccessResponse(res, { accessToken: newAccessToken }, "Access token refreshed");
  } catch (err) {
    if (err instanceof AppError) {
      sendErrorResponse(res, err);
    } else {
      sendErrorResponse(res, new AppError("Error refreshing token", 500));
    }
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) throw new AppError("User not found", 404);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.resetOtp = hashedOtp;
    user.resetOtpExpires = otpExpires;
    await user.save();

    // Simulate sending email
    sendSuccessResponse(res, null, "OTP sent to email");
  } catch (err) {
    sendErrorResponse(res, err);
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) throw new AppError("User not found", 404);

    if (!await bcrypt.compare(otp, user.resetOtp) || user.resetOtpExpires < Date.now()) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    user.otpVerified = true;
    await user.save();

    sendSuccessResponse(res, null, "OTP verified successfully");
  } catch (err) {
    sendErrorResponse(res, err);
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) throw new AppError("User not found", 404);

    if (!user.otpVerified) throw new AppError("OTP verification required", 400);

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    user.otpVerified = false;
    await user.save();

    sendSuccessResponse(res, null, "Password reset successful");
  } catch (err) {
    sendErrorResponse(res, err);
  }
};



// Get User Profile
export const getUserProfile = async (req, res) => {
  try {
    // Ensure req.user.id is available (assumes middleware adds it)
    if (!req.user || !req.user.id) {
      throw new AppError("User not authenticated", 401);
    }

    // Fetch user by ID
    const user = await User.findById(req.user.id).select("-password ").populate("apiKey");
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Respond with user data
    sendSuccessResponse(res, { user }, "User profile retrieved successfully");
  } catch (err) {
    if (err instanceof AppError) {
      sendErrorResponse(res, err);
    } else {
      sendErrorResponse(res, new AppError("Error fetching user profile", 500));
    }
  }
};
