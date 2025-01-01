import express from "express";
import multer from "multer";
import { rateLimiter } from "../middlewares/rateLimiter.js";
import { createSOAPNote, getSOAPNotes } from "../controllers/soapNoteController.js";
import { validateSchema } from "../middlewares/validationMiddleware.js";
import { soapInputValidationSchema } from "../validations/soapValidator.js";
import audioUpload from "../middlewares/audioUploadMiddleware.js";
const router = express.Router();

// Create SOAP Note (with file upload for audio) 
// //rateLimiter
router.post("/:apiKey",rateLimiter,audioUpload ,createSOAPNote);
router.post("/", rateLimiter,audioUpload,createSOAPNote);

// Get SOAP Notes
router.get("/:apiKey", getSOAPNotes);
// Get SOAP Notes
router.get("/", getSOAPNotes);
export default router;

