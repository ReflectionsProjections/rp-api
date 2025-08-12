import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for registration drafts
const RegistrationDraftValidator = z.object({
    allergies: z.array(z.string()).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    educationLevel: z.string().optional(),
    email: z.string().email().optional(),
    ethnicity: z.array(z.string()).optional(),
    gender: z.string().optional(),
    graduationYear: z.string().optional(),
    howDidYouHear: z.array(z.string()).optional(),
    majors: z.array(z.string()).optional(),
    minors: z.array(z.string()).optional(),
    name: z.string().optional(),
    opportunities: z.array(z.string()).optional(),
    personalLinks: z.array(z.string()).optional(),
    resume: z.string().optional(),
    school: z.string().optional(),
    isInterestedMechMania: z.boolean().optional(),
    isInterestedPuzzleBang: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
});

// Zod schema for registration
const RegistrationValidator = z.object({
    allergies: z.array(z.string()),
    dietaryRestrictions: z.array(z.string()),
    educationLevel: z.string(),
    email: z.string().email(),
    ethnicity: z.array(z.string()),
    gender: z.string(),
    graduationYear: z.string(),
    howDidYouHear: z.array(z.string()),
    majors: z.array(z.string()),
    minors: z.array(z.string()),
    name: z.string(),
    opportunities: z.array(z.string()),
    personalLinks: z.array(z.string()),
    resume: z.string(),
    school: z.string(),
    isInterestedMechMania: z.boolean(),
    isInterestedPuzzleBang: z.boolean(),
    tags: z.array(z.string()),
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

export {
    RegistrationSchema,
    RegistrationDraftValidator,
    RegistrationValidator,
};
