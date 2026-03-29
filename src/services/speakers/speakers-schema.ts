import { Schema } from "mongoose";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { registry } from "../../middleware/openapi-registry";

export type SpeakerType = z.infer<typeof SpeakerValidator>;
export type UpdateSpeakerType = z.infer<typeof UpdateSpeakerValidator>;

// Zod schema for speaker
export const SpeakerValidator = registry.register(
    "SpeakerValidator",
    z
        .object({
            speakerId: z.coerce.string().default(() => uuidv4()),
            name: z.string(),
            title: z.string(),
            bio: z.string(),
            eventTitle: z.string(),
            eventDescription: z.string(),
            imgUrl: z.string(),
        })
        .openapi("SpeakerValidator", {
            example: {
                speakerId: "3a72d491-c2f9-4baf-af5a-55713621d978",
                name: "Jane Doe",
                title: "Software Engineer",
                bio: "Jane is a software engineer at Acme Corp.",
                eventTitle: "Building Scalable Systems",
                eventDescription: "A talk about distributed system design.",
                imgUrl: "example.com/jane.png",
            },
        })
);

// Zod schema for updating speaker (omits speakerId)
export const UpdateSpeakerValidator = registry.register(
    "UpdateSpeakerValidator",
    SpeakerValidator.omit({ speakerId: true })
        .strict()
        .openapi("UpdateSpeakerValidator", {
            example: {
                name: "Jane Doe",
                title: "Software Engineer",
                bio: "Jane is a software engineer at Acme Corp.",
                eventTitle: "Building Scalable Systems",
                eventDescription: "A talk about distributed system design.",
                imgUrl: "example.com/jane.png",
            },
        })
);

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
