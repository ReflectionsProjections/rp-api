import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { PuzzlebangCompleteRequestValidator } from "./puzzlebang-validators";

const puzzlebangRouter = Router();

// Favorite an event for an attendee
puzzlebangRouter.get(
    "/:EMAIL",
    RoleChecker([Role.Enum.PUZZLEBANG]),
    async (req, res, next) => {
        const email = req.params.EMAIL;
        console.log("email:", email);

        const userId = await Database.ATTENDEE.findOne({
            emailAddress: email,
        }).select("userId");

        if (userId) {
            return res.status(StatusCodes.OK).json({ userId });
        } else {
            return res.sendStatus(StatusCodes.NOT_FOUND);
        }
    }
);

puzzlebangRouter.post(
    "/complete",
    RoleChecker([Role.Enum.PUZZLEBANG]),
    async (req, res, next) => {
        try {
            const requestInfo = PuzzlebangCompleteRequestValidator.parse(req.body);
            console.log(requestInfo);
            
            
        } catch (error) {
            console.error(error);
        }
        
    }
);

export default puzzlebangRouter;
