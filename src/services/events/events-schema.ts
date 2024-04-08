import mongoose from "mongoose";
import { Schema } from "mongoose";
import { z } from "zod";

export const EventInfo = z.object({
    eventId: z.coerce.string().cuid2(),
    name: z.string(),
    date: z.string().transform((str) => new Date(str)),
    start_time: z.string().transform((str) => new Date(str)),
    end_time: z.string().transform((str) => new Date(str)),
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
    date: {
        type: Date,
        required: true,
    },
    start_time: {
        type: Date,
        required: true,
    },
    end_time: {
        type: Date,
        required: true,
    },
});
export const Event = mongoose.model("Event", EventSchema);
