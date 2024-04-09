import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for event
const EventValidator = z.object({
    name: z.string(),
    description: z.string(),
    start_time: z.date(),
    end_time: z.date(),
    attendees: z.array(z.string()),
    location: z.array(
        z.object({
            description: z.string(),
            tags: z.array(z.string()),
            latitude: z.number(),
            longitude: z.number(),
        })
    ),
    virtual: z.boolean(),
    upgrade: z.boolean().default(false),
    downgrade: z.boolean().default(false),
    imageUrl: z.string().nullable().optional(),
    visible: z.boolean().default(false),
});

// Mongoose schema for location
const LocationSchema = new mongoose.Schema({
    description: { type: String, required: true },
    tags: [{ type: String }],
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
});

// Mongoose schema for event
const EventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Attendee" }],
    location: [LocationSchema],
    virtual: { type: Boolean, required: true },
    upgrade: { type: Boolean, default: false },
    downgrade: { type: Boolean, default: false },
    imageUrl: { type: String, default: null },
    visible: { type: Boolean, default: false },
});

export { EventSchema, EventValidator, LocationSchema };
