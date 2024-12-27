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
  
  export async function structureSOAPNote(text, type, patientName = null, therapistName = null) {
    try {
      // Define specific instructions based on the type of session
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
  
      // Build the base prompt with clear instructions
      let prompt = `
        You are a professional medical assistant tasked with structuring the following information into a SOAP note. 
        The SOAP note should be clear, concise, and highly professional. Ensure that each section (Subjective, Objective, Assessment, Plan) is distinct and well-defined.
        If the patient's name and therapist's name are provided, please include them at the beginning of the note.
  
        **Type of Session**: ${type}
        **Instructions**: ${typeSpecificInstructions}
  
        Text for structuring: 
        "${text}"
  
        The SOAP note should include the following sections:
  
        1. **Subjective**: 
           - This section should include the patient's description of their condition, symptoms, and any relevant history. 
           - Include any complaints, pain descriptions, or concerns expressed by the patient. 
           - Use the patient's own words when possible.
  
        2. **Objective**: 
           - Include measurable and observable data such as physical exam findings, test results, and other objective information. 
           - Provide clear, factual data such as vital signs, physical exam findings, and lab results.
  
        3. **Assessment**: 
           - Provide a clinical interpretation of the subjective and objective findings. 
           - Include a diagnosis or differential diagnosis based on the information provided. 
           - Discuss any relevant medical history or risk factors that may influence the diagnosis.
  
        4. **Plan**: 
           - Outline the treatment plan, next steps, and any follow-up instructions. 
           - Include recommendations for therapy, medications, referrals, or other interventions. 
           - Provide clear action steps and timelines for follow-up care.
  
        If the patient’s name and therapist’s name are provided, please include them at the beginning of the SOAP note.
  
        **Patient Name**: ${patientName ? patientName : "Not Provided"}
        **Therapist Name**: ${therapistName ? therapistName : "Not Provided"}
  
        Please structure the note into the following format:
        Subjective:
        (Your response here)
  
        Objective:
        (Your response here)
  
        Assessment:
        (Your response here)
  
        Plan:
        (Your response here)
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
      console.log(structuredNote);
  
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
  
