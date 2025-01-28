import Joi from "joi";

export const soapInputValidationSchema = Joi.object({
  input_type: Joi.string().valid("audio", "text").required().messages({
    "any.required": "Input type is required.",
    "string.empty": "Input type cannot be empty.",
  }),
  type: Joi.string().required().messages({
    "any.required": "Type is required.",
    "string.empty": "Type cannot be empty.",
  }),

  text: Joi.when("input_type", {
    is: "text",
    then: Joi.string().required().messages({
      "any.required": "text input required for text input.",
    }),
    otherwise: Joi.forbidden(),
  }),
  patientName: Joi.string().optional().allow("", null),
  therapistName: Joi.string().optional().allow("", null),
  date: Joi.date().required().messages({
    "any.required": "Date is required.",
    "date.base": "Date must be a valid date.",
  }),
  time: Joi.string().required().messages({
    "any.required": "Time is required.",
    "string.empty": "Time cannot be empty.",
  }),
  icd10: Joi.string().required().messages({
    "any.required": "ICD 10 is required.",
    "string.empty": "ICD 10 cannot be empty.",
  }),
  cpt: Joi.string().required().messages({
    "any.required": "CPT is required.",
    "string.empty": "CPT cannot be empty.",
  }),
});
