import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    CheckInValidator,
    StaffAttendanceTypeEnum,
    StaffValidator,
    UpdateStaffAttendanceValidator,
} from "./staff-schema";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { JwtPayloadType, Role } from "../auth/auth-models";
import Config from "../../config";

const staffRouter = Router();

// Check in to a meeting
staffRouter.post(
    "/check-in",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const { userId } = res.locals.payload as JwtPayloadType;
        const { meetingId } = CheckInValidator.parse(req.body);

        const meeting = await Database.MEETINGS.findOne({ meetingId });
        if (!meeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .send({ error: "NotFound", message: "Meeting not found" });
        }

        const staff = await Database.STAFF.findOne({ userId });
        if (!staff) {
            throw new Error(`Could not find staff for ${userId}`);
        }

        // Haven't already checked in
        if (
            staff.attendances.get(meetingId) == StaffAttendanceTypeEnum.PRESENT
        ) {
            return res.status(StatusCodes.BAD_REQUEST).send({
                error: "AlreadyCheckedIn",
                message: "You're already checked into this meeting!",
            });
        }

        // Must be within a certain range of meeting time
        const diffSeconds =
            Math.abs(Date.now() - meeting.startTime.getTime()) / 1000;
        if (diffSeconds >= Config.STAFF_MEETING_CHECK_IN_WINDOW_SECONDS) {
            return res.status(StatusCodes.BAD_REQUEST).send({
                error: "Expired",
                message:
                    "That meeting has already passed - you can no longer check into it",
            });
        }

        // Otherwise, we're good!
        staff.attendances.set(meetingId, StaffAttendanceTypeEnum.PRESENT);
        await staff.save();

        const updatedStaff = await StaffValidator.parse(staff);
        return res.status(StatusCodes.OK).send(updatedStaff);
    }
);

// Update a staff's attendance
staffRouter.post(
    "/:USERID/attendance",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const userId = req.params.USERID;
        const { meetingId, attendanceType } =
            UpdateStaffAttendanceValidator.parse(req.body);

        const meeting = await Database.MEETINGS.findOne({ meetingId });
        if (!meeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .send({ error: "NotFound", message: "Meeting not found" });
        }

        const staff = await Database.STAFF.findOne({ userId });
        if (!staff) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .send({ error: "NotFound", message: "Staff not found" });
        }

        staff.attendances.set(meetingId, attendanceType);
        await staff.save();

        const updatedStaff = await StaffValidator.parse(staff);
        return res.status(StatusCodes.OK).send(updatedStaff);
    }
);

// Get all staff
staffRouter.get(
    "/",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const staffRecords = await Database.STAFF.find({});
        return res.status(StatusCodes.OK).json(staffRecords);
    }
);

// Get staff member by ID
staffRouter.get(
    "/:USERID",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const userId = req.params.USERID;

        // check if the user exists in the database
        const user = await Database.STAFF.findOne({ userId });

        if (!user) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        return res.status(StatusCodes.OK).json(user);
    }
);

// Create new staff member
staffRouter.post("/", RoleChecker([Role.Enum.ADMIN]), async (req, res) => {
    // validate input using StaffValidator
    const staffData = StaffValidator.parse(req.body);
    const staff = new Database.STAFF(staffData);
    const savedStaff = await staff.save();

    return res.status(StatusCodes.CREATED).json(savedStaff);
});

// Delete staff member by ID
staffRouter.delete(
    "/:USERID",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
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
    }
);

export default staffRouter;
