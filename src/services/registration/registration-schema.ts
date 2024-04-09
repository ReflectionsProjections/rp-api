import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for registration
const RegistrationValidator = z.object({
    name: z.string(),
    email: z.string().email(),
    events: z.array(z.string()),
    dietary_restrictions: z.string(),
    points: z.number().min(0).default(0),
});

// Mongoose schema for registration
const RegistrationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    dietary_restrictions: { type: String, required: true },
    points: { type: Number, default: 0 },
});

export { RegistrationSchema, RegistrationValidator };
