import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { JwtPayloadType, Role } from "../auth/auth-models";

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
    const shiftData = req.body;

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
        const { shiftId } = req.params;
        const shiftData = req.body;

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
        const { shiftId } = req.params;

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
        const { shiftId } = req.params;
        const { staffEmail } = req.body;

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
        const { shiftId } = req.params;
        const { staffEmail } = req.body;

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
        const { shiftId } = req.params;

        const { data: roster } = await SupabaseDB.SHIFT_ASSIGNMENTS.select(
            "*, staff(name, email)"
        ) // Fetches assignment and staff details
            .eq("shiftId", shiftId)
            .throwOnError();

        return res.status(StatusCodes.OK).json(roster);
    }
);

export default shiftsRouter;
