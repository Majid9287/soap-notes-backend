import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import {connectDB} from './config/dbConfig.js';
import bodyParser from "body-parser";
// import './scripts/seedPackages.js';
 
// Load environment variables
dotenv.config();
const app = express();
connectDB() //db connection

// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true, // Enable cookies for cross-origin requests
}));



import pakageRoutes from './routes/packageRoutes.js';
import authRoutes from './routes/authRoutes.js';
import soapRoutes from './routes/soapNoteRoutes.js';
import payment from './routes/paymentRoutes.js';

// Register Routes

app.use('/api/payments', payment);
app.use('/api/package', pakageRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/soapnotes', soapRoutes);
// Root Route
app.get('/', (req, res) => {
    res.send('Backend is running...');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
});
// Start Server
const PORT = process.env.PORT || 8080 ;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

//api url with two option pass apikey:

//with header set:X-API-Key:4456789
//https://soap-notes-ai-befmdyc9effqdhgt.centralus-01.azurewebsites.net/api/soapnotes?patientName=majid&therapistName=mike

//with pass key in url
//https://soap-notes-ai-befmdyc9effqdhgt.centralus-01.azurewebsites.net/api/soapnotes/{key}?patientName=majid&therapistName=mike

// Audio Input (Using File Upload):
// "audioFile=audio file" \
// "type=Psychotherapy Session" \
//  "input_type=audio" \
//  "patientName=John Doe" \ //optional
//  "therapistName=Dr. Smith" //optional

// Text Input:
//   "type": "Psychotherapy Session",
//   "input_type": "text",
//   "data": "Patient reported feeling better today.",
//   "patientName": "John Doe", //optional
//   "therapistName": "Dr. Smith" //optional
// }'