import {
  transcribeAudio,
  structureSOAPNote,
} from "../services/openaiService.js";
import SoapNote from "../models/soapNote.js";
import {
  sendSuccessResponse,
  sendErrorResponse,
} from "../utils/responseHandler.js";

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
    const userId = req.user.id;
    console.log(req.body);
    // Validate input
    if (!type || !soapNoteTypes.includes(type)) {
      return sendErrorResponse(res, "Invalid SOAP note type");
    }
    if (!input_type || !["audio", "text"].includes(input_type)) {
      return sendErrorResponse(res, "Invalid input type");
    }

    let transcribedText;

    // Handle audio or text input
    if (input_type === "audio") {
      if (!req.file) {
        return sendErrorResponse(res, "Audio file is required for audio input");
      }
      console.log("test3456789");
      const audioBuffer = req.file.buffer;
      console.log("file", req.file);
      const transcriptionResult = await transcribeAudio(audioBuffer);

      if (!transcriptionResult || !transcriptionResult.transcription) {
        return sendErrorResponse(res, "Failed to transcribe audio");
      }

      transcribedText = transcriptionResult.transcription;

      // Log transcription details (optional)
      console.log("Transcription confidence:", transcriptionResult.confidence);
      console.log("Word count:", transcriptionResult.words?.length || 0);
      console.log("text:", transcribedText);
    } else {
      const { text } = req.body;
      if (!text) {
        return sendErrorResponse(res, "Text is required for text input");
      }
      transcribedText = text;
    }
    const wordCount = transcribedText.trim().split(/\s+/).length;
    if (wordCount < 15) {
      return res.status(400).json({
        success: false,
        message: "Not enough data to generate SOAP notes",
        error: "Data must contain information about the session",
      });
    }
    // Structure text into SOAP format
    const soapNote = await structureSOAPNote(
      transcribedText,
      type,
      patientName,
      therapistName
    );

    // Save SOAP note to database
    const newSoapNote = await SoapNote.create({
      text: transcribedText,
      userId,
      patientName,
      therapistName,
      inputType: input_type,
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

    sendSuccessResponse(
      res,

      newSoapNote,

      "SOAP note created successfully"
    );
  } catch (error) {
    console.error("SOAP Note Creation Error:", error);
    sendErrorResponse(
      res,
      error.message || "Failed to create SOAP note",
      error.code || 500
    );
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
