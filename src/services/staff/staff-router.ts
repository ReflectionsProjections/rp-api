import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    CheckInValidator,
    StaffAttendanceTypeEnum,
    StaffValidator,
    UpdateStaffAttendanceValidator,
    AttendancesMap,
} from "./staff-schema";
import { SupabaseDB } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { JwtPayloadType, Role } from "../auth/auth-models";
import Config from "../../config";

const staffRouter = Router();

/**
 * @swagger
 * /staff/check-in:
 *   post:
 *     summary: Check a staff member into a meeting
 *     description: |
 *       Records the authenticated staff member as PRESENT for the given meeting.
 *       Fails if the meeting window has passed or they are already checked in.
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Staff]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckInValidator'
 *     responses:
 *       200:
 *         description: Updated staff record reflecting the check-in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffView'
 *       400:
 *         description: Already checked in or meeting window has expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "AlreadyCheckedIn"
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "NotFound"
 *     security:
 *       - bearerAuth: []
 */
// Check in to a meeting
staffRouter.post(
    "/check-in",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        // TODO: TEST THIS WITH VALID JWT
        const { email } = res.locals.payload as JwtPayloadType;
        const { meetingId } = CheckInValidator.parse(req.body);

        const { data: meeting } = await SupabaseDB.MEETINGS.select("*")
            .eq("meetingId", meetingId)
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
            Math.abs(Date.now() - new Date(meeting.startTime).getTime()) / 1000;
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

/**
 * @swagger
 * /staff/{EMAIL}/attendance:
 *   post:
 *     summary: Manually update a staff member's meeting attendance
 *     description: |
 *       Sets the attendance status for a specific staff member and meeting.
 *
 *       **Required roles: ADMIN**
 *     tags: [Staff]
 *     parameters:
 *       - name: EMAIL
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStaffAttendanceValidator'
 *     responses:
 *       200:
 *         description: Updated staff record with new attendance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffView'
 *       404:
 *         description: Meeting or staff member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "NotFound"
 *     security:
 *       - bearerAuth: []
 */
// Update a staff's attendance
staffRouter.post(
    "/:EMAIL/attendance",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const userEmail = req.params.EMAIL;
        const { meetingId, attendanceType } =
            UpdateStaffAttendanceValidator.parse(req.body);

        const { data: meeting } = await SupabaseDB.MEETINGS.select("*")
            .eq("meetingId", meetingId)
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

/**
 * @swagger
 * /staff/:
 *   get:
 *     summary: Get all staff members
 *     description: |
 *       Returns all staff records.
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Staff]
 *     responses:
 *       200:
 *         description: List of all staff members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StaffView'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /staff/{EMAIL}:
 *   get:
 *     summary: Get a staff member by email
 *     description: |
 *       Returns a single staff record identified by email address.
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Staff]
 *     parameters:
 *       - name: EMAIL
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       200:
 *         description: The requested staff member
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffView'
 *       404:
 *         description: Staff member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /staff/:
 *   post:
 *     summary: Create a staff member
 *     description: |
 *       Creates a new staff record. Fails if a staff member with the same email
 *       already exists.
 *
 *       **Required roles: ADMIN**
 *     tags: [Staff]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StaffView'
 *     responses:
 *       201:
 *         description: The newly created staff record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffView'
 *       400:
 *         description: Validation error or staff member already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserAlreadyExists"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /staff/{EMAIL}:
 *   delete:
 *     summary: Delete a staff member
 *     description: |
 *       Deletes the staff record for the given email address.
 *
 *       **Required roles: ADMIN**
 *     tags: [Staff]
 *     parameters:
 *       - name: EMAIL
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       204:
 *         description: Staff member successfully deleted
 *       404:
 *         description: Staff member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
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
