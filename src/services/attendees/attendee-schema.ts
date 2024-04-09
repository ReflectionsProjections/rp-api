import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for attendee
const AttendeeValidator = z.object({
    name: z.string(),
    email: z.string().email(),
    studentInfo: z.object({
        university: z.string().nonempty(),
        graduation: z.string().nullable().optional(),
        major: z.string().nullable().optional(),
    }),
    events: z.array(z.string()),
    dietary_restrictions: z.string(),
    age: z.number().nullable().optional(),
    gender: z.string().nullable().optional(),
    race: z.array(z.string()).nullable().optional(),
    ethnicity: z.string().nullable().optional(),
    first_gen: z.string().nullable().optional(),
    hear_about_rp: z.array(z.string()).nullable().optional(),
    portfolio: z.string().nullable().optional(),
    job_interest: z.array(z.string()).nullable().optional(),
    interest_mech_puzzle: z.array(z.string()).nullable().optional(),
    priority_expiry: z.date().nullable().optional(),
    has_resume: z.boolean().optional(),
});

// Mongoose schema for attendee
const AttendeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    studentInfo: {
        university: { type: String, required: true },
        graduation: { type: String, default: null },
        major: { type: String, default: null },
    },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    dietary_restrictions: { type: String, required: true },
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    race: [{ type: String }],
    ethnicity: { type: String, default: null },
    first_gen: { type: String, default: null },
    hear_about_rp: [{ type: String }],
    portfolio: { type: String, default: null },
    job_interest: [{ type: String }],
    interest_mech_puzzle: [{ type: String }],
    priority_expiry: { type: Date, default: null },
    has_resume: { type: Boolean, default: false },
});

export { AttendeeSchema, AttendeeValidator };
