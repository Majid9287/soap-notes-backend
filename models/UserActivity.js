import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    apiKey: { type: String },
    actionType: { type: String, required: true }, // 'login', 'api_call', 'register', etc.
    endpoint: String,
    method: String,
    ipAddress: String,
    userAgent: String,
    location: {
        country: String,
        city: String,
        region: String,
        latitude: Number,
        longitude: Number,
        timezone: String
    },
    requestBody: Object,
    responseStatus: Number,
    responseTime: Number,
    errorMessage: String,
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('UserActivity', userActivitySchema);

