import { transcribeAudio, structureSOAPNote } from "../services/openaiService.js";
import SoapNote from "../models/soapNote.js";
import { sendSuccessResponse, sendErrorResponse } from "../utils/responseHandler.js";

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
export async function createSOAPNote(req, res) {
  try {
    const { type, input_type } = req.body;
    const { patientName, therapistName } = req.query;
    const userId  = req.user.id; // From auth middleware

    // Validate input
    if (!type || !soapNoteTypes.includes(type)) {
      return sendErrorResponse(res, "Invalid SOAP note type");
    }
    if (!input_type || !["audio", "text"].includes(input_type)) {
      return sendErrorResponse(res, "Invalid input type");
    }

    let data;

    // Handle audio or text input
    if (input_type === "audio") {
      if (!req.file) {
        return sendErrorResponse(res, "Audio file is required for audio input");
      }
      const audioBuffer = req.file.buffer; // Access the uploaded file's buffer
      data = await transcribeAudio(audioBuffer);
    } else {
      const { text } = req.body;
      if (!text) {
        return sendErrorResponse(res, "Data is required for text input");
      }
      data = text;
    }

    // Structure text into SOAP format
    const soapNote = await structureSOAPNote(data, type);

    // Save SOAP note to database
    const newSoapNote = await SoapNote.create({
      text:data,
      userId,
      patientName,
      therapistName,
      ...soapNote,
    });

    sendSuccessResponse(res, "SOAP note created successfully", newSoapNote);
  } catch (error) {
    sendErrorResponse(res, "Failed to create SOAP note", error);
  }
}

// Get SOAP Notes
export async function getSOAPNotes(req, res) {
  try {
    const { patientName, therapistName } = req.query;
    const { userId } = req.user; // From auth middleware

    const filters = { userId };

    if (patientName) {
      filters.patientName = { $regex: patientName, $options: "i" };
    }
    if (therapistName) {
      filters.therapistName = { $regex: therapistName, $options: "i" };
    }

    const notes = await SoapNote.find(filters).sort({ createdAt: -1 });
    sendSuccessResponse(res, "SOAP notes fetched successfully", notes);
  } catch (error) {
    sendErrorResponse(res, "Failed to fetch SOAP notes", error);
  }
}
