import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { StaffValidator } from "./staff-schema";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";

const staffRouter = Router();

// GET /staff
staffRouter.get(
    "/",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res, next) => {
        try {
            const staffRecords = await Database.STAFF.find({});
            return res.status(StatusCodes.OK).json(staffRecords);
        } catch (error) {
            next(error);
        }
    }
);

// GET /staff/:id
staffRouter.get(
    "/:USERID",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res, next) => {
        try {
            const userId = req.params.USERID;

            // check if the user exists in the database
            const user = await Database.STAFF.findOne({ userId });

            if (!user) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "UserNotFound" });
            }

            return res.status(StatusCodes.OK).json(user);
        } catch (error) {
            next(error);
        }
    }
);

// POST /staff
staffRouter.post(
    "/",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res, next) => {
        try {
            // validate input using StaffValidator
            const staffData = StaffValidator.parse(req.body);
            const staff = new Database.STAFF(staffData);
            const savedStaff = await staff.save();

            return res.status(StatusCodes.CREATED).json(savedStaff);
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /staff/:id
staffRouter.delete(
    "/:USERID",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res, next) => {
        try {
            const userId = req.params.USERID;
            // delete staff member
            const deletedStaff = await Database.STAFF.findOneAndDelete({
                userId: userId,
            });
            if (!deletedStaff) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "UserNotFound" });
            }
            return res.sendStatus(StatusCodes.NO_CONTENT);
        } catch (error) {
            next(error);
        }
    }
);

export default staffRouter;
