import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    CheckInValidator,
    StaffAttendanceTypeEnum,
    StaffValidator,
    UpdateStaffAttendanceValidator,
    AttendancesMap,
} from "./staff-schema";
import { SupabaseDB } from "../../supabase";
import RoleChecker from "../../middleware/role-checker";
import { JwtPayloadType, Role } from "../auth/auth-models";
import Config from "../../config";

const staffRouter = Router();

// Check in to a meeting
staffRouter.post(
    "/check-in",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        // TODO: TEST THIS WITH VALID JWT
        const { email } = res.locals.payload as JwtPayloadType;
        const { meetingId } = CheckInValidator.parse(req.body);

        const { data: meeting } = await SupabaseDB.MEETINGS.select("*")
            .eq("meeting_id", meetingId)
            .maybeSingle()
            .throwOnError();

        if (!meeting) {
            return res.status(StatusCodes.NOT_FOUND).send({
                error: "NotFound",
                message: "Meeting not found",
            });
        }

        const { data: staff } = await SupabaseDB.STAFF.select("*")
            .eq("email", email)
            .maybeSingle()
            .throwOnError();

        if (!staff) {
            throw new Error(`Could not find staff for ${email}`);
        }

        if (
            (staff.attendances as AttendancesMap)[meetingId] ===
            StaffAttendanceTypeEnum.PRESENT
        ) {
            return res.status(StatusCodes.BAD_REQUEST).send({
                error: "AlreadyCheckedIn",
                message: "You're already checked into this meeting!",
            });
        }

        // Must be within a certain range of meeting time
        const diffSeconds =
            Math.abs(Date.now() - new Date(meeting.start_time).getTime()) /
            1000;
        if (diffSeconds >= Config.STAFF_MEETING_CHECK_IN_WINDOW_SECONDS) {
            return res.status(StatusCodes.BAD_REQUEST).send({
                error: "Expired",
                message:
                    "That meeting has already passed - you can no longer check into it",
            });
        }

        const { data: updateStaff } = await SupabaseDB.STAFF.update({
            attendances: {
                ...(staff.attendances as AttendancesMap),
                [meetingId]: StaffAttendanceTypeEnum.PRESENT,
            },
        })
            .eq("email", email)
            .select()
            .maybeSingle()
            .throwOnError();

        if (!updateStaff) {
            return res.status(StatusCodes.NOT_FOUND).send({
                error: "NotFound",
                message: "Staff not found",
            });
        }

        const updatedStaff = await StaffValidator.parse(updateStaff);
        return res.status(StatusCodes.OK).send(updatedStaff);
    }
);

// Update a staff's attendance
staffRouter.post(
    "/:EMAIL/attendance",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const userEmail = req.params.EMAIL;
        const { meetingId, attendanceType } =
            UpdateStaffAttendanceValidator.parse(req.body);

        const { data: meeting } = await SupabaseDB.MEETINGS.select("*")
            .eq("meeting_id", meetingId)
            .maybeSingle()
            .throwOnError();

        if (!meeting) {
            return res.status(StatusCodes.NOT_FOUND).send({
                error: "NotFound",
                message: "Meeting not found",
            });
        }

        const { data: staff } = await SupabaseDB.STAFF.select("attendances")
            .eq("email", userEmail)
            .maybeSingle()
            .throwOnError();

        if (!staff) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .send({ error: "NotFound", message: "Staff not found" });
        }

        const updatedAttendances = {
            ...(staff.attendances as AttendancesMap),
            [meetingId]: attendanceType,
        };

        const { data: updateStaff } = await SupabaseDB.STAFF.update({
            attendances: updatedAttendances,
        })
            .eq("email", userEmail)
            .select()
            .maybeSingle()
            .throwOnError();

        if (!updateStaff) {
            return res.status(StatusCodes.NOT_FOUND).send({
                error: "NotFound",
                message: "Staff not found",
            });
        }

        const updatedStaff = await StaffValidator.parse(updateStaff);
        return res.status(StatusCodes.OK).send(updatedStaff);
    }
);

// Get all staff
staffRouter.get(
    "/",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const { data: staffRecords } =
            await SupabaseDB.STAFF.select("*").throwOnError();

        return res.status(StatusCodes.OK).json(staffRecords);
    }
);

// Get staff member by ID
staffRouter.get(
    "/:EMAIL",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const userEmail = req.params.EMAIL;

        const { data: staffData } = await SupabaseDB.STAFF.select("*")
            .eq("email", userEmail)
            .maybeSingle()
            .throwOnError();

        if (!staffData) {
            return res.status(StatusCodes.NOT_FOUND).send({
                error: "UserNotFound",
            });
        }

        const user = StaffValidator.parse(staffData);

        return res.status(StatusCodes.OK).json(user);
    }
);

// Create new staff member
staffRouter.post("/", RoleChecker([Role.Enum.ADMIN]), async (req, res) => {
    // validate input using StaffValidator
    const validationResult = StaffValidator.safeParse(req.body);

    if (!validationResult.success) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            error: "ValidationError",
            message: validationResult.error.errors
                .map((e) => e.message)
                .join(", "),
        });
    }

    const staffData = validationResult.data;
    // Check if staff member already exists
    const { data: existingStaff } = await SupabaseDB.STAFF.select("email")
        .eq("email", staffData.email)
        .maybeSingle()
        .throwOnError();

    if (existingStaff) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            error: "UserAlreadyExists",
            message: "Staff member with this email already exists",
        });
    }

    const { data: savedStaff } = await SupabaseDB.STAFF.insert([staffData])
        .select()
        .maybeSingle()
        .throwOnError();

    return res.status(StatusCodes.CREATED).json(savedStaff);
});

// Delete staff member by ID
staffRouter.delete(
    "/:EMAIL",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const email = req.params.EMAIL;
        const { data: deletedStaff } = await SupabaseDB.STAFF.delete()
            .eq("email", email)
            .select()
            .maybeSingle()
            .throwOnError();

        if (!deletedStaff) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }
        return res.sendStatus(StatusCodes.NO_CONTENT);
    }
);

export default staffRouter;
