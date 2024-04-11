// import mongoose from "mongoose";
import { Schema } from "mongoose";
import { z } from "zod";

export const EventValidator = z.object({
    eventId: z.coerce.string(),
    name: z.string(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    points: z.number().min(0),
});

export const EventSchema = new Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        required: true,
    },

    points: {
        type: Number,
        required: true,
    },
});
