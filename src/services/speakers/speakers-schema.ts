import { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

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
