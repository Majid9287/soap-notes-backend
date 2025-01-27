import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import AppError from '../utils/appError.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // OTP related fields
    otpCode: {
      type: String,
      select: false
    },
    otpExpires: {
      type: Date,
      select: false
    },
    isOtpVerified: {
      type: Boolean,
      default: false
    },
    otpAttempts: {
      type: Number,
      default: 0
    },
    // Password reset fields
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    },
    passwordResetAttempts: {
      type: Number,
      default: 0
    },
    lastPasswordChange: {
      type: Date,
      select: false
    },
    // Account related fields
    apiKey: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'ApiKey', 
      required: true 
    },
    package: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Package', 
      required: true 
    },
    plan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
    },
    profilePicture: {
      type: String,
    },
    password: {
      type: String,
      required: true,
      select: false,
      minlength: 8,
    },
    phoneNumber: {
      type: String,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'non-binary', 'prefer not to say'],
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deactivated'],
      default: 'active'
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    lockUntil: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.lastPasswordChange = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new AppError('Error comparing passwords', 500);
  }
};

// OTP generation method
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otpCode = otp;
  this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  this.otpAttempts = 0;
  return otp;
};

// OTP validation method
userSchema.methods.validateOTP = function(otp) {
  if (this.otpAttempts >= 10) {
    throw new AppError('Maximum OTP attempts exceeded. Please request a new OTP.', 400);
  }
  
  const isValid = this.otpCode === otp && this.otpExpires > Date.now();
  
  if (!isValid) {
    this.otpAttempts += 1;
    if (this.otpAttempts >= 10) {
      this.otpCode = undefined;
      this.otpExpires = undefined;
    }
  }
  
  return isValid;
};

// Password reset token generation
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  this.passwordResetAttempts = 0;

  return resetToken;
};

// Method to handle failed login attempts
userSchema.methods.handleFailedLogin = function() {
  this.failedLoginAttempts += 1;
  
  if (this.failedLoginAttempts >= 5) {
    // Lock account for 15 minutes after 5 failed attempts
    this.lockUntil = Date.now() + 15 * 60 * 1000;
  }
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  this.failedLoginAttempts = 0;
  this.lockUntil = undefined;
};

const User = mongoose.model('User', userSchema);
export default User;