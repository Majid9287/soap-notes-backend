//models/soapNote.js
import mongoose from "mongoose";

const soapNoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text:{
        type: String
    },
    patientName: {
      type: String,
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("SoapNote", soapNoteSchema);
