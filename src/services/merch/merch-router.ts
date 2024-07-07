import { Router } from "express";
import { StatusCodes } from "http-status-codes";
// import { publicMerchValidator, privateMerchValidator } from "./merch-schema";
import { privateMerchValidator } from "./merch-schema";
import { Database } from "../../database";
// import RoleChecker from "../../middleware/role-checker";
// import { Role } from "../auth/auth-models";
// import { isAdmin, isStaff } from "../auth/auth-utils";

const merchRouter = Router();

//add merch item
merchRouter.post(
    "/",
    // RoleChecker([Role.Enum.ADMIN]),
    async (req, res, next) => {
        try {
            const validatedData = privateMerchValidator.parse(req.body);
            const merchItem = new Database.MERCH(validatedData);
            await merchItem.save();
            return res.sendStatus(StatusCodes.CREATED);
        } catch (error) {
            next(error);
        }
    }
);

async function redeem(userId: string, merchId: string) {
    const [attendee, merch] = await Promise.all([
        Database.ATTENDEE.findOne({ userId }),
        Database.MERCH.findOne({ merchId }),
    ]);

    if (!attendee || !merch) {
        throw new Error("User or Merch not found");
    }

    if (merch.points > attendee.points) {
        throw new Error("Too few points");
    }

    attendee.points -= merch.points;
    merch.ammount_left -= 1;
    await attendee.save();
}

merchRouter.post(
    "/redeem",
    // RoleChecker([Role.Enum.USER]),
    async (req, res, next) => {
        const { userId, merchId } = req.body;
        try {
            await redeem(userId, merchId);
            return res.sendStatus(StatusCodes.OK);
        } catch (error) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ error: "fail sadge" });
        }
    }
);

export default merchRouter;
