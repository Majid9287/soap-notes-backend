//models/UserModel.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // For hashing passwords


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
    },
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
    apiKey: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    plan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
  },
    profilePicture: {
      type: String, // URL or path to the image
    },
    password: {
      type: String,
      required: true,
      select: false, // Prevent password from being returned by default
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
      street: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: String,
      },
      postalCode: {
        type: String,
      },
      country: {
        type: String,
      },
    },
    dateOfBirth: {
      type: Date, // Stores the user's date of birth
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'non-binary', 'prefer not to say'],
    },
  },
  {
    timestamps: true, // Enables createdAt and updatedAt fields
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10); // Generate a salt
    this.password = await bcrypt.hash(this.password, salt); // Hash the password with the salt
  }
  next();
});

// Instance method to compare provided password with the stored hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};
// Add method to generate OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otpCode = otp;
  this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  this.otpAttempts = 0;
  return otp;
};

// Method to validate OTP
userSchema.methods.validateOTP = function(otp) {
  if (this.otpAttempts >= 10) {
    throw new Error('Max OTP attempts exceeded');
  }
  
  const isValid = this.otpCode === otp && 
                  this.otpExpires > Date.now();
  
  if (!isValid) {
    this.otpAttempts += 1;
  }
  
  return isValid;
};
const User = mongoose.model('User', userSchema);
export default User;
