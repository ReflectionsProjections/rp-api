import mongoose from "mongoose";
import { Schema } from "mongoose";
import { z } from "zod";

export const EventValidator = z.object({
    eventId: z.coerce.string().cuid2(),
    name: z.string(),
    start_time: z.coerce.string().datetime(),
    end_time: z.coerce.string().datetime(),
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
