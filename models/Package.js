import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Premium', 'Standard', 'Basic', 'Free']  // Added Free to enum
  },
  price: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'free'],  // Added 'free' option
      default: 'monthly'
    }
  },
  features: {
    audioSoapNotes: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    textSoapNotes: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    audioFileLength: {
      value: {
        type: Number,
        required: true
      },
      unit: {
        type: String,
        enum: ['minutes', 'hours'],
        required: true
      }
    }
  },
  yearlyDiscount: {
    type: Number,
    default: 10
  },
  trialDays: {  // Added trial period
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware remains the same
packageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Updated method to handle free tier
packageSchema.methods.calculateYearlyPrice = function() {
  if (this.price.billingCycle === 'free') return 0;
  const monthlyPrice = this.price.amount;
  const yearlyPrice = monthlyPrice * 12;
  const discount = (yearlyPrice * this.yearlyDiscount) / 100;
  return yearlyPrice - discount;
};

const Package = mongoose.model('Package', packageSchema);

export default Package;