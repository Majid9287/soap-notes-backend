import OpenAI from "openai"; // Import the new openai package
import fs from "fs";
import config from "../config/config.js";
import logger from "../utils/logger.js";

import path from "path"; // Import the path module to handle paths
import os from "os"; // Import the os module to get the system temp directory
// Initialize OpenAI client with the API key
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// Transcribe audio file to text
export async function transcribeAudio(audioBuffer) {
    try {
      // Use the system's temporary directory to store the file
      const tempDir = os.tmpdir(); // This will get the correct temp directory for your OS
      const tempFilePath = path.join(tempDir, `${Date.now()}.wav`);
  
      // Ensure the directory exists (optional, for extra safety)
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
  
      // Write the audio buffer to a temporary file
      await fs.promises.writeFile(tempFilePath, audioBuffer);
  
      // Use OpenAI's Whisper model for transcription
      const transcription = await openai.audio.transcriptions.create({
        model: "whisper-1", // Whisper model for transcriptions
        file: fs.createReadStream(tempFilePath),
      });
  
      // Clean up the temporary file
      await fs.promises.unlink(tempFilePath);
  
      // Return the transcribed text
      return transcription.text;
    } catch (error) {
      logger.error("Error transcribing audio:", error);
      throw error;
    }
  }
// Structure text into SOAP format
export async function structureSOAPNote(text, type) {
  try {
    // Create a prompt for OpenAI to structure the text into SOAP format
    const prompt = `
      Structure the following text into SOAP format for "${type}":\n\n${text}
      Subjective:
      Objective:
      Assessment:
      Plan:
    `;

    // Generate the structured SOAP note using GPT
    const response = await openai.chat.completions.create({
      model: "gpt-4", // Use GPT-4 for creating completions
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
    });

    // Get the structured text from the response
    const structuredNote = response.choices[0].message.content.trim();

    // Split the structured note into sections
    const [subjective, objective, assessment, plan] = structuredNote.split("\n\n");

    // Return the structured SOAP note
    return {
      subjective: subjective.replace("Subjective:", "").trim(),
      objective: objective.replace("Objective:", "").trim(),
      assessment: assessment.replace("Assessment:", "").trim(),
      plan: plan.replace("Plan:", "").trim(),
    };
  } catch (error) {
    logger.error("Error structuring SOAP note:", error);
    throw error;
  }
}
