import { z } from "zod";

// Zod schema for speaker
export const SpeakerValidator = z.object({
    name: z.string(),
    title: z.string(),
    bio: z.string(),
    eventTitle: z.string(),
    eventDescription: z.string(),
    imgUrl: z.string(),
});
