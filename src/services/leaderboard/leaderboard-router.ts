import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    LeaderboardRequestValidator,
    PreviewLeaderboardResponseValidator,
    SubmitLeaderboardResponseValidator,
} from "./leaderboard-schema";
import { SupabaseDB } from "../../supabase";
import RoleChecker from "../../middleware/role-checker";
import { JwtPayloadType, Role } from "../auth/auth-models";
import {
    getDailyLeaderboard,
    isDayAlreadySubmitted,
    recordLeaderboardSubmission,
    updateUsersTierEligibility,
} from "./leaderboard-utils";

const leaderboardRouter = Router();

/**
 * GET /leaderboard/daily
 * Preview daily leaderboard without making any permanent changes
 * Query params: day (YYYY-MM-DD), n (number of winners)
 * Authorization: STAFF, ADMIN
 */

// get global leaderboard endpoint

leaderboardRouter.get(
    "/daily",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        try {
            // TODO: Implement GET /daily endpoint
            // 1. Validate query parameters using GetLeaderboardValidator
            // 2. Validate day format and check if it's a reasonable date
            // 3. Call getDailyLeaderboard() to get preview results
            // 4. Return leaderboard data with isPreview: true
            // 5. Handle all error cases (invalid date, no data, database errors)
            
            return res.status(StatusCodes.NOT_IMPLEMENTED).json({
                error: "NotImplemented",
                message: "GET /daily endpoint not yet implemented"
            });
        } catch (error) {
            console.error("Error in GET /daily:", error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: "InternalServerError",
                message: "An unexpected error occurred while generating the leaderboard"
            });
        }
    }
);

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
        try {
            // TODO: Implement POST /submit endpoint
            // 1. Validate request body using SubmitLeaderboardValidator
            // 2. Check if this day has already been submitted using isDayAlreadySubmitted()
            // 3. Get the leaderboard winners using getDailyLeaderboard()
            // 4. Start database transaction for atomic updates
            // 5. For each winner:
            //    a. Get their next eligible tier using getNextEligibleTier()
            //    b. Update their tier eligibility using updateUserTierEligibility()
            // 6. Record the submission using recordLeaderboardSubmission()
            // 7. Commit transaction and return success response
            // 8. Handle all error cases (already submitted, database errors, validation errors)
            
            return res.status(StatusCodes.NOT_IMPLEMENTED).json({
                error: "NotImplemented", 
                message: "POST /submit endpoint not yet implemented"
            });
        } catch (error) {
            console.error("Error in POST /submit:", error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: "InternalServerError",
                message: "An unexpected error occurred while submitting the leaderboard"
            });
        }
    }
);

/**
 * GET /leaderboard/submissions
 * Get history of all leaderboard submissions (for audit purposes)
 * Authorization: ADMIN only
 */
leaderboardRouter.get(
    "/submissions",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        try {
            // TODO: Implement GET /submissions endpoint
            // 1. Query leaderboardSubmissions table for all records
            // 2. Join with authInfo to get submitter display names
            // 3. Return paginated list of submissions with metadata
            // 4. Consider adding query filters (date range, submitter, etc.)
            
            return res.status(StatusCodes.NOT_IMPLEMENTED).json({
                error: "NotImplemented",
                message: "GET /submissions endpoint not yet implemented"
            });
        } catch (error) {
            console.error("Error in GET /submissions:", error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: "InternalServerError",
                message: "An unexpected error occurred while fetching submission history"
            });
        }
    }
);

/**
 * GET /leaderboard/submissions/:day
 * Get details of a specific day's submission
 * Authorization: STAFF, ADMIN
 */
leaderboardRouter.get(
    "/submissions/:day",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        try {
            // TODO: Implement GET /submissions/:day endpoint
            // 1. Validate day parameter format
            // 2. Query leaderboardSubmissions table for the specific day
            // 3. Return submission details or 404 if not found
            // 4. Include metadata like who submitted, when, how many winners
            
            return res.status(StatusCodes.NOT_IMPLEMENTED).json({
                error: "NotImplemented",
                message: "GET /submissions/:day endpoint not yet implemented"
            });
        } catch (error) {
            console.error("Error in GET /submissions/:day:", error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: "InternalServerError",
                message: "An unexpected error occurred while fetching submission details"
            });
        }
    }
);

export default leaderboardRouter;
