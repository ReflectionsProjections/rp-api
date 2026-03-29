import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { JwtPayloadType, Role } from "../auth/auth-models";
import {
    ShiftCreateValidator,
    ShiftUpdateValidator,
    ShiftIdValidator,
    StaffEmailValidator,
} from "./shifts-validators";

const shiftsRouter = Router();

/**
 * @swagger
 * /shifts/:
 *   get:
 *     summary: Get all shifts
 *     description: |
 *       Returns all defined shifts, ordered by start time.
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Shifts]
 *     responses:
 *       200:
 *         description: List of all shifts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShiftView'
 *     security:
 *       - bearerAuth: []
 */
// Get a list of all defined shifts
shiftsRouter.get(
    "/",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const { data: shifts } = await SupabaseDB.SHIFTS.select()
            .order("startTime", { ascending: true })
            .throwOnError();

        return res.status(StatusCodes.OK).json(shifts);
    }
);

/**
 * @swagger
 * /shifts/my-shifts:
 *   get:
 *     summary: Get shifts assigned to the current staff member
 *     description: |
 *       Returns all shift assignments for the authenticated staff member,
 *       including the full shift details for each assignment.
 *
 *       **Required roles: STAFF**
 *     tags: [Shifts]
 *     responses:
 *       200:
 *         description: List of the caller's shift assignments with embedded shift details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShiftAssignmentView'
 *     security:
 *       - bearerAuth: []
 */
// Get all shifts for the logged-in staff member
shiftsRouter.get(
    "/my-shifts",
    RoleChecker([Role.Enum.STAFF]),
    async (req, res) => {
        const { email } = res.locals.payload as JwtPayloadType;

        const { data: myShifts } = await SupabaseDB.SHIFT_ASSIGNMENTS.select(
            "*, shifts(*)"
        ) // Fetches the assignment AND the full shift details
            .eq("staffEmail", email)
            .throwOnError();

        return res.status(StatusCodes.OK).json(myShifts);
    }
);

/**
 * @swagger
 * /shifts/:
 *   post:
 *     summary: Create a shift
 *     description: |
 *       Creates a new staff shift.
 *
 *       **Required roles: ADMIN**
 *     tags: [Shifts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftCreateValidator'
 *     responses:
 *       201:
 *         description: The newly created shift
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftView'
 *     security:
 *       - bearerAuth: []
 */
// Create a new shift
// API body: {String} role, {String} startTime {String} endTime, {String} location
shiftsRouter.post("/", RoleChecker([Role.Enum.ADMIN]), async (req, res) => {
    const shiftData = ShiftCreateValidator.parse(req.body);

    const { data: newShift } = await SupabaseDB.SHIFTS.insert(shiftData)
        .select()
        .single()
        .throwOnError();

    return res.status(StatusCodes.CREATED).json(newShift);
});

/**
 * @swagger
 * /shifts/{shiftId}:
 *   patch:
 *     summary: Update a shift
 *     description: |
 *       Updates one or more fields of an existing shift.
 *
 *       **Required roles: ADMIN**
 *     tags: [Shifts]
 *     parameters:
 *       - name: shiftId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftUpdateValidator'
 *     responses:
 *       200:
 *         description: The updated shift
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftView'
 *     security:
 *       - bearerAuth: []
 */
// Update a shift's details
// URL params: shiftId
// API body: { role?, startTime?, endTime?, location? }
shiftsRouter.patch(
    "/:shiftId",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { shiftId } = ShiftIdValidator.parse(req.params);
        const shiftData = ShiftUpdateValidator.parse(req.body);

        const { data: updatedShift } = await SupabaseDB.SHIFTS.update(shiftData)
            .eq("shiftId", shiftId)
            .select()
            .single()
            .throwOnError();

        return res.status(StatusCodes.OK).json(updatedShift);
    }
);

/**
 * @swagger
 * /shifts/{shiftId}:
 *   delete:
 *     summary: Delete a shift
 *     description: |
 *       Deletes a shift and all its assignments (due to foreign key constraint,
 *       assignments are removed first).
 *
 *       **Required roles: ADMIN**
 *     tags: [Shifts]
 *     parameters:
 *       - name: shiftId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Shift successfully deleted
 *     security:
 *       - bearerAuth: []
 */
// Delete a shift
// URL params: shiftId
shiftsRouter.delete(
    "/:shiftId",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { shiftId } = ShiftIdValidator.parse(req.params);

        // Must delete assignments first due to foreign key constraint
        await SupabaseDB.SHIFT_ASSIGNMENTS.delete()
            .eq("shiftId", shiftId)
            .throwOnError();

        await SupabaseDB.SHIFTS.delete().eq("shiftId", shiftId).throwOnError();

        return res.sendStatus(StatusCodes.NO_CONTENT);
    }
);

/**
 * @swagger
 * /shifts/{shiftId}/assignments:
 *   post:
 *     summary: Assign a staff member to a shift
 *     description: |
 *       Creates an assignment linking a staff member (by email) to the given shift.
 *
 *       **Required roles: ADMIN**
 *     tags: [Shifts]
 *     parameters:
 *       - name: shiftId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StaffEmailValidator'
 *     responses:
 *       201:
 *         description: The newly created assignment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftAssignmentView'
 *     security:
 *       - bearerAuth: []
 */
// Assign a staff member to a shift
// URL params: shiftId
// API body: { staffEmail }
shiftsRouter.post(
    "/:shiftId/assignments",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { shiftId } = ShiftIdValidator.parse(req.params);
        const { staffEmail } = StaffEmailValidator.parse(req.body);

        const { data: newAssignment } =
            await SupabaseDB.SHIFT_ASSIGNMENTS.insert({
                shiftId: shiftId,
                staffEmail: staffEmail,
            })
                .select()
                .single()
                .throwOnError();

        return res.status(StatusCodes.CREATED).json(newAssignment);
    }
);

/**
 * @swagger
 * /shifts/{shiftId}/assignments:
 *   delete:
 *     summary: Remove a staff member from a shift
 *     description: |
 *       Deletes the assignment for the specified staff member and shift.
 *
 *       **Required roles: ADMIN**
 *     tags: [Shifts]
 *     parameters:
 *       - name: shiftId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StaffEmailValidator'
 *     responses:
 *       204:
 *         description: Assignment successfully removed
 *     security:
 *       - bearerAuth: []
 */
// Remove a staff member from a shift
// URL params: shiftId
// API body: { staffEmail }
shiftsRouter.delete(
    "/:shiftId/assignments",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { shiftId } = ShiftIdValidator.parse(req.params);
        const { staffEmail } = StaffEmailValidator.parse(req.body);

        await SupabaseDB.SHIFT_ASSIGNMENTS.delete()
            .match({
                shiftId: shiftId,
                staffEmail: staffEmail,
            })
            .throwOnError();

        return res.sendStatus(StatusCodes.NO_CONTENT);
    }
);

/**
 * @swagger
 * /shifts/assignments:
 *   get:
 *     summary: Get all shift assignments with staff details
 *     description: |
 *       Returns all shift assignments, each including the assigned staff
 *       member's name and email.
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Shifts]
 *     responses:
 *       200:
 *         description: List of all shift assignments with embedded staff details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShiftAssignmentView'
 *     security:
 *       - bearerAuth: []
 */
// Get a list of all shifts and the staff assigned to them
shiftsRouter.get(
    "/assignments",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const { data: roster } = await SupabaseDB.SHIFT_ASSIGNMENTS.select(
            "*, staff(name, email)"
        ) // Fetches assignment and staff details
            .throwOnError();

        return res.status(StatusCodes.OK).json(roster);
    }
);

/**
 * @swagger
 * /shifts/{shiftId}/acknowledge:
 *   post:
 *     summary: Toggle shift acknowledgment
 *     description: |
 *       Toggles the acknowledgment status of the caller's own assignment
 *       for the given shift.
 *
 *       **Required roles: STAFF**
 *     tags: [Shifts]
 *     parameters:
 *       - name: shiftId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: The updated assignment with new acknowledgment status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftAssignmentView'
 *       404:
 *         description: No assignment found for this staff member and shift
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "Shift assignment not found"
 *     security:
 *       - bearerAuth: []
 */
// Toggle shift assignment acknowledgment status
// URL params: shiftId
// Requires STAFF role - staff can only toggle their own shifts
shiftsRouter.post(
    "/:shiftId/acknowledge",
    RoleChecker([Role.Enum.STAFF]),
    async (req, res) => {
        const { shiftId } = ShiftIdValidator.parse(req.params);
        const { email } = res.locals.payload as JwtPayloadType;

        // First get the current assignment to check current acknowledgment status
        const { data: currentAssignment, error } =
            await SupabaseDB.SHIFT_ASSIGNMENTS.select()
                .match({
                    shiftId: shiftId,
                    staffEmail: email,
                })
                .maybeSingle();

        if (error || !currentAssignment) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: "Shift assignment not found",
            });
        }

        // Toggle the acknowledgment status
        const newAcknowledgedStatus = !currentAssignment.acknowledged;

        const { data: updatedAssignment } =
            await SupabaseDB.SHIFT_ASSIGNMENTS.update({
                acknowledged: newAcknowledgedStatus,
            })
                .match({
                    shiftId: shiftId,
                    staffEmail: email,
                })
                .select()
                .single()
                .throwOnError();

        return res.status(StatusCodes.OK).json(updatedAssignment);
    }
);

export default shiftsRouter;
