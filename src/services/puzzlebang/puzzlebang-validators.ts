import { z } from "zod";

export const PuzzlebangCompleteRequestValidator = z.object({
    userId: z.string(),
    puzzleId: z.string(),
});
