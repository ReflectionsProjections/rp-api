import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for registration
const RegistrationValidator = z.object({
    userId: z.coerce.string().regex(/user[0-9]*/),
    name: z.string(),
    email: z.string().email(),
    university: z.string(),
    graduation: z.string().nullable().optional(),
    major: z.string().nullable().optional(),
    dietaryRestrictions: z.string().array(),
    allergies: z.string().array(),
    age: z.number().nullable().optional(),
    gender: z.string().nullable().optional(),
    race: z.array(z.string()).nullable().optional(),
    ethnicity: z.array(z.string()).nullable().optional(),
    firstGen: z.string().nullable().optional(),
    hearAboutRP: z.array(z.string()).nullable().optional(),
    portfolios: z.string().array(),
    jobInterest: z.array(z.string()).nullable().optional(),
    isInterestedMechMania: z.boolean(),
    isInterestedPuzzleBang: z.boolean(),
    hasResume: z.boolean().default(false),
    hasSubmitted: z.boolean().optional(),
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
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    race: [{ type: String }],
    ethnicity: [{ type: String }],
    firstGen: { type: String, default: null },
    hearAboutRP: [{ type: String }],
    portfolio: { type: String, default: null },
    jobInterest: [{ type: String }],
    isInterestedMechMania: { type: Boolean },
    isInterestedPuzzleBang: { type: Boolean },
    hasResume: { type: Boolean, default: false },
    hasSubmitted: { type: Boolean, default: false },
});

const RegistrationFilterValidator = z.object({
    graduations: z.array(z.string()).optional(),
    majors: z.array(z.string()).optional(),
    jobInterests: z.array(z.string()).optional(),
});

export {
    RegistrationSchema,
    RegistrationValidator,
    RegistrationFilterValidator,
};
