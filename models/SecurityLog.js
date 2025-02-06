import mongoose from 'mongoose';

const securityLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    eventType: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    ipAddress: String,
    userAgent: String,
   
    details: Object,
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('SecurityLog', securityLogSchema);

