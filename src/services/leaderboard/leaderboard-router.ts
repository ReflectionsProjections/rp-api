import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    DailyLeaderboardRequestValidator,
    SubmitLeaderboardRequestValidator,
    GlobalLeaderboardRequestValidator,
    CheckSubmissionRequestValidator,
    PreviewLeaderboardResponseValidator,
    GlobalLeaderboardResponseValidator,
    SubmitLeaderboardResponseValidator,
    CheckSubmissionResponseValidator,
} from "./leaderboard-schema";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import {
    getDailyLeaderboard,
    getGlobalLeaderboard,
    recordLeaderboardSubmission,
    promoteUsersToNextTier,
    checkLeaderboardSubmissionExists,
} from "./leaderboard-utils";

const leaderboardRouter = Router();

/**
 * @swagger
 * /leaderboard/daily:
 *   get:
 *     summary: Get the daily leaderboard
 *     description: |
 *       Returns the leaderboard rankings for a specific day, optionally limited
 *       to the top N entries.
 *
 *       **Required roles: none**
 *     tags: [Leaderboard]
 *     parameters:
 *       - name: day
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "2025-04-01"
 *         description: Date in YYYY-MM-DD format
 *       - name: n
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of top entries to return (returns all if omitted)
 *     responses:
 *       200:
 *         description: Daily leaderboard results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PreviewLeaderboardResponseValidator'
 *     security: []
 */
leaderboardRouter.get("/daily", async (req, res) => {
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
 * @swagger
 * /leaderboard/global:
 *   get:
 *     summary: Get the global leaderboard
 *     description: |
 *       Returns overall leaderboard rankings based on total accumulated points
 *       across all days, optionally limited to the top N entries.
 *
 *       **Required roles: none**
 *     tags: [Leaderboard]
 *     parameters:
 *       - name: n
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of top entries to return (returns all if omitted)
 *     responses:
 *       200:
 *         description: Global leaderboard results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GlobalLeaderboardResponseValidator'
 *     security: []
 */
leaderboardRouter.get("/global", async (req, res) => {
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
 * @swagger
 * /leaderboard/submission-status:
 *   get:
 *     summary: Check if a daily leaderboard has been submitted
 *     description: |
 *       Returns whether a leaderboard submission already exists for the given day,
 *       and its metadata if it does.
 *
 *       **Required roles: none**
 *     tags: [Leaderboard]
 *     parameters:
 *       - name: day
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "2025-04-01"
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Submission status for the given day
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckSubmissionResponseValidator'
 *     security:
 *       - bearerAuth: []
 */
leaderboardRouter.get(
    "/submission-status",
    RoleChecker([]),
    async (req, res) => {
        const { day } = CheckSubmissionRequestValidator.parse({
            day: req.query.day,
        });

        const submissionStatus = await checkLeaderboardSubmissionExists(day);

        const response =
            CheckSubmissionResponseValidator.parse(submissionStatus);

        return res.status(StatusCodes.OK).json(response);
    }
);

/**
 * @swagger
 * /leaderboard/submit:
 *   post:
 *     summary: Submit and lock daily leaderboard results
 *     description: |
 *       Finalises the leaderboard for a given day, promotes qualifying users to
 *       the next tier, and records the submission. Fails if a submission already
 *       exists for that day.
 *
 *       **Required roles: SUPER_ADMIN**
 *     tags: [Leaderboard]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitLeaderboardRequestValidator'
 *     responses:
 *       200:
 *         description: Submission recorded and tier promotions applied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitLeaderboardResponseValidator'
 *       409:
 *         description: A submission already exists for the given day
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "Leaderboard already submitted"
 *     security:
 *       - bearerAuth: []
 */
leaderboardRouter.post(
    "/submit",
    RoleChecker([Role.Enum.SUPER_ADMIN]),
    async (req, res) => {
        const payload = res.locals.payload;
        const submittedBy = payload.userId;

        const { day, n, userIdsToPromote } =
            SubmitLeaderboardRequestValidator.parse(req.body);

        // Check if this date has already been submitted
        const submissionStatus = await checkLeaderboardSubmissionExists(day);
        if (submissionStatus.exists) {
            return res.status(StatusCodes.CONFLICT).json({
                error: "Leaderboard already submitted",
                message: `A leaderboard submission already exists for ${day}`,
                existingSubmission: submissionStatus.submission,
            });
        }

        const leaderboard = await getDailyLeaderboard(day, n);

        // Use explicit user IDs if provided, otherwise use all users from leaderboard
        const userIdsForPromotion =
            userIdsToPromote || leaderboard.map((entry) => entry.userId);

        const entriesProcessed = await promoteUsersToNextTier(
            userIdsForPromotion,
            day
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
