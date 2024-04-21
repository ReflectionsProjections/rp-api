import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for registration
const RegistrationValidator = z.object({
    name: z.string().optional(),
    email: z.string().email(),
    events: z.array(z.string()).optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    points: z.number().min(0).default(0).optional(),
    complete: z.boolean().default(false),
});

// Mongoose schema for registration
const RegistrationSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, required: true, unique: true },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    dietary_restrictions: [{ type: String }],
    points: { type: Number, default: 0 },
    complete: { type: Boolean, default: false },
});

export { RegistrationSchema, RegistrationValidator };
