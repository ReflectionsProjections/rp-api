import { z } from "zod";
import { Tiers, IconColors } from "../attendee/attendee-schema";
import { registry } from "../../middleware/openapi-registry";

export const DayStringValidator = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Day must be in YYYY-MM-DD format",
});

// Request validator for daily leaderboard GET endpoint (n is optional)
export const DailyLeaderboardRequestValidator = registry.register(
    "DailyLeaderboardRequestValidator",
    z
        .object({
            day: DayStringValidator,
            n: z.coerce.number().int().min(1).optional(),
        })
        .openapi("DailyLeaderboardRequestValidator", {
            example: { day: "2025-04-01", n: 10 },
        })
);

// Request validator for leaderboard submission endpoint (n is required)
export const SubmitLeaderboardRequestValidator = registry.register(
    "SubmitLeaderboardRequestValidator",
    z
        .object({
            day: DayStringValidator,
            n: z.coerce.number().int().min(1),
            userIdsToPromote: z.array(z.string()).optional(),
        })
        .openapi("SubmitLeaderboardRequestValidator", {
            example: { day: "2025-04-01", n: 10 },
        })
);

// Request validator for global leaderboard endpoint (n is optional)
export const GlobalLeaderboardRequestValidator = registry.register(
    "GlobalLeaderboardRequestValidator",
    z
        .object({
            n: z.coerce.number().int().min(1).optional(),
        })
        .openapi("GlobalLeaderboardRequestValidator", {
            example: { n: 10 },
        })
);

// Request validator for checking submission status (day is required)
export const CheckSubmissionRequestValidator = registry.register(
    "CheckSubmissionRequestValidator",
    z
        .object({
            day: DayStringValidator,
        })
        .openapi("CheckSubmissionRequestValidator", {
            example: { day: "2025-04-01" },
        })
);

// Leaderboard entry - represents a single user in the leaderboard; reuse for global and daily
export const LeaderboardEntryValidator = registry.register(
    "LeaderboardEntryValidator",
    z
        .object({
            rank: z.number().int().min(1),
            userId: z.string(),
            displayName: z.string(),
            points: z.number().int().min(0),
            currentTier: Tiers,
            icon: IconColors,
        })
        .openapi("LeaderboardEntryValidator", {
            example: {
                rank: 1,
                userId: "abc123",
                displayName: "Jane Doe",
                points: 150,
                currentTier: "TIER2",
                icon: "BLUE",
            },
        })
);

// GET /daily response (preview)
export const PreviewLeaderboardResponseValidator = registry.register(
    "PreviewLeaderboardResponseValidator",
    z
        .object({
            leaderboard: z.array(LeaderboardEntryValidator),
            day: z.string(),
            count: z.number().int().min(0),
        })
        .openapi("PreviewLeaderboardResponseValidator", {
            example: {
                day: "2025-04-01",
                count: 1,
                leaderboard: [
                    {
                        rank: 1,
                        userId: "abc123",
                        displayName: "Jane Doe",
                        points: 150,
                        currentTier: "TIER2",
                        icon: "BLUE",
                    },
                ],
            },
        })
);

// GET /global response
export const GlobalLeaderboardResponseValidator = registry.register(
    "GlobalLeaderboardResponseValidator",
    z
        .object({
            leaderboard: z.array(LeaderboardEntryValidator),
            count: z.number().int().min(0),
        })
        .openapi("GlobalLeaderboardResponseValidator", {
            example: {
                count: 1,
                leaderboard: [
                    {
                        rank: 1,
                        userId: "abc123",
                        displayName: "Jane Doe",
                        points: 500,
                        currentTier: "TIER3",
                        icon: "GREEN",
                    },
                ],
            },
        })
);

// POST /submit response
export const SubmitLeaderboardResponseValidator = registry.register(
    "SubmitLeaderboardResponseValidator",
    z
        .object({
            leaderboard: z.array(LeaderboardEntryValidator),
            day: z.string(),
            count: z.number().int().min(0),
            entriesProcessed: z.number().int().min(0),
            submissionId: z.string().uuid(),
            submittedAt: z.string(),
            submittedBy: z.string(),
        })
        .openapi("SubmitLeaderboardResponseValidator", {
            example: {
                day: "2025-04-01",
                count: 10,
                entriesProcessed: 10,
                submissionId: "3a72d491-c2f9-4baf-af5a-55713621d978",
                submittedAt: "2025-04-01T23:59:00Z",
                submittedBy: "admin_user",
                leaderboard: [],
            },
        })
);

// GET /submission-status response
export const CheckSubmissionResponseValidator = registry.register(
    "CheckSubmissionResponseValidator",
    z
        .object({
            exists: z.boolean(),
            submission: z
                .object({
                    submissionId: z.string().uuid(),
                    submittedAt: z.string(),
                    submittedBy: z.string(),
                    count: z.number().int().min(0),
                })
                .optional(),
        })
        .openapi("CheckSubmissionResponseValidator", {
            example: {
                exists: true,
                submission: {
                    submissionId: "3a72d491-c2f9-4baf-af5a-55713621d978",
                    submittedAt: "2025-04-01T23:59:00Z",
                    submittedBy: "admin_user",
                    count: 10,
                },
            },
        })
);

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
export type CheckSubmissionRequest = z.infer<
    typeof CheckSubmissionRequestValidator
>;
export type CheckSubmissionResponse = z.infer<
    typeof CheckSubmissionResponseValidator
>;
