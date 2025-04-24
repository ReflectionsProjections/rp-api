import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    CheckInValidator,
    StaffAttendanceTypeEnum,
    StaffValidator,
    UpdateStaffAttendanceValidator,
    AttendancesMap,
} from "./staff-schema";
// import { Database } from "../../database";
import { SupabaseDB } from "../../supabase"
import RoleChecker from "../../middleware/role-checker";
import { JwtPayloadType, Role } from "../auth/auth-models";
import Config from "../../config";

const staffRouter = Router();

// Check in to a meeting
staffRouter.post(
    "/check-in",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res, next) => {
        // TODO: TEST THIS WITH VALID JWT
        const { email } = res.locals.payload as JwtPayloadType;
        const { meetingId } = CheckInValidator.parse(req.body);

        // const meeting = await Database.MEETINGS.findOne({ meetingId });
        // if (!meeting) {
        //     return res
        //         .status(StatusCodes.NOT_FOUND)
        //         .send({ error: "NotFound", message: "Meeting not found" });
        // }
        const { data: meeting, error } = await SupabaseDB
                    .MEETINGS
                    .select('*')
                    .eq('meeting_id', meetingId)
                    .single();

        if (error || !meeting) {
            return res.status(StatusCodes.NOT_FOUND).send({
                error: "NotFound",
                message: "Meeting not found"
            });
        }

        const { data: staff, error: staffError } =
                await SupabaseDB.STAFF.select("*").eq("email", email).single();

        // const staff = await Database.STAFF.findOne({ userId });
        if (!staff || staffError) {
            throw new Error(`Could not find staff for ${email}`);
        }

        // Haven't already checked in
        if (
            // staff.attendances.get(meetingId) == StaffAttendanceTypeEnum.PRESENT
            (staff.attendances as AttendancesMap)[meetingId] ===
            StaffAttendanceTypeEnum.PRESENT
        ) {
            return res.status(StatusCodes.BAD_REQUEST).send({
                error: "AlreadyCheckedIn",
                message: "You're already checked into this meeting!",
            });
        }

        // Must be within a certain range of meeting time
        const diffSeconds = Math.abs(Date.now() - new Date(meeting.start_time).getTime()) / 1000;
        if (diffSeconds >= Config.STAFF_MEETING_CHECK_IN_WINDOW_SECONDS) {
            return res.status(StatusCodes.BAD_REQUEST).send({
                error: "Expired",
                message:
                    "That meeting has already passed - you can no longer check into it",
            });
        }

        // Otherwise, we're good!
        const { data: updateStaff, error: updateError } =
            await SupabaseDB.STAFF
                .update({ attendances: {
                    ...(staff.attendances as AttendancesMap),
                    [meetingId]: StaffAttendanceTypeEnum.PRESENT,
                } })
                .eq("email", email)
                .select()
                .single();
        // staff.attendances.set(meetingId, StaffAttendanceTypeEnum.PRESENT);
        // await staff.save();


        if (updateError || !updateStaff) {
            return next(updateError);
        }

        const updatedStaff = await StaffValidator.parse(updateStaff);
        return res.status(StatusCodes.OK).send(updatedStaff);
    }
);

// Update a staff's attendance
staffRouter.post(
    "/:EMAIL/attendance",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res, next) => {
        const userEmail = req.params.EMAIL;
        const { meetingId, attendanceType } =
            UpdateStaffAttendanceValidator.parse(req.body);

        // const meeting = await Database.MEETINGS.findOne({ meetingId });
        // if (!meeting) {
        //     return res
        //         .status(StatusCodes.NOT_FOUND)
        //         .send({ error: "NotFound", message: "Meeting not found" });
        // }

        const { data: meeting, error } = await SupabaseDB
                    .MEETINGS
                    .select('*')
                    .eq('meeting_id', meetingId)
                    .single();

        if (error || !meeting) {
            return res.status(StatusCodes.NOT_FOUND).send({
                error: "NotFound",
                message: "Meeting not found"
            });
        }

        const { data: staff, error: staffError } =
                await SupabaseDB
                    .STAFF
                    .select("attendances")
                    .eq("email", userEmail)
                    .single();


        if (!staff || staffError) {
            return res
            .status(StatusCodes.NOT_FOUND)
            .send({ error: "NotFound", message: "Staff not found" });
        }


        const updatedAttendances = {
            ...(staff.attendances as AttendancesMap),
            [meetingId]: attendanceType,
        }


        const { data: updateStaff, error: updateError } =
            await SupabaseDB.STAFF
                .update({ attendances: updatedAttendances })
                .eq("email", userEmail)
                .select()
                .single();


        if (updateError || !updateStaff) {
            return next(updateError)
        }


        // if (!staff) {
        //     return res
        //         .status(StatusCodes.NOT_FOUND)
        //         .send({ error: "NotFound", message: "Staff not found" });
        // }

        // staff.attendances.set(meetingId, attendanceType);
        // await staff.save();

        const updatedStaff = await StaffValidator.parse(updateStaff);
        return res.status(StatusCodes.OK).send(updatedStaff);
    }
);

// Get all staff
staffRouter.get(
    "/",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        // const staffRecords = await Database.STAFF.find({});
        const { data: staffRecords, error } = await SupabaseDB.STAFF.select('*')
        if (error) {
            return res
                .status(StatusCodes.INTERNAL_SERVER_ERROR)
                .json({ error: "DatabaseError", message: error.message });
        }
        return res.status(StatusCodes.OK).json(staffRecords);
    }
);

// Get staff member by ID
staffRouter.get(
    "/:EMAIL",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const userEmail = req.params.EMAIL;

        const { data: staffData, error: staffError } =
                await SupabaseDB.STAFF.select("*").eq("email", userEmail).single();

        if (staffError) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }
        const user = StaffValidator.parse(staffData);

        // check if the user exists in the database
        // const user = await Database.STAFF.findOne({ userId });

        // if (!user) {
        //     return res
        //         .status(StatusCodes.NOT_FOUND)
        //         .json({ error: "UserNotFound" });
        // }

        return res.status(StatusCodes.OK).json(user);
    }
);

// Create new staff member
staffRouter.post("/", RoleChecker([Role.Enum.ADMIN]), async (req, res) => {
    // validate input using StaffValidator
    const staffData = StaffValidator.parse(req.body);
    const { data: savedStaff, error: staffError } =
        await SupabaseDB.STAFF.insert([staffData]).select("*").single();
    if (staffError) throw staffError;

    // const staff = new Database.STAFF(staffData);
    // const savedStaff = await staff.save();

    return res.status(StatusCodes.CREATED).json(savedStaff);
});

// Delete staff member by ID
staffRouter.delete(
    "/:EMAIL",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const email = req.params.EMAIL;
        // delete staff member
        // const deletedStaff = await Database.STAFF.findOneAndDelete({
        //     userId: userId,
        // });
        const { data: deletedStaff, error: staffError } =
            await SupabaseDB.STAFF.delete().eq("email", email).select().single();

        if (staffError || !deletedStaff) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }
        return res.sendStatus(StatusCodes.NO_CONTENT);
    }
);

export default staffRouter;
