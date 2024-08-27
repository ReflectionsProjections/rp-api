import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Zod schema for speaker
export const SpeakerValidator = z.object({
    name: z.string(),
    title: z.string(),
    bio: z.string(),
    eventTitle: z.string(),
    eventDescription: z.string(),
    imgUrl: z.string(),
});
