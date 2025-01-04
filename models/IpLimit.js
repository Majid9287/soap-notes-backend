import mongoose from 'mongoose';

const ipLimitSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true },
    audioCount: { type: Number, default: 0 },
    textCount: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now }
});

export default mongoose.model('IpLimit', ipLimitSchema);