import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import { PuzzlebangCompleteRequestValidator } from "./puzzlebang-validators";
import PuzzlebangChecker from "../../middleware/puzzlebang-checker";

const puzzlebangRouter = Router();

puzzlebangRouter.use(PuzzlebangChecker);

puzzlebangRouter.post("/", async (req, res) => {
    const { email, puzzleId } = PuzzlebangCompleteRequestValidator.parse(
        req.body
    );

    // Email is in registration, so we need to get the userId from the email and pull from attendee
    const { data: registrationData } = await SupabaseDB.REGISTRATIONS.select(
        "userId"
    )
        .eq("email", email)
        .maybeSingle()
        .throwOnError(); // allow 0 rows, which will be gracefully handled

    if (!registrationData) {
        return res.status(StatusCodes.NOT_FOUND).json({
            error: "NotFound",
        });
    }

    const userId = registrationData.userId;

    const { data: attendeeData } = await SupabaseDB.ATTENDEES.select(
        "puzzlesCompleted, points"
    )
        .eq("userId", userId)
        .maybeSingle()
        .throwOnError(); // allow 0 rows, which will be gracefully handled

    if (!attendeeData) {
        return res.status(StatusCodes.NOT_FOUND).json({
            error: "NotFound",
        });
    }

    const puzzlesCompleted = attendeeData.puzzlesCompleted ?? [];

    const currentPoints = attendeeData.points ?? 0;

    if (puzzlesCompleted.includes(puzzleId)) {
        return res.status(StatusCodes.CONFLICT).json({
            error: "AlreadyCompleted",
        });
    }

    const updatedPuzzles = [...puzzlesCompleted, puzzleId];

    const { data: updated } = await SupabaseDB.ATTENDEES.update({
        puzzlesCompleted: updatedPuzzles,
        points: currentPoints + 2,
    })
        .eq("userId", userId)
        .select("puzzlesCompleted")
        .single()
        .throwOnError();

    return res.status(StatusCodes.OK).json({
        email,
        puzzlesCompleted: updated.puzzlesCompleted,
    });
});

export default puzzlebangRouter;
