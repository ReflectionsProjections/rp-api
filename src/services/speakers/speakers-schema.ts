import { Schema } from "mongoose";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Zod schema for speaker
export const SpeakerValidator = z.object({
    speakerId: z.coerce.string().default(() => uuidv4()),
    name: z.string(),
    title: z.string(),
    bio: z.string(),
    eventTitle: z.string(),
    eventDescription: z.string(),
    imgUrl: z.string(),
});

// Mongoose schema for speaker
export const SpeakerSchema = new Schema({
    speakerId: {
        type: String,
        required: true,
        unique: true,
        default: () => uuidv4(),
    },
    name: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    bio: {
        type: String,
        required: true,
    },
    eventTitle: {
        type: String,
        required: true,
    },
    eventDescription: {
        type: String,
        required: true,
    },
    imgUrl: {
        type: String,
        required: true,
    },
});
