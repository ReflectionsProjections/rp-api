import { Schema } from "mongoose";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export const EventType = z.enum([
    "SPEAKER",
    "CORPORATE",
    "SPECIAL",
    "PARTNERS",
    "MEALS",
    "CHECKIN",
]);

export type InternalEvent = z.infer<typeof internalEventView>;
export type EventInputPayload = z.infer<typeof eventInfoValidator>;

export const externalEventView = z.object({
    eventId: z.coerce.string().default(() => uuidv4()),
    name: z.string(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    points: z.number().min(0),
    description: z.string(),
    isVirtual: z.boolean(),
    imageUrl: z.string().nullable(),
    location: z.string().nullable(),
    eventType: EventType,
});

export const internalEventView = externalEventView.extend({
    attendanceCount: z.number(),
    isVisible: z.boolean(),
});

// ApiResponseSchema objects used to create expected internal and external event objects
const eventTimeExtension = {
    startTime: z.string(),
    endTime: z.string(),
};

export const externalEventApiResponseSchema =
    externalEventView.extend(eventTimeExtension);
export type ExternalEventApiResponse = z.infer<
    typeof externalEventApiResponseSchema
>;

export const internalEventApiResponseSchema =
    internalEventView.extend(eventTimeExtension);
export type InternalEventApiResponse = z.infer<
    typeof internalEventApiResponseSchema
>;

export const eventInfoValidator = internalEventView
    .omit({ eventId: true })
    .strict();

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
    location: {
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
    eventType: {
        type: String,
        required: true,
        enum: EventType.Values,
    },
});

export const EventAttendanceSchema = new Schema({
    eventId: {
        type: String,
        ref: "Event",
        required: true,
    },
    attendees: [
        {
            type: String,
            ref: "Attendee",
            required: true,
        },
    ],
});

export const EventAttendanceValidator = z.object({
    eventId: z.string(),
    attendees: z.array(z.string()),
});
