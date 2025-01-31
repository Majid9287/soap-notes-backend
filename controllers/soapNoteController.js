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

// Get SOAP Notes with Pagination and Date Filters
export const getSOAPNotes = catchAsync(async (req, res) => {
  const { patientName, therapistName, dateFilter, specificDate, page = 1, limit = 10 } = req.query;
  const userId = req.user.id; // From auth middleware

  const filters = { userId };

  if (patientName) {
    filters.patientName = { $regex: patientName, $options: "i" };
  }
  if (therapistName) {
    filters.therapistName = { $regex: therapistName, $options: "i" };
  }

  // Date Filters
  if (dateFilter || specificDate) {
    let startDate, endDate;

    if (specificDate) {
      // Handle specific date filter (e.g., 12/1/2025)
      const parsedDate = new Date(specificDate);
      if (isNaN(parsedDate.getTime())) {
        throw new AppError("Invalid specific date format. Use MM/DD/YYYY.", 400);
      }

      startDate = new Date(parsedDate.setHours(0, 0, 0, 0));
      endDate = new Date(parsedDate.setHours(23, 59, 59, 999));
    } else {
      // Handle predefined date filters (day, week, month)
      const currentDate = new Date();

      switch (dateFilter) {
        case 'day':
          startDate = new Date(currentDate.setHours(0, 0, 0, 0));
          endDate = new Date(currentDate.setHours(23, 59, 59, 999));
          break;
        case 'week':
          startDate = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
          endDate = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 6));
          break;
        case 'month':
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          break;
        default:
          throw new AppError("Invalid date filter. Use 'day', 'week', 'month', or provide a specific date.", 400);
      }
    }

    if (startDate && endDate) {
      filters.createdAt = { $gte: startDate, $lte: endDate };
    }
  }

  const skip = (page - 1) * limit;

  const notes = await SoapNote.find(filters).select("-subjective -objective -assessment -plan")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // if (notes.length === 0) {
  //   throw new AppError("No SOAP notes found", 404);
    
  // }

  const totalNotes = await SoapNote.countDocuments(filters);

  sendSuccessResponse(res, {
    notes,
    totalNotes,
    totalPages: Math.ceil(totalNotes / limit),
    currentPage: parseInt(page),
  }, "SOAP notes fetched successfully");
});

// Get Single SOAP Note by ID


  export const getSOAPNoteById = catchAsync(async (req, res) => {
  const  id  = req.params.id;
  
  const note = await SoapNote.findOne({ _id: id });

  if (!note) {
    throw new AppError("SOAP note not found", 404);
  }

  sendSuccessResponse(res, note, "SOAP note fetched successfully");
});
// Delete SOAP Note by ID
export const deleteSOAPNote = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  // Find the note and ensure it belongs to the authenticated user
  const note = await SoapNote.findOne({ _id: id });

  if (!note) {
    throw new AppError("SOAP note not found or you do not have permission to delete it", 404);
  }

  // Delete the note
  await SoapNote.deleteOne({ _id: id });

  sendSuccessResponse(res, null, "SOAP note deleted successfully");
});