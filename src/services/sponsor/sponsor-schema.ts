import mongoose from "mongoose";
import { z } from "zod";

// // Zod schema for registration
// export const AuthValidator = z.object({
//     email: z.string().email(),
//     hashedVerificationCode: z.string(),
//     expTime: z.number()
// });

// // Mongoose schema for registration
// export const AuthSchema = new mongoose.Schema({
//     email: { type: String, required: true, unique: true },
//     hashedVerificationCode: { type: String, required: true },
//     expTime: { type: Number, required: true } // Add this line to include expTime
// });

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