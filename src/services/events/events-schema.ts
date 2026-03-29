import { Schema } from "mongoose";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { registry } from "../../middleware/openapi-registry";

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

export const externalEventView = registry.register(
    "ExternalEventView",
    z
        .object({
            eventId: z.coerce.string().default(() => uuidv4()),
            name: z.string(),
            startTime: z.coerce.date().openapi({ format: "date-time" }),
            endTime: z.coerce.date().openapi({ format: "date-time" }),
            points: z.number().min(0),
            description: z.string(),
            isVirtual: z.boolean(),
            imageUrl: z.string().nullable(),
            location: z.string().nullable(),
            eventType: EventType,
            tags: z.array(z.string()).default([]),
        })
        .openapi("ExternalEventView", {
            example: {
                eventId: "3a72d491-c2f9-4baf-af5a-55713621d978",
                name: "Test Event",
                startTime: new Date("2025-03-31T19:30:00Z"),
                endTime: new Date("2025-03-31T23:30:00Z"),
                points: 0,
                description: "Awesome test event",
                isVirtual: false,
                imageUrl: "example.com/image.png",
                location: "Siebel Center for CS",
                eventType: "SPEAKER",
                tags: [],
            },
        })
);

export const internalEventView = registry.register(
    "InternalEventView",
    externalEventView
        .extend({
            attendanceCount: z.number(),
            isVisible: z.boolean(),
        })
        .openapi("InternalEventView", {
            example: {
                eventId: "3a72d491-c2f9-4baf-af5a-55713621d978",
                name: "Test Event",
                startTime: new Date("2025-03-31T19:30:00Z"),
                endTime: new Date("2025-03-31T23:30:00Z"),
                points: 0,
                description: "Awesome test event",
                isVirtual: false,
                imageUrl: "example.com/image.png",
                location: "Siebel Center for CS",
                eventType: "SPEAKER",
                tags: [],
                attendanceCount: 0,
                isVisible: true,
            },
        })
);

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

export const eventInfoValidator = registry.register(
    "EventInfoValidator",
    internalEventView
        .omit({ eventId: true })
        .strict()
        .openapi("EventInfoValidator", {
            example: {
                name: "Test Event",
                startTime: new Date("2025-03-31T19:30:00Z"),
                endTime: new Date("2025-03-31T23:30:00Z"),
                points: 0,
                description: "Awesome test event",
                isVirtual: false,
                imageUrl: "example.com/image.png",
                location: "Siebel Center for CS",
                eventType: "SPEAKER",
                tags: [],
                attendanceCount: 0,
                isVisible: true,
            },
        })
);

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
