import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    ScanValidator,
    MerchScanValidator,
    EventValidator,
} from "./checkin-schema";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { validateQrHash, checkInUserToEvent } from "./checkin-utils";
import { SupabaseDB } from "../../supabase";

const checkinRouter = Router();

checkinRouter.post(
    "/scan/staff",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const { event_id, qrCode } = ScanValidator.parse(req.body);

        const { user_id, expTime } = validateQrHash(qrCode);

        if (Date.now() / 1000 > expTime) {
            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json({ error: "QR code has expired" });
        }

        try {
            await checkInUserToEvent(event_id, user_id);
        } catch (error: unknown) {
            console.error("Check-in failed:", error);
            if (error instanceof Error && error.message == "IsDuplicate") {
                return res
                    .status(StatusCodes.FORBIDDEN)
                    .json({ error: "IsDuplicate" });
            }
            return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
        }

        return res.status(StatusCodes.OK).json(user_id);
    }
);

checkinRouter.post(
    "/event",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const { event_id, user_id } = EventValidator.parse(req.body);

        try {
            await checkInUserToEvent(event_id, user_id);
        } catch (error: unknown) {
            if (error instanceof Error && error.message == "IsDuplicate") {
                return res
                    .status(StatusCodes.FORBIDDEN)
                    .json({ error: "IsDuplicate" });
            }
            return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
        }
        return res.status(StatusCodes.OK).json(user_id);
    }
);

checkinRouter.post(
    "/scan/merch",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const { qrCode } = MerchScanValidator.parse(req.body);

        const { user_id, expTime } = validateQrHash(qrCode);

        if (Date.now() / 1000 > expTime) {
            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json({ error: "QR code has expired" });
        }

        return res.status(StatusCodes.OK).json(user_id);
    }
);

checkinRouter.post(
    "/",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const { qrCode } = ScanValidator.parse(req.body);

        const { user_id, expTime } = validateQrHash(qrCode);

        if (Date.now() / 1000 > expTime) {
            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json({ error: "QR code has expired" });
        }

        const user = await SupabaseDB.ATTENDEES.select()
            .eq("user_id", user_id)
            .maybeSingle()
            .throwOnError();

        const attendee = user.data;
        if (!attendee) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }
        if (attendee.has_checked_in) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ error: "AlreadyCheckedIn" });
        }

        await SupabaseDB.ATTENDEES.update({
            has_checked_in: true,
        })
            .eq("user_id", user_id)
            .select()
            .single()
            .throwOnError();

        return res.status(StatusCodes.OK).json(user_id);
    }
);

export default checkinRouter;
