import mongoose from "mongoose";
import { z } from "zod";

export const SponsorSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    hashedVerificationCode: { type: String, required: true }, // Ensure this matches your zod schema
    expTime: { type: Number, required: true }
});

export const SponsorValidator = z.object({
    email: z.string().email(),
    hashedVerificationCode: z.string(), // Ensure this matches your mongoose schema
    expTime: z.number().int()
});