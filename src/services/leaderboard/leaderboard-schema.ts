import { z } from "zod";

export const DayStringValidator = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Day must be in YYYY-MM-DD format"
});

export const LeaderboardRequestValidator = z.object({
    day: DayStringValidator,
    n: z.coerce.number().int().min(1)
});

export enum TierType {
    TIER1 = "tier1",
    TIER2 = "tier2", 
    TIER3 = "tier3",
    NONE = "none"
}

export const TierTypeValidator = z.nativeEnum(TierType);

// reuse for global and daily
export const LeaderboardEntryValidator = z.object({
    rank: z.number().int().min(1),
    userId: z.string(),
    displayName: z.string(),
    points: z.number().int().min(0),
    icon: z.string(),
    tier: z.string(),
});

export const PreviewLeaderboardResponseValidator = z.object({
    leaderboard: z.array(LeaderboardEntryValidator),
    day: z.string(),
    count: z.number().int().min(1)
});

export const SubmitLeaderboardResponseValidator = z.object({
    // adding leaderboard in the response here if possible
    day: z.string(),
    count: z.number().int().min(1),
    entriesProcessed: z.number().int().min(0),
    submissionId: z.string().uuid(),
    submittedAt: z.string(),
    submittedBy: z.string(),
});

export type LeaderboardRequest = z.infer<typeof LeaderboardRequestValidator>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntryValidator>;
export type PreviewLeaderboardResponse = z.infer<typeof PreviewLeaderboardResponseValidator>;
export type SubmitLeaderboardResponse = z.infer<typeof SubmitLeaderboardResponseValidator>;

