// models/Log.js
import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  // Basic Request Info
  method: { type: String, required: true },
  url: { type: String, required: true },
  path: { type: String },
  query: { type: Object },
  params: { type: Object },
  headers: { type: Object },
  body: { type: Object },

  // Client/Network Info
  ip: { type: String, required: true },
  protocol: { type: String },
  secure: { type: Boolean },
  hostname: { type: String },
  subdomains: { type: [String] },
  referrer: { type: String },
  userAgent: { type: String },

  // Response Info
  status: { type: Number, required: true },
  statusMessage: { type: String },
  contentType: { type: String },
  contentLength: { type: Number },
  responseTime: { type: Number },

  // Error Handling
  error: { type: String },
  errorStack: { type: String },
  errorDetails: { type: Object },

  // Authentication/User Context
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userRole: { type: String },
  authToken: { type: String },

  timestamp: { type: Date, default: Date.now },
  finishedAt: { type: Date },
}, {
  timestamps: true
});

export default mongoose.model('Log', logSchema);