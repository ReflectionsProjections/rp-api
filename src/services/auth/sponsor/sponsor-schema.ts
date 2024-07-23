import mongoose from "mongoose";
import { z } from "zod";

export const SponsorSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    hashedVerificationCode: { type: String, required: true },
    expTime: { type: Number, required: true },
});

export const SponsorValidator = z.object({
    email: z.string().email(),
    hashedVerificationCode: z.string(),
    expTime: z.number().int(),
});
