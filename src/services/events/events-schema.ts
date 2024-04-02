import { Schema } from "mongoose";
import { z } from "zod";

export const EventInfo = z.object({
    eventId: z.coerce.string().cuid2(),
    name: z.string(),
    date: z.date(),
    start_time: z.date(),
    end_time: z.date(),
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
        required: true
    },
    start_time: {
        type: Date,
        required: true
    },
    end_time: {
        type: Date,
        required: true
    }
});
