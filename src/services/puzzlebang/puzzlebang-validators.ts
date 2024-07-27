import { z } from "zod";

export const PuzzlebangCompleteRequestValidator = z.object({
    // userId: z.string(),
    email: z.string().email(),
    puzzleId: z.string(),
});
