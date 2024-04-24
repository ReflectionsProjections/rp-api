import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for attendee
const AttendeeValidator = z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    events: z.array(z.string()),
    dietary_restrictions: z.string(),
    priority_expiry: z.date().nullable().optional(),
    points: z.number().min(0).default(0),
});

// Mongoose schema for attendee
const AttendeeSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    dietary_restrictions: { type: String, required: true },
    priority_expiry: { type: Date, default: null },
    points: { type: Number, default: 0 },
});

export { AttendeeSchema, AttendeeValidator };
