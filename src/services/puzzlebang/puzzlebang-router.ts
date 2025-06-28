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
        const { userId, puzzleId } = PuzzlebangCompleteRequestValidator.parse(req.body);
        
        const { data: attendeeData, error } = await SupabaseDB.ATTENDEES
            .select("puzzles_completed, points")
            .eq("user_id", userId)
            .single();

        if (error || !attendeeData) {
            return res.sendStatus(StatusCodes.NOT_FOUND);
        }

        const puzzlesCompleted = attendeeData.puzzles_completed ?? [];

        const currentPoints = attendeeData.points ?? 0;

        if (puzzlesCompleted.includes(puzzleId)) {
            return res.sendStatus(StatusCodes.CONFLICT).send("Puzzle already completed.");
        }

     const updatedPuzzles = [...puzzlesCompleted, puzzleId];

     const { error: updateError } = await SupabaseDB.ATTENDEES.update({
        puzzles_completed: updatedPuzzles,
        points: currentPoints + 2,
    })
    .eq("user_id", userId);

    if (updateError) {
        console.error("Database update failed:", updateError); 
        return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    }
        
        return res.sendStatus(StatusCodes.OK);
    }
);

export default puzzlebangRouter;
