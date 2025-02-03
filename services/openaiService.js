// transcriptionService.js
import { SpeechClient } from "@google-cloud/speech";
import OpenAI from "openai"; // Import the new openai package
import config from "../config/config.js";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import { exec } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import logger from "../utils/logger.js";
import AppError from "../utils/appError.js";
// Set ffmpeg paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

const MAX_CHUNK_DURATION = 600; // 10 minutes in seconds
const MAX_RETRIES = 3;
const NOISE_REDUCTION_FILTERS = [
  'highpass=f=200',
  'afftdn=nf=-25',
  'compand=attacks=0.02:decays=0.05'
];

// Enhanced audio processing with noise reduction
const processAudio = async (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters(NOISE_REDUCTION_FILTERS)
      .toFormat('wav')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
};

// Split audio into manageable chunks
const splitAudio = (inputPath, chunkDuration = MAX_CHUNK_DURATION) => {
  return new Promise((resolve, reject) => {
    const outputPattern = path.join(
      path.dirname(inputPath),
      `chunk_%03d_${path.basename(inputPath)}`
    );

    ffmpeg(inputPath)
      .output(outputPattern)
      .audioCodec('pcm_s16le')
      .duration(chunkDuration)
      .outputOptions([
        '-f segment',
        '-segment_time', chunkDuration,
        '-reset_timestamps 1'
      ])
      .on('end', () => resolve(fs.readdirSync(path.dirname(inputPath))
        .filter(f => f.startsWith('chunk_') && f.endsWith(path.basename(inputPath)))))
      .on('error', reject)
      .run();
  });
};

// Retry wrapper with exponential backoff
async function withRetry(fn, retries = MAX_RETRIES) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000 * (MAX_RETRIES - retries + 1)));
    return withRetry(fn, retries - 1);
  }
}

export async function transcribeAudio(audioBuffer, options = {}) {
  const tempDir = path.join(os.tmpdir(), `audio-transcriptions-${Date.now()}`);
  await fs.promises.mkdir(tempDir, { recursive: true });

  try {
    // Initial processing
    const originalPath = path.join(tempDir, 'original.mp3');
    await fs.promises.writeFile(originalPath, audioBuffer);

    // Pre-process audio
    const processedPath = path.join(tempDir, 'processed.wav');
    await processAudio(originalPath, processedPath);

    // Split into chunks
    const chunkPaths = await splitAudio(processedPath);
    
    // Parallel processing with concurrency control
    const CONCURRENCY = 4;
    const chunks = [];
    for (let i = 0; i < chunkPaths.length; i += CONCURRENCY) {
      const batch = chunkPaths.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(async (chunkPath) => {
        const audioStream = fs.createReadStream(path.join(tempDir, chunkPath));
        
        return withRetry(async () => {
          const response = await openai.audio.transcriptions.create({
            model: "whisper-1",
            file: audioStream,
            language: options.languageCode || "en",
            prompt: "[BACKGROUND NOISE] [IGNORE NON-SPEECH SOUNDS] [TRANSCRIBE SPEECH ONLY]",
            temperature: 0.2,
            max_tokens: 4096
          });
          return response.text.trim();
        });
      }));
      chunks.push(...results.filter(Boolean));
    }

    if (chunks.length === 0) {
      throw new AudioTranscriptionError(
        "No transcription results available",
        "NO_TRANSCRIPTION_RESULTS",
        null
      );
    }

    return { transcription: chunks.join('\n\n') };
  } catch (error) {
    logger.error(`Transcription error: ${error.message}`, error);
    throw new AudioTranscriptionError(
      "I couldn't catch that. Please ensure clear speech and try again.",
      "TRANSCRIPTION_ERROR",
      error.message
    );
  } finally {
    // Cleanup
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}
export async function structureSOAPNote(
  text,
  type,
  patientName = null,
  therapistName = null,
  date,
  time,
  icd10,
  cpt
) {
  if (!text) {
    throw new AppError("SOAP note text not provided", 400);
  }

  if (text.length < 30) {
    // If the text is too short, we'll use it as a starting point for generating related content
    const expandedPrompt = `Generate a brief SOAP note for a ${type} session based on the following initial interaction: "${text}". Include relevant details that might typically follow such an interaction in a ${type} setting.
    Format your response strictly as follows:
Subjective:
[Your detailed subjective section]

Objective:
[Your detailed objective section]

Assessment:
[Your detailed assessment section]

Plan:
[Your detailed plan section]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an experienced ${type} professional. Generate a brief, realistic interaction based on the given initial text.`,
        },
        { role: "user", content: expandedPrompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    text = response.choices[0].message.content.trim();
  }

  console.log(text, type);

  try {
    // Filter out patient's personal information before sending to OpenAI
    let sanitizedText = text;
    if (patientName) {
      // Replace patient name with generic reference
      const nameRegex = new RegExp(patientName, "gi");
      sanitizedText = sanitizedText.replace(nameRegex, "patient");
    }

    // Filter out potential personal identifiers
    sanitizedText = sanitizedText
      // Remove potential phone numbers
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]")
      // Remove potential email addresses
      .replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        "[EMAIL]"
      )
      // Remove potential dates of birth
      .replace(/\b\d{2}[-/]\d{2}[-/]\d{4}\b/g, "[DOB]")
      // Remove potential SSN
      .replace(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, "[SSN]");

    let typeSpecificInstructions = "";

    switch (type) {
      case "Psychotherapy Session":
        typeSpecificInstructions = `
          - Focus on the patient's emotional and psychological state.
          - Include any concerns related to mental health, mood, and behavior.
          - Document any interventions or therapeutic techniques used during the session.
        `;
        break;
      case "Clinical Social Worker":
        typeSpecificInstructions = `
          - Focus on the patient's psychosocial factors, including their family, social environment, and mental health.
          - Include interventions related to counseling, support, and social work services.
          - Document any strategies used to address the patient's social, emotional, or behavioral issues.
        `;
        break;
      case "Psychiatrist Session":
        typeSpecificInstructions = `
          - Focus on the patient's mental health, psychiatric history, and current symptoms.
          - Include any diagnoses, medication management, and treatment plans.
          - Document any psychiatric evaluations, including mood, behavior, and cognitive function.
        `;
        break;
      case "Chiropractor":
        typeSpecificInstructions = `
          - Focus on musculoskeletal assessments and spinal health.
          - Document any adjustments, manipulations, or treatments provided.
          - Include observations about posture, alignment, and pain relief.
        `;
        break;
      case "Pharmacy":
        typeSpecificInstructions = `
          - Focus on medication management, prescriptions, and patient education about drugs.
          - Include any recommendations for changes in medication, potential side effects, or interactions.
          - Document any counseling provided regarding proper medication use.
        `;
        break;
      case "Nurse Practitioner":
        typeSpecificInstructions = `
          - Focus on the patient's overall health, including any diagnoses, treatments, and follow-up care.
          - Include assessments, physical exams, and any referrals to specialists.
          - Document any prescribed treatments, medications, and patient education.
        `;
        break;
      case "Massage Therapy":
        typeSpecificInstructions = `
          - Focus on the patient's musculoskeletal issues and therapeutic massage techniques used.
          - Include any pain relief, muscle tension, or mobility improvements observed during the session.
          - Document any specific areas treated and the techniques used (e.g., deep tissue, Swedish).
        `;
        break;
      case "Occupational Therapy":
        typeSpecificInstructions = `
          - Focus on the patient's functional abilities and impairments.
          - Include any interventions related to daily living skills, motor skills, or cognitive function.
          - Document any assistive devices or techniques used to improve the patient's independence.
        `;
        break;
      case "Veterinary":
        typeSpecificInstructions = `
          - Focus on the animal's health, including any symptoms, behavior, and physical findings.
          - Include any diagnoses, treatments, or recommendations for care.
          - Document any lab results, vaccinations, or medical history relevant to the animal's condition.
        `;
        break;
      case "Podiatry":
        typeSpecificInstructions = `
          - Focus on the patient's foot and ankle health.
          - Include any diagnoses related to podiatric conditions (e.g., bunions, heel pain).
          - Document any treatments, procedures, or referrals to other specialists.
        `;
        break;
      case "Physical Therapy":
        typeSpecificInstructions = `
          - Focus on the patient's physical condition, mobility, and strength.
          - Include any exercises, physical assessments, or rehabilitation techniques used.
          - Document pain levels, range of motion, and functional goals.
        `;
        break;
      case "Speech Therapy (SLP)":
        typeSpecificInstructions = `
          - Focus on the patient's speech, language, and communication abilities.
          - Include assessments related to articulation, language comprehension, and social communication.
          - Document any therapy techniques or exercises used to improve speech and language skills.
        `;
        break;
      case "Registered Nurse":
        typeSpecificInstructions = `
          - Focus on the patient's overall health and nursing assessments.
          - Include vital signs, physical exams, and any nursing interventions.
          - Document any medications administered, patient education, or referrals to other healthcare providers.
        `;
        break;
      case "Acupuncture":
        typeSpecificInstructions = `
          - Focus on the acupuncture points, treatments, and any symptoms being addressed.
          - Document any changes in the patient's condition post-treatment.
          - Include any traditional Chinese medicine techniques used.
        `;
        break;
      case "Dentistry":
        typeSpecificInstructions = `
          - Focus on the patient's oral health, including any dental assessments and treatments.
          - Include diagnoses related to oral hygiene, cavities, gum health, and other dental conditions.
          - Document any procedures performed, such as cleanings, fillings, or extractions.
        `;
        break;
      default:
        typeSpecificInstructions = `
          - Include relevant details specific to the patient's condition and the therapy type.
          - Ensure that the SOAP note is comprehensive and tailored to the type of session.
        `;
        break;
    }
    let additionalDetails = "";
    if (patientName) {
      additionalDetails += `Patient Name: ${patientName}\n`;
    }
    if (therapistName) {
      additionalDetails += `Therapist Name: ${therapistName}\n`;
    }

    const prompt = `
You are an experienced healthcare professional specializing in ${type}. Your task is to create a detailed, well-structured SOAP note from the provided information. If the input is brief, expand on it logically based on typical ${type} sessions. Follow these specific guidelines:
${additionalDetails}
- Session Date: ${date}
- Session Time: ${time}
- ICD-10 Code: ${icd10}
- CPT Code: ${cpt}
Specific Session Type Requirements:
${typeSpecificInstructions}

General SOAP Note Guidelines:
1. Subjective Section:
   - Document reported symptoms and history
   - Include reported changes since last visit
   - Note any pertinent medical/social history mentioned
   - If information is limited, logically infer likely subjective data based on the type of session

2. Objective Section:
   - Record only observable, measurable data
   - Include any measurements, test results, or observations
   - Document examination findings
   - Note any quantifiable changes from previous sessions
   - If specific data is not provided, suggest typical objective findings for this type of session

3. Assessment Section:
   - Provide clear analysis of the condition
   - List any clinical impressions
   - Document progress towards treatment goals
   - Note any changes in condition from previous visits
   - If assessment details are sparse, provide a general assessment based on the available information and typical cases

4. Plan Section:
   - Detail specific treatment plans and interventions
   - List any modifications to existing treatment
   - Include follow-up instructions
   - Document any referrals or consultations needed
   - Note education provided
   - If the plan is not explicitly stated, suggest a general plan based on the type of session and available information

Please structure the following information into a professional SOAP note, maintaining clinical terminology and professional language throughout. Expand logically on brief inputs:

${sanitizedText}

Format your response strictly as follows:
Subjective:
[Your detailed subjective section]

Objective:
[Your detailed objective section]

Assessment:
[Your detailed assessment section]

Plan:
[Your detailed plan section]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an experienced healthcare professional with expertise in creating detailed SOAP notes. Maintain professional medical terminology and format throughout the documentation.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    // Get the structured text from the response
    const structuredText = response.choices[0].message.content.trim();

    // Parse sections using regex to handle different formatting possibilities
    const sections = {};
    const sectionRegex = {
      subjective:
        /Subjective:\s*([\s\S]*?)(?=\s*(?:Objective:|Assessment:|Plan:|$))/i,
      objective: /Objective:\s*([\s\S]*?)(?=\s*(?:Assessment:|Plan:|$))/i,
      assessment: /Assessment:\s*([\s\S]*?)(?=\s*(?:Plan:|$))/i,
      plan: /Plan:\s*([\s\S]*?)(?=$)/i,
    };

    // Extract each section using regex
    for (const [section, regex] of Object.entries(sectionRegex)) {
      const match = structuredText.match(regex);
      sections[section] = match ? match[1].trim() : "";
    }

    console.log(sections);
    // Return the structured SOAP note
    return {
      subjective: sections.subjective,
      objective: sections.objective,
      assessment: sections.assessment,
      plan: sections.plan,
    };
  } catch (error) {
    logger.error("Error structuring SOAP note:", error);
    throw error;
  }
}
