import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    LeaderboardRequestValidator,
    GlobalLeaderboardRequestValidator,
    PreviewLeaderboardResponseValidator,
    GlobalLeaderboardResponseValidator,
    SubmitLeaderboardResponseValidator,
} from "./leaderboard-schema";
// import { SupabaseDB } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import {
    getDailyLeaderboard,
    getGlobalLeaderboard,
    recordLeaderboardSubmission,
    promoteUsersToNextTier,
} from "./leaderboard-utils";

const leaderboardRouter = Router();

/**
 * GET /leaderboard/daily
 * Get daily leaderboard for display in mobile app and admin preview
 * Query params: day (YYYY-MM-DD), n (number of winners)
 * Authorization: All authenticated users
 */

leaderboardRouter.get("/daily", RoleChecker([]), async (req, res) => {
    const { day, n } = LeaderboardRequestValidator.parse({
        day: req.query.day,
        n: req.query.n,
    });

    // Get daily leaderboard data
    const leaderboard = await getDailyLeaderboard(day, n);

    const response = PreviewLeaderboardResponseValidator.parse({
        leaderboard,
        day,
        count: n,
    });

    return res.status(StatusCodes.OK).json(response);
});

/**
 * GET /leaderboard/global
 * Get global leaderboard showing total accumulated points for all attendees
 * Query params: n (number of winners)
 * Authorization: All authenticated users
 */
leaderboardRouter.get("/global", RoleChecker([]), async (req, res) => {
    const { n } = GlobalLeaderboardRequestValidator.parse({
        n: req.query.n,
    });

    // Get global leaderboard data
    const leaderboard = await getGlobalLeaderboard(n);

    const response = GlobalLeaderboardResponseValidator.parse({
        leaderboard,
        count: n,
    });

    return res.status(StatusCodes.OK).json(response);
});

/**
 * POST /leaderboard/submit
 * Submit and lock in daily leaderboard results, updating tier eligibility
 * Body: { day: string, n: number }
 * Authorization: ADMIN only (higher privilege than preview)
 */
leaderboardRouter.post(
    "/submit",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        // Get current admin user
        const payload = res.locals.payload;
        const submittedBy = payload.userId;

        const { day, n } = LeaderboardRequestValidator.parse(req.body);

        // Get leaderboard winners
        const leaderboard = await getDailyLeaderboard(day, n);

        // Promote winners to next tier
        const entriesProcessed = await promoteUsersToNextTier(
            leaderboard.map((entry) => entry.userId)
        );

        const { submissionId, submittedAt } = await recordLeaderboardSubmission(
            day,
            n,
            submittedBy
        );

        // Structure response according to schema
        const response = SubmitLeaderboardResponseValidator.parse({
            leaderboard,
            day,
            count: n,
            entriesProcessed,
            submissionId,
            submittedAt,
            submittedBy,
        });

        return res.status(StatusCodes.OK).json(response);
    }
);

export default leaderboardRouter;
