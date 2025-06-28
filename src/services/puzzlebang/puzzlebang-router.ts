import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../supabase";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { PuzzlebangCompleteRequestValidator } from "./puzzlebang-validators";

const puzzlebangRouter = Router();

puzzlebangRouter.post(
    "/",
    RoleChecker([Role.Enum.PUZZLEBANG]),
    async (req, res) => {
        const { email, puzzleId } = PuzzlebangCompleteRequestValidator.parse(
            req.body
        );

        // Email is in registration, so we need to get the userId from the email and pull from attendee
        const { data: registrationData, error: registrationError } =
            await SupabaseDB.REGISTRATIONS.select("user_id")
                .eq("email", email)
                .maybeSingle(); // allow 0 rows, which will be gracefully handled

        if (registrationError) {
            console.error(
                "Database error fetching registration:",
                registrationError
            );
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message:
                    "An unexpected error occurred while fetching registration data.",
            });
        }

        if (!registrationData) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Registration not found.",
            });
        }

        const userId = registrationData.user_id;

        const { data: attendeeData, error: attendeeError } =
            await SupabaseDB.ATTENDEES.select("puzzles_completed, points")
                .eq("user_id", userId)
                .maybeSingle(); // allow 0 rows, which will be gracefully handled

        if (attendeeError) {
            console.error("Database error fetching attendee:", attendeeError);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message:
                    "An unexpected error occurred while fetching attendee data.",
            });
        }

        if (!attendeeData) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .send("Attendee profile not found for this user.");
        }

        const puzzlesCompleted = attendeeData.puzzles_completed ?? [];

        const currentPoints = attendeeData.points ?? 0;

        if (puzzlesCompleted.includes(puzzleId)) {
            return res
                .status(StatusCodes.CONFLICT)
                .send("Puzzle already completed.");
        }

        const updatedPuzzles = [...puzzlesCompleted, puzzleId];

        const { error: updateError } = await SupabaseDB.ATTENDEES.update({
            puzzles_completed: updatedPuzzles,
            points: currentPoints + 2,
        }).eq("user_id", userId);

        if (updateError) {
            console.error("Database update failed:", updateError);
            return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
        }

        return res.sendStatus(StatusCodes.OK);
    }
);

export default puzzlebangRouter;
