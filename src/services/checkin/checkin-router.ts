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

const checkinRouter = Router();

/**
 * @swagger
 * /checkin/scan/staff:
 *   post:
 *     summary: Check in an attendee via QR code
 *     description: |
 *       Validates a time-limited QR code and checks the attendee into the
 *       specified event. Rejects expired codes and duplicate check-ins.
 *
 *       **Required roles: ADMIN | STAFF**
 *     tags: [Checkin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScanValidator'
 *     responses:
 *       200:
 *         description: The checked-in user's ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckinUserIdResponse'
 *       401:
 *         description: QR code has expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "QR code has expired"
 *       403:
 *         description: Attendee already checked in to this event
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "IsDuplicate"
 *     security:
 *       - bearerAuth: []
 */
checkinRouter.post(
    "/scan/staff",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const { eventId, qrCode } = ScanValidator.parse(req.body);

        const { userId, expTime } = validateQrHash(qrCode);

        if (Date.now() / 1000 > expTime) {
            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json({ error: "QR code has expired" });
        }

        try {
            await checkInUserToEvent(eventId, userId);
        } catch (error: unknown) {
            console.error("Check-in failed:", error);
            if (error instanceof Error && error.message == "IsDuplicate") {
                return res
                    .status(StatusCodes.FORBIDDEN)
                    .json({ error: "IsDuplicate" });
            }
            return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
        }

        return res.status(StatusCodes.OK).json(userId);
    }
);

/**
 * @swagger
 * /checkin/event:
 *   post:
 *     summary: Manually check in an attendee by user ID
 *     description: |
 *       Checks an attendee into an event using their user ID directly,
 *       without requiring a QR code. Rejects duplicate check-ins.
 *
 *       **Required roles: ADMIN | STAFF**
 *     tags: [Checkin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventValidator'
 *     responses:
 *       200:
 *         description: The checked-in user's ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckinUserIdResponse'
 *       403:
 *         description: Attendee already checked in to this event
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "IsDuplicate"
 *     security:
 *       - bearerAuth: []
 */
checkinRouter.post(
    "/event",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const { eventId, userId } = EventValidator.parse(req.body);

        try {
            await checkInUserToEvent(eventId, userId);
        } catch (error: unknown) {
            if (error instanceof Error && error.message == "IsDuplicate") {
                return res
                    .status(StatusCodes.FORBIDDEN)
                    .json({ error: "IsDuplicate" });
            }
            return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
        }
        return res.status(StatusCodes.OK).json(userId);
    }
);

/**
 * @swagger
 * /checkin/scan/merch:
 *   post:
 *     summary: Validate a QR code for merchandise pickup
 *     description: |
 *       Validates a time-limited QR code and returns the attendee's user ID
 *       for use in merchandise redemption flows.
 *
 *       **Required roles: ADMIN | STAFF**
 *     tags: [Checkin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MerchScanValidator'
 *     responses:
 *       200:
 *         description: The attendee's user ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckinUserIdResponse'
 *       401:
 *         description: QR code has expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "QR code has expired"
 *     security:
 *       - bearerAuth: []
 */
checkinRouter.post(
    "/scan/merch",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const { qrCode } = MerchScanValidator.parse(req.body);

        const { userId, expTime } = validateQrHash(qrCode);

        if (Date.now() / 1000 > expTime) {
            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json({ error: "QR code has expired" });
        }

        return res.status(StatusCodes.OK).json(userId);
    }
);

export default checkinRouter;
