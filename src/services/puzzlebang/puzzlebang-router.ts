import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { PuzzlebangCompleteRequestValidator } from "./puzzlebang-validators";
import { addPoints } from "../attendee/attendee-utils";

const puzzlebangRouter = Router();

puzzlebangRouter.post(
    "/",
    RoleChecker([Role.Enum.PUZZLEBANG]),
    async (req, res) => {
        const { email, puzzleId } = PuzzlebangCompleteRequestValidator.parse(
            req.body
        );

        // Email is in registration, so we need to get the userId from the email and pull from attendee
        const { data: registrationData } =
            await SupabaseDB.REGISTRATIONS.select("userId")
                .eq("email", email)
                .maybeSingle()
                .throwOnError(); // allow 0 rows, which will be gracefully handled

        if (!registrationData) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Registration not found.",
            });
        }

        const userId = registrationData.userId;

        const { data: attendeeData } = await SupabaseDB.ATTENDEES.select(
            "puzzlesCompleted"
        )
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError(); // allow 0 rows, which will be gracefully handled

        if (!attendeeData) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .send("Attendee profile not found for this user.");
        }

        const puzzlesCompleted = attendeeData.puzzlesCompleted ?? [];

        if (puzzlesCompleted.includes(puzzleId)) {
            return res
                .status(StatusCodes.CONFLICT)
                .send("Puzzle already completed.");
        }

        const updatedPuzzles = [...puzzlesCompleted, puzzleId];

        // Update puzzles completed and add points (2 points per puzzle)
        await Promise.all([
            SupabaseDB.ATTENDEES.update({
                puzzlesCompleted: updatedPuzzles,
            })
                .eq("userId", userId)
                .throwOnError(),
            addPoints(userId, 2),
        ]);

        return res.sendStatus(StatusCodes.OK);
    }
);

export default puzzlebangRouter;
