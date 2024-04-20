import mongoose from "mongoose";
import { boolean, z } from "zod";

// Zod schema for registration
const RegistrationValidator = z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    studentInfo: z.object({
        university: z.string().nonempty(),
        graduation: z.string().nullable().optional(),
        major: z.string().nullable().optional(),
    }),
    dietary_restrictions: z.string(),
    age: z.number().nullable().optional(),
    gender: z.string().nullable().optional(),
    race: z.array(z.string()).nullable().optional(),
    ethnicity: z.array(z.string()).nullable().optional(),
    first_gen: z.string().nullable().optional(),
    hear_about_rp: z.array(z.string()).nullable().optional(),
    portfolio: z.string().nullable().optional(),
    job_interest: z.array(z.string()).nullable().optional(),
    interest_mech_puzzle: z.array(z.string()).nullable().optional(),
    has_resume: z.boolean()
});

// Mongoose schema for registration
const RegistrationSchema = new mongoose.Schema({
    userId: {type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    studentInfo: {
        university: { type: String, required: true },
        graduation: { type: String, default: null },
        major: { type: String, default: null },
    },
    dietary_restrictions: { type: String, required: true },
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    race: [{ type: String }],
    ethnicity: [{ type: String }],
    first_gen: { type: String, default: null },
    hear_about_rp: [{ type: String }],
    portfolio: { type: String, default: null },
    job_interest: [{ type: String }],
    interest_mech_puzzle: [{ type: String }],    
    has_resume: { type: Boolean, default: false },
});

export { RegistrationSchema, RegistrationValidator };
