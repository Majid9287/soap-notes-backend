//models/apiKey.js
import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  key: { type: String, required: true, unique: true },
  audioUsage: { type: Number, default: 0 },
  textUsage: { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now },
  nextReset: { type: Date }
},{
    timestamps: true
});

export default mongoose.model('ApiKey', apiKeySchema);