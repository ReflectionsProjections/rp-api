import { Schema } from "mongoose";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export const publicEventValidator = z.object({
    eventId: z.coerce.string().optional(),
    name: z.string(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    points: z.number().min(0),
    description: z.string(),
    isVirtual: z.boolean(),
    imageUrl: z.string().nullable().optional(),
    isVisible: z.boolean().default(false),
});

export const privateEventValidator = z.object({
    eventId: z.coerce.string().optional(),
    name: z.string(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    points: z.number().min(0),
    description: z.string(),
    isVirtual: z.boolean(),
    imageUrl: z.string().nullable().optional(),
    isVisible: z.boolean().default(false),
    attendanceCount: z.number(),
});

export const EventSchema = new Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        default: () => uuidv4(),
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
    description: {
        type: String,
        required: true,
    },
    isVirtual: {
        type: Boolean,
        required: true,
    },
    imageUrl: {
        type: String,
        default: null,
    },
    isVisible: {
        type: Boolean,
        default: false,
    },
    attendanceCount: {
        type: Number,
        default: 0,
    },
});
