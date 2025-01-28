// controllers/soapNoteController.js
import { transcribeAudio, structureSOAPNote } from "../services/openaiService.js";
import SoapNote from "../models/SoapNote.js";
import { sendSuccessResponse, sendErrorResponse } from "../utils/responseHandler.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

const soapNoteTypes = [
  "Psychotherapy Session",
  "Clinical Social Worker",
  "Psychiatrist Session",
  "Chiropractor",
  "Pharmacy",
  "Nurse Practitioner",
  "Massage Therapy",
  "Occupational Therapy",
  "Veterinary",
  "Podiatry",
  "Physical Therapy",
  "Speech Therapy (SLP)",
  "Registered Nurse",
  "Acupuncture",
  "Dentistry",
];

// Create SOAP Note
export const createSOAPNote = catchAsync(async (req, res) => {
  const { type, input_type, date, time, icd10, cpt } = req.body;
  const { patientName, therapistName } = req.query;
  const userId = req.user.id;

  if (!type || !soapNoteTypes.includes(type)) {
    throw new AppError("Invalid SOAP note type", 400);
  }
  if (!input_type || !["audio", "text"].includes(input_type)) {
    throw new AppError("Invalid input type", 400);
  }
  if (!date || !time || !icd10 || !cpt) {
    throw new AppError("Date, time, ICD10, and CPT codes are required", 400);
  }

  let transcribedText;

  if (input_type === "audio") {
    if (!req.file) {
      throw new AppError("Audio file is required for audio input", 400);
    }
    const audioBuffer = req.file.buffer;
    const transcriptionResult = await transcribeAudio(audioBuffer);

    if (!transcriptionResult || !transcriptionResult.transcription) {
      throw new AppError("Failed to transcribe audio", 500);
    }

    transcribedText = transcriptionResult.transcription;

    // Log transcription details (optional)
    console.log("Transcription confidence:", transcriptionResult.confidence);
    console.log("Word count:", transcriptionResult.words?.length || 0);
  } else {
    const { text } = req.body;
    if (!text) {
      throw new AppError("Text is required for text input", 400);
    }
    transcribedText = text;
  }

  const wordCount = transcribedText.trim().split(/\s+/).length;
  if (wordCount < 15) {
    throw new AppError("Not enough data to generate SOAP notes. Data must contain information about the session", 400);
  }

  // Structure text into SOAP format
  const soapNote = await structureSOAPNote(
    transcribedText,
    type,
    patientName,
    therapistName,
    date,
    time,
    icd10,
    cpt
  );

  // Save SOAP note to database
  const newSoapNote = await SoapNote.create({
    text: transcribedText,
    userId,
    patientName,
    therapistName,
    inputType: input_type,
    date,
    time,
    icd10,
    cpt,
    ...soapNote,
    // Add metadata for audio transcriptions
    ...(input_type === "audio" && {
      audioMetadata: {
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        transcribedAt: new Date(),
      },
    }),
  });

  sendSuccessResponse(res, newSoapNote, "SOAP note created successfully", 201);
});

// Get SOAP Notes
export const getSOAPNotes = catchAsync(async (req, res) => {
  const { patientName, therapistName } = req.query;
  const userId = req.user.id; // From auth middleware

  const filters = { userId };

  if (patientName) {
    filters.patientName = { $regex: patientName, $options: "i" };
  }
  if (therapistName) {
    filters.therapistName = { $regex: therapistName, $options: "i" };
  }

  const notes = await SoapNote.find(filters).sort({ createdAt: -1 });

  if (notes.length === 0) {
    throw new AppError("No SOAP notes found", 404);
  }

  sendSuccessResponse(res, notes, "SOAP notes fetched successfully");
});