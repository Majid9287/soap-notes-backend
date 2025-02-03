//models/soapNote.js
import mongoose from "mongoose";
import { encrypt, decrypt } from "../utils/cryptoUtils.js";

const soapNoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      set: encrypt,
      get: decrypt,
    },
    patientName: {
      type: String,
      // set: encrypt,
      // get: decrypt,
    },
    therapistName: {
      type: String,
    },
    subjective: {
      type: String,
    },
    objective: {
      type: String,
    },
    assessment: {
      type: String,
    },
    plan: {
      type: String,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    icd10: {
      type: String,
      required: true,
    },
    cpt: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: { getters: true },
    timestamps: true,
  }
);

export default mongoose.model("SoapNote", soapNoteSchema);

