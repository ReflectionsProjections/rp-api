import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for attendee
const AttendeeValidator = z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    dietaryRestrictions: z.string().array(),
    points: z.number().min(0).default(0),
});

// Mongoose schema for attendee
const AttendeeSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    dietaryRestrictions: [{ type: String, required: true }],
    points: { type: Number, default: 0 },
});

export { AttendeeSchema, AttendeeValidator };
