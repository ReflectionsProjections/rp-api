// import mongoose from "mongoose";
import { Schema } from "mongoose";
import { z } from "zod";

export const EventValidator = z.object({
    eventId: z.coerce.string().cuid2(),
    name: z.string(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
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
});
// export const Event = mongoose.model("Event", EventSchema);
