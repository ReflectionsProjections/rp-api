import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for registration
const RegistrationValidator = z.object({
    userId: z.coerce.string(),
    name: z.string().min(1, "Name is required"),
    email: z.string().email(),
    university: z.string(),
    graduation: z.string().optional(),
    major: z.string().optional(),
    dietaryRestrictions: z.string().array(),
    allergies: z.string().array(),
    gender: z.string().optional(),
    ethnicity: z.array(z.string()).optional(),
    hearAboutRP: z.array(z.string()).optional(),
    portfolios: z.string().array(),
    jobInterest: z.array(z.string()).optional(),
    isInterestedMechMania: z.boolean(),
    isInterestedPuzzleBang: z.boolean(),
    hasResume: z.boolean().default(false),
    hasSubmitted: z.boolean().optional(),
    degree: z.string(),
});

// Mongoose schema for registration
const RegistrationSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    university: { type: String, required: true },
    graduation: { type: String, default: null },
    major: { type: String, default: null },
    dietaryRestrictions: [{ type: String, required: true }],
    allergies: [{ type: String, required: true }],
    gender: { type: String, default: null },
    ethnicity: [{ type: String }],
    hearAboutRP: [{ type: String }],
    portfolios: [{ type: String, required: true }],
    jobInterest: [{ type: String }],
    isInterestedMechMania: { type: Boolean },
    isInterestedPuzzleBang: { type: Boolean },
    hasResume: { type: Boolean, default: false },
    hasSubmitted: { type: Boolean, default: false },
    degree: { type: String },
});

export { RegistrationSchema, RegistrationValidator };
