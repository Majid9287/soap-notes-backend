import mongoose from 'mongoose';
import 'dotenv/config';
import AppError from '../utils/appError.js';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
     
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw new AppError('Database connection failed. Please check your configuration.', 500);
  }
};
