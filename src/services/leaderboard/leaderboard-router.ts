import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    DailyLeaderboardRequestValidator,
    SubmitLeaderboardRequestValidator,
    GlobalLeaderboardRequestValidator,
    PreviewLeaderboardResponseValidator,
    GlobalLeaderboardResponseValidator,
    SubmitLeaderboardResponseValidator,
} from "./leaderboard-schema";
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
 * Query params: day (YYYY-MM-DD), n (optional - number of winners, returns all if omitted)
 * Authorization: All authenticated users
 */

leaderboardRouter.get("/daily", RoleChecker([]), async (req, res) => {
    const { day, n } = DailyLeaderboardRequestValidator.parse({
        day: req.query.day,
        n: req.query.n,
    });

    const leaderboard = await getDailyLeaderboard(day, n);

    const response = PreviewLeaderboardResponseValidator.parse({
        leaderboard,
        day,
        count: n ?? leaderboard.length,
    });

    return res.status(StatusCodes.OK).json(response);
});

/**
 * GET /leaderboard/global
 * Get global leaderboard showing total accumulated points for all attendees
 * Query params: n (optional - number of winners, returns all if omitted)
 * Authorization: All authenticated users
 */
leaderboardRouter.get("/global", RoleChecker([]), async (req, res) => {
    const { n } = GlobalLeaderboardRequestValidator.parse({
        n: req.query.n,
    });

    const leaderboard = await getGlobalLeaderboard(n);

    const response = GlobalLeaderboardResponseValidator.parse({
        leaderboard,
        count: n ?? leaderboard.length,
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
        const payload = res.locals.payload;
        const submittedBy = payload.userId;

        const { day, n } = SubmitLeaderboardRequestValidator.parse(req.body);

        const leaderboard = await getDailyLeaderboard(day, n);

        const entriesProcessed = await promoteUsersToNextTier(
            leaderboard.map((entry) => entry.userId)
        );

        const { submissionId, submittedAt } = await recordLeaderboardSubmission(
            day,
            n,
            submittedBy
        );

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
