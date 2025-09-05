import { z } from "zod";
import { Tiers, IconColors } from "../attendee/attendee-schema";

export const DayStringValidator = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Day must be in YYYY-MM-DD format",
});

// Request validator for daily leaderboard GET endpoint (n is optional)
export const DailyLeaderboardRequestValidator = z.object({
    day: DayStringValidator,
    n: z.coerce.number().int().min(1).optional(),
});

// Request validator for leaderboard submission endpoint (n is required)
export const SubmitLeaderboardRequestValidator = z.object({
    day: DayStringValidator,
    n: z.coerce.number().int().min(1),
});

// Request validator for global leaderboard endpoint (n is optional)
export const GlobalLeaderboardRequestValidator = z.object({
    n: z.coerce.number().int().min(1).optional(),
});

// Leaderboard entry - represents a single user in the leaderboard; reuse for global and daily
export const LeaderboardEntryValidator = z.object({
    rank: z.number().int().min(1),
    userId: z.string(),
    displayName: z.string(),
    points: z.number().int().min(0),
    currentTier: Tiers,
    icon: IconColors,
});

// GET /daily response (preview)
export const PreviewLeaderboardResponseValidator = z.object({
    leaderboard: z.array(LeaderboardEntryValidator),
    day: z.string(),
    count: z.number().int().min(1),
});

// GET /global response
export const GlobalLeaderboardResponseValidator = z.object({
    leaderboard: z.array(LeaderboardEntryValidator),
    count: z.number().int().min(1),
});

// POST /submit response
export const SubmitLeaderboardResponseValidator = z.object({
    leaderboard: z.array(LeaderboardEntryValidator),
    day: z.string(),
    count: z.number().int().min(1),
    entriesProcessed: z.number().int().min(0),
    submissionId: z.string().uuid(),
    submittedAt: z.string(),
    submittedBy: z.string(),
});

// Type exports
export type DailyLeaderboardRequest = z.infer<
    typeof DailyLeaderboardRequestValidator
>;
export type SubmitLeaderboardRequest = z.infer<
    typeof SubmitLeaderboardRequestValidator
>;
export type GlobalLeaderboardRequest = z.infer<
    typeof GlobalLeaderboardRequestValidator
>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntryValidator>;
export type PreviewLeaderboardResponse = z.infer<
    typeof PreviewLeaderboardResponseValidator
>;
export type GlobalLeaderboardResponse = z.infer<
    typeof GlobalLeaderboardResponseValidator
>;
export type SubmitLeaderboardResponse = z.infer<
    typeof SubmitLeaderboardResponseValidator
>;
