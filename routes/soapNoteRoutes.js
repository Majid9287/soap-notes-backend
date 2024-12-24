import express from "express";
import multer from "multer";
import { rateLimiter } from "../middlewares/rateLimiter.js";
import { createSOAPNote, getSOAPNotes } from "../controllers/soapNoteController.js";
import { protect } from "../middlewares/authMiddleware.js";

const upload = multer({ storage: multer.memoryStorage() }); 
const router = express.Router();

// Create SOAP Note (with file upload for audio) 
// //rateLimiter
router.post("/", protect, upload.single("audioFile"), createSOAPNote);

// Get SOAP Notes
router.get("/", protect, getSOAPNotes);

export default router;


// Audio Input (Using File Upload):
// bash
// Copy code
// curl -X POST http://localhost:5000/api/soapnotes \
// -H "Authorization: Bearer <TOKEN>" \
// -H "Content-Type: multipart/form-data" \
// -F "audioFile=@path/to/audio-file.wav" \
// -F "type=Psychotherapy Session" \
// -F "input_type=audio" \
// -F "patientName=John Doe" \
// -F "therapistName=Dr. Smith"
// Text Input:
// bash
// Copy code
// curl -X POST http://localhost:5000/api/soapnotes \
// -H "Authorization: Bearer <TOKEN>" \
// -H "Content-Type: application/json" \
// -d '{
//   "type": "Psychotherapy Session",
//   "input_type": "text",
//   "data": "Patient reported feeling better today.",
//   "patientName": "John Doe",
//   "therapistName": "Dr. Smith"
// }'