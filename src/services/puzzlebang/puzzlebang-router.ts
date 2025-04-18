import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { PuzzlebangCompleteRequestValidator } from "./puzzlebang-validators";

const puzzlebangRouter = Router();

puzzlebangRouter.post(
    "/",
    RoleChecker([Role.Enum.PUZZLEBANG]),
    async (req, res) => {
        const requestInfo = PuzzlebangCompleteRequestValidator.parse(req.body);

        const attendeeData = await Database.ATTENDEE.findOneAndUpdate(
            { email: requestInfo.email },
            {
                $addToSet: { puzzlesCompleted: requestInfo.puzzleId },
                $inc: { points: 2 },
            },
            { new: false }
        );

        if (!attendeeData) {
            return res.sendStatus(StatusCodes.NOT_FOUND);
        }

        if (attendeeData.puzzlesCompleted.includes(requestInfo.puzzleId)) {
            return res.sendStatus(StatusCodes.UNAUTHORIZED);
        }

        return res.sendStatus(StatusCodes.OK);
    }
);

export default puzzlebangRouter;
