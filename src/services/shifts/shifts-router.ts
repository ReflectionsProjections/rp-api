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

// Get a list of all staff assigned to a specific shift
// URL params: shiftId
shiftsRouter.get(
    "/:shiftId/assignments",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const { shiftId } = ShiftIdValidator.parse(req.params);

        const { data: roster } = await SupabaseDB.SHIFT_ASSIGNMENTS.select(
            "*, staff(name, email)"
        ) // Fetches assignment and staff details
            .eq("shiftId", shiftId)
            .throwOnError();

        return res.status(StatusCodes.OK).json(roster);
    }
);

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
