import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    AttendeeCreateValidator,
    EventIdValidator,
} from "./attendee-validators";
import { SupabaseDB } from "../../supabase";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { generateQrHash, getCurrentDay } from "../checkin/checkin-utils";

import { decryptId } from "./attendee-utils";

import { generateJWT } from "../auth/auth-utils";
import Config from "../../config";

const attendeeRouter = Router();

// Favorite an event for an attendee
attendeeRouter.post(
    "/favorites/:event_id",
    RoleChecker([Role.Enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const user_id = payload.user_id;
        const { event_id } = EventIdValidator.parse(req.params);

        const { data: attendee } = await SupabaseDB.ATTENDEES.select(
            "favorite_events"
        )
            .eq("user_id", user_id)
            .maybeSingle()
            .throwOnError();

        if (!attendee) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        const newFavorites = attendee.favorite_events.includes(event_id)
            ? attendee.favorite_events
            : [...attendee.favorite_events, event_id];

        await SupabaseDB.ATTENDEES.update({ favorite_events: newFavorites })
            .eq("user_id", user_id)
            .throwOnError();

        return res.status(StatusCodes.OK).json({ favorites: newFavorites });
    }
);

// Unfavorite an event for an attendee
attendeeRouter.delete(
    "/favorites/:event_id",
    RoleChecker([Role.Enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const user_id = payload.user_id;
        const { event_id } = EventIdValidator.parse(req.params);

        const { data: attendee } = await SupabaseDB.ATTENDEES.select(
            "favorite_events"
        )
            .eq("user_id", user_id)
            .maybeSingle()
            .throwOnError();

        if (!attendee) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        const updatedFavorites = (attendee?.favorite_events || []).filter(
            (id) => id !== event_id
        );
        await SupabaseDB.ATTENDEES.update({
            favorite_events: updatedFavorites,
        })
            .eq("user_id", user_id)
            .throwOnError();
        return res.status(StatusCodes.OK).json({ favorites: updatedFavorites });
    }
);

// Get favorite events for an attendee
attendeeRouter.get(
    "/favorites",
    RoleChecker([Role.Enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const user_id = payload.user_id;

        const { data: attendee } = await SupabaseDB.ATTENDEES.select(
            "favorite_events"
        )
            .eq("user_id", user_id)
            .maybeSingle()
            .throwOnError();

        if (!attendee) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        return res.status(StatusCodes.OK).json({
            user_id: user_id,
            favorite_events: attendee.favorite_events,
        });
    }
);

// Create a new attendee
attendeeRouter.post("/", async (req, res) => {
    const { user_id } = AttendeeCreateValidator.parse(req.body);

    const newAttendee = {
        user_id: user_id,
        points: 0,
        favorite_events: [],
        puzzles_completed: [],
        is_eligible_tshirt: false,
        is_eligible_cap: false,
        is_eligible_tote: false,
        is_eligible_button: false,
        has_redeemed_tshirt: false,
        has_redeemed_cap: false,
        has_redeemed_tote: false,
        has_redeemed_button: false,
        has_priority_mon: false,
        has_priority_tue: false,
        has_priority_wed: false,
        has_priority_thu: false,
        has_priority_fri: false,
        has_priority_sat: false,
        has_priority_sun: false,
    };

    await SupabaseDB.ATTENDEES.insert(newAttendee).throwOnError();

    return res.status(StatusCodes.CREATED).json({ user_id: user_id });
});

// generates a unique QR code for each attendee
attendeeRouter.get("/qr/", RoleChecker([Role.Enum.USER]), async (req, res) => {
    const payload = res.locals.payload;

    const user_id = payload.user_id;
    const expTime = Math.floor(Date.now() / 1000) + 20; // Current epoch time in seconds + 20 seconds
    const qrCodeString = generateQrHash(user_id, expTime);
    return res.status(StatusCodes.OK).json({ qrCode: qrCodeString });
});

attendeeRouter.get(
    "/points",
    RoleChecker([Role.Enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const user_id = payload.user_id;

        // Check if the user exists in the database
        const { data: user } = await SupabaseDB.ATTENDEES.select("points")
            .eq("user_id", user_id)
            .maybeSingle()
            .throwOnError();

        if (!user) {
            // adding because user could be null is an error
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        return res.status(StatusCodes.OK).json({ points: user.points });
    }
);

attendeeRouter.get(
    "/foodwave",
    RoleChecker([Role.Enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const user_id = payload.user_id;

        // Check if the user exists in the database
        const { data: user } = await SupabaseDB.ATTENDEES.select()
            .eq("user_id", user_id)
            .maybeSingle()
            .throwOnError();

        const { data: registration } = await SupabaseDB.REGISTRATIONS.select(
            "dietary_restrictions"
        )
            .eq("user_id", user_id)
            .maybeSingle()
            .throwOnError();

        // check if true for cur day
        const day = getCurrentDay().toLowerCase(); // Ensure day is lowercase
        const priorityKey = `has_priority_${day}`;
        if (!user) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }
        const hasPriority = (user as Record<string, any>)[priorityKey];
        const dietary = registration?.dietary_restrictions || [];
        const hasFoodRestrictions = ["VEGAN", "GLUTEN-FREE"].some((r) =>
            dietary.includes(r)
        );
        const foodwave = hasPriority || hasFoodRestrictions ? 1 : 2;

        return res.status(StatusCodes.OK).json({ foodwave });
    }
);

attendeeRouter.get("/", RoleChecker([Role.Enum.USER]), async (req, res) => {
    const payload = res.locals.payload;
    const user_id = payload.user_id;

    // Check if the user exists in the database
    const { data: user } = await SupabaseDB.ATTENDEES.select()
        .eq("user_id", user_id)
        .maybeSingle()
        .throwOnError();

    if (!user) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ error: "UserNotFound" });
    }

    return res.status(StatusCodes.OK).json(user);
});

// Get attendee info via user_id
attendeeRouter.get(
    "/id/:user_id",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const user_id = req.params.user_id;

        // Check if the user exists in the database
        const { data: user } = await SupabaseDB.ATTENDEES.select()
            .eq("user_id", user_id)
            .maybeSingle()
            .throwOnError();
        if (!user) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        return res.status(StatusCodes.OK).json(user);
    }
);

attendeeRouter.get(
    "/emails",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (_req, res) => {
        const { data } =
            await SupabaseDB.REGISTRATIONS.select(
                "email, user_id"
            ).throwOnError();

        return res.status(StatusCodes.OK).json(data);
    }
);

attendeeRouter.post(
    "/redeemMerch/:ITEM",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const user_id = req.body.user_id;
        const merchItem = req.params.ITEM.toLowerCase();
        const validItems = ["tshirt", "cap", "tote", "button"];

        if (!validItems.includes(merchItem)) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ error: "Not a valid item" });
        }

        const { data: user } = await SupabaseDB.ATTENDEES.select()
            .eq("user_id", user_id)
            .maybeSingle()
            .throwOnError();

        if (!user) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        const eligibleKey = `is_eligible_${merchItem}`;
        const redeemedKey = `has_redeemed_${merchItem}`;

        if (!(user as Record<string, any>)[eligibleKey]) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ error: "Too few points" });
        }

        if ((user as Record<string, any>)[redeemedKey]) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ error: "Item already redeemed" });
        }

        await SupabaseDB.ATTENDEES.update({ [redeemedKey]: true })
            .eq("user_id", user_id)
            .throwOnError();

        return res.status(StatusCodes.OK).json({ message: "Item Redeemed!" });
    }
);

attendeeRouter.get("/resume/update/:ENCODED_ID", async (req, res) => {
    const ENCODED_ID = req.params.ENCODED_ID;
    const decrypted_id = await decryptId(ENCODED_ID);
    const token = await generateJWT(decrypted_id);
    const uploadURL = Config.WEB_RESUME_REUPLOAD_ROUTE + `?token=${token}`;
    return res.redirect(uploadURL);
});

export default attendeeRouter;
