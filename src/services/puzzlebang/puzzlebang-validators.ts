import { z } from "zod";
import { registry } from "../../middleware/openapi-registry";

export const PuzzlebangCompleteRequestValidator = registry.register(
    "PuzzlebangCompleteRequestValidator",
    z
        .object({
            // userId: z.string(),
            email: z.string().email(),
            puzzleId: z.string(),
        })
        .openapi("PuzzlebangCompleteRequestValidator", {
            example: { email: "hacker@example.com", puzzleId: "puzzle_01" },
        })
);

export const PuzzlebangCompleteResponse = registry.register(
    "PuzzlebangCompleteResponse",
    z
        .object({
            email: z.string().email(),
            puzzlesCompleted: z.array(z.string()),
        })
        .openapi("PuzzlebangCompleteResponse", {
            example: {
                email: "hacker@example.com",
                puzzlesCompleted: ["puzzle_01", "puzzle_02"],
            },
        })
);
