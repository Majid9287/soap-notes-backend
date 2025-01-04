import jwt from 'jsonwebtoken';
import 'dotenv/config';
import crypto from 'crypto'; // Import crypto module
import ApiKey from '../models/ApiKey.js';

// Generate Access Token
export const generateAccessToken = (userId, role, organizationId = null) => {
  return jwt.sign(
    { id: userId, role: role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '30d' }
  );
};

// Generate API Key
export const generateApiKey = async (userId,packageId) => {
  try {
    const key = crypto.randomBytes(32).toString('hex'); // Generate random bytes
    const apiKey = await ApiKey.create({ userId, key ,packageId}); // Save key in the database
    return apiKey;
  } catch (error) {
    console.error('Error generating API key:', error);
    throw error; // Ensure the error is propagated
  }
};

// Generate Refresh Token
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });
};

// Verify Access Token
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    return null;
  }
};

// Verify Refresh Token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return null;
  }
};
