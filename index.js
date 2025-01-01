import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import {connectDB} from './config/dbConfig.js';

 
// Load environment variables
dotenv.config();
const app = express();
connectDB() //db connection

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true, // Enable cookies for cross-origin requests
}));




import authRoutes from './routes/authRoutes.js';
import soapRoutes from './routes/soapNoteRoutes.js';
// Register Routes
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