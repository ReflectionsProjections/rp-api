import { Schema } from "mongoose";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export type SpeakerType = z.infer<typeof SpeakerValidator>;
export type UpdateSpeakerType = z.infer<typeof UpdateSpeakerValidator>;

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

// Zod schema for updating speaker (omits speakerId)
export const UpdateSpeakerValidator = SpeakerValidator.omit({
    speakerId: true,
}).strict();

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
