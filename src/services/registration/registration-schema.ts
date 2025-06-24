import mongoose from "mongoose";
import { z } from "zod";

export const RegistrationDraftValidator = z.object({
    name: z.string().optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    school: z.string().optional(),
    educationLevel: z.string().optional(),
    major: z.string().optional(),
    graduationYear: z.string().optional(),
    opportunities: z.array(z.string()).optional(),
    hasResume: z.boolean().optional(),
    personalLinks: z.array(z.string().url()).max(5).optional(),
    gender: z.string().optional(),
    ethnicity: z.array(z.string()).optional(),
    howDidYouHear: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
});

export const RegistrationValidator = z.object({
    name: z.string().min(1),
    dietaryRestrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    school: z.string().min(1),
    educationLevel: z.string().min(1),
    major: z.string().min(1),
    graduationYear: z.string().min(1),
    opportunities: z.array(z.string()).optional(),
    hasResume: z.boolean().optional(),
    personalLinks: z.array(z.string().url()).max(5).optional(),
    gender: z.string().optional(),
    ethnicity: z.array(z.string()).optional(),
    howDidYouHear: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
});

export const RegistrationDraftSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: String,
    dietaryRestrictions: [{ type: String }],
    allergies: [{ type: String }],
    school: String,
    educationLevel: String,
    major: String,
    graduationYear: String,
    opportunities: [{ type: String }],
    hasResume: { type: Boolean, default: false },
    personalLinks: [String],
    gender: { type: String },
    ethnicity: [{ type: String }],
    howDidYouHear: [{ type: String }],
    tags: [{ type: String }],
    lastUpdated: { type: Date, default: Date.now },
});

export const RegistrationSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    dietaryRestrictions: [{ type: String }],
    allergies: [{ type: String }],
    school: { type: String, required: true },
    educationLevel: { type: String, required: true },
    major: { type: String, required: true },
    graduationYear: { type: String, required: true },
    opportunities: [{ type: String }],
    hasResume: { type: Boolean, default: false },
    personalLinks: [{ type: String }],
    gender: { type: String },
    ethnicity: [{ type: String }],
    howDidYouHear: [{ type: String }],
    tags: [{ type: String }],
    submittedAt: { type: Date, default: Date.now },
});
