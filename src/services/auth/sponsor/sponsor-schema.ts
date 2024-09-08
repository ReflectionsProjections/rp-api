import mongoose from "mongoose";
import { z } from "zod";

export const SponsorAuthSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    hashedVerificationCode: { type: String, required: true },
    expTime: { type: Number, required: true },
});

export const SponsorAuthValidator = z.object({
    email: z.string().email(),
    hashedVerificationCode: z.string(),
    expTime: z.number().int(),
});

export const AuthSponsorLoginValidator = z.object({
    email: z.string().email(),
});

export const AuthSponsorVerifyValidator = z.object({
    email: z.string().email(),
    sixDigitCode: z.string().length(6),
});
