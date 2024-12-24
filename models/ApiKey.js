import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, required: true, unique: true },
    usageCount: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now },
   
});

export default mongoose.model('ApiKey', apiKeySchema);

