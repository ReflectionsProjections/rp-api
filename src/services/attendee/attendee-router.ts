import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    AttendeeCreateValidator,
    AttendeeRedeemMerchValidator,
    EventIdValidator,
} from "./attendee-validators";
import { SupabaseDB, TierType } from "../../database";
import { Tiers, IconColors } from "./attendee-schema";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { generateQrHash, getCurrentDay } from "../checkin/checkin-utils";
import { getFirebaseAdmin } from "../../firebase";

const attendeeRouter = Router();

// Tier hierarchy for redemption logic
const TIER_HIERARCHY = {
    [Tiers.Enum.TIER1]: 1,
    [Tiers.Enum.TIER2]: 2,
    [Tiers.Enum.TIER3]: 3,
    [Tiers.Enum.TIER4]: 4,
} as const;

// Favorite an event for an attendee
attendeeRouter.post(
    "/favorites/:eventId",
    RoleChecker([Role.Enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const userId = payload.userId;

        const { eventId } = EventIdValidator.parse(req.params);

        const { data: attendee } = await SupabaseDB.ATTENDEES.select(
            "favoriteEvents"
        )
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        if (!attendee) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        const newFavorites = (attendee.favoriteEvents || []).includes(eventId)
            ? attendee.favoriteEvents || []
            : [...(attendee.favoriteEvents || []), eventId];

        await SupabaseDB.ATTENDEES.update({ favoriteEvents: newFavorites })
            .eq("userId", userId)
            .throwOnError();

        // enroll them into the topic:
        const { data: device } = await SupabaseDB.NOTIFICATIONS.select(
            "deviceId"
        )
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        if (device?.deviceId) {
            const topicName = `event_${eventId}`;
            await getFirebaseAdmin()
                .messaging()
                .subscribeToTopic(device?.deviceId, topicName);
        }

        return res.status(StatusCodes.OK).json({ favorites: newFavorites });
    }
);

// Unfavorite an event for an attendee
attendeeRouter.delete(
    "/favorites/:eventId",
    RoleChecker([Role.Enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const userId = payload.userId;
        const { eventId } = EventIdValidator.parse(req.params);

        const { data: attendee } = await SupabaseDB.ATTENDEES.select(
            "favoriteEvents"
        )
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        if (!attendee) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        const updatedFavorites = (attendee?.favoriteEvents || []).filter(
            (id: string) => id !== eventId
        );
        await SupabaseDB.ATTENDEES.update({
            favoriteEvents: updatedFavorites,
        })
            .eq("userId", userId)
            .throwOnError();

        // remove them from the topic:
        const { data: device } = await SupabaseDB.NOTIFICATIONS.select(
            "deviceId"
        )
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        if (device?.deviceId) {
            const topicName = `event_${eventId}`;
            await getFirebaseAdmin()
                .messaging()
                .unsubscribeFromTopic(device?.deviceId, topicName);
        }

        return res.status(StatusCodes.OK).json({ favorites: updatedFavorites });
    }
);

// Get favorite events for an attendee
attendeeRouter.get(
    "/favorites",
    RoleChecker([Role.Enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const userId = payload.userId;

        const { data: attendee } = await SupabaseDB.ATTENDEES.select(
            "favoriteEvents"
        )
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        if (!attendee) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        return res.status(StatusCodes.OK).json({
            userId: userId,
            favoriteEvents: attendee.favoriteEvents || [],
        });
    }
);

// Create a new attendee
attendeeRouter.post("/", async (req, res) => {
    const { userId, tags } = AttendeeCreateValidator.parse(req.body);

    const newAttendee = {
        userId: userId,
        points: 0,
        favoriteEvents: [],
        puzzlesCompleted: [],
        tags: tags,
        currentTier: Tiers.Enum.TIER1,
        icon: IconColors.Enum.RED,
        hasPriorityMon: false,
        hasPriorityTue: false,
        hasPriorityWed: false,
        hasPriorityThu: false,
        hasPriorityFri: false,
        hasPrioritySat: false,
        hasPrioritySun: false,
    }; // TODO: add a validator????

    await SupabaseDB.ATTENDEES.insert(newAttendee).throwOnError();

    return res.status(StatusCodes.CREATED).json({
        userId: userId,
        tags: tags,
    });
});

// generates a unique QR code for each attendee
attendeeRouter.get("/qr/", RoleChecker([Role.Enum.USER]), async (req, res) => {
    const payload = res.locals.payload;

    const userId = payload.userId;
    const expTime = Math.floor(Date.now() / 1000) + 20; // Current epoch time in seconds + 20 seconds
    const qrCodeString = generateQrHash(userId, expTime);
    return res.status(StatusCodes.OK).json({ qrCode: qrCodeString });
});

attendeeRouter.get(
    "/points",
    RoleChecker([Role.Enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const userId = payload.userId;

        // Check if the user exists in the database
        const { data: user } = await SupabaseDB.ATTENDEES.select("points")
            .eq("userId", userId)
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
        const userId = payload.userId;

        // Check if the user exists in the database
        const { data: user } = await SupabaseDB.ATTENDEES.select()
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        const { data: registration } = await SupabaseDB.REGISTRATIONS.select(
            "dietaryRestrictions"
        )
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        // check if true for cur day
        const day = getCurrentDay();
        const priorityKey = `hasPriority${day}`;
        if (!user) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }
        const hasPriority = user[priorityKey as keyof typeof user];
        const dietary = registration?.dietaryRestrictions || [];
        const hasFoodRestrictions = ["VEGAN", "GLUTEN-FREE"].some((r) =>
            dietary.includes(r)
        );
        const foodwave = hasPriority || hasFoodRestrictions ? 1 : 2;

        return res.status(StatusCodes.OK).json({ foodwave });
    }
);

attendeeRouter.get("/", RoleChecker([Role.Enum.USER]), async (req, res) => {
    const payload = res.locals.payload;
    const userId = payload.userId;

    // Check if the user exists in the database
    const { data: user } = await SupabaseDB.ATTENDEES.select()
        .eq("userId", userId)
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
    "/id/:userId",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const { userId } = req.params;

        // Check if the user exists in the database
        const { data: user } = await SupabaseDB.ATTENDEES.select()
            .eq("userId", userId)
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
                "email, userId"
            ).throwOnError();

        return res.status(StatusCodes.OK).json(data);
    }
);

attendeeRouter.get(
    "/redeemable/:userId",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const { userId } = req.params;

        const { data: user } = await SupabaseDB.ATTENDEES.select("currentTier")
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        if (!user) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        const { data: redeemed } = await SupabaseDB.REDEMPTIONS.select()
            .eq("userId", userId)
            .throwOnError();

        const redeemedTiers = redeemed.map((r: { item: TierType }) => r.item);

        const userTierLevel = TIER_HIERARCHY[user.currentTier];
        const allTiers: TierType[] = Object.values(Tiers.Enum);

        const redeemableTiers = allTiers.filter((tier) => {
            const tierLevel = TIER_HIERARCHY[tier];
            return tierLevel <= userTierLevel && !redeemedTiers.includes(tier);
        });

        return res.status(StatusCodes.OK).json({
            userId,
            currentTier: user.currentTier,
            redeemedTiers,
            redeemableTiers,
        });
    }
);

attendeeRouter.post(
    "/redeem",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const { userId, tier } = AttendeeRedeemMerchValidator.parse(req.body);

        const { data: user } = await SupabaseDB.ATTENDEES.select("currentTier")
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        if (!user) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        const { data: existingRedemption } =
            await SupabaseDB.REDEMPTIONS.select()
                .eq("userId", userId)
                .eq("item", tier)
                .maybeSingle()
                .throwOnError();

        if (existingRedemption) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ error: "Tier already redeemed" });
        }

        // check if user tier is too low for redemption
        const userTierLevel = TIER_HIERARCHY[user.currentTier];
        const tierLevel = TIER_HIERARCHY[tier];
        if (tierLevel > userTierLevel) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ error: "User tier too low for redemption" });
        }

        await SupabaseDB.REDEMPTIONS.insert({
            userId,
            item: tier,
        }).throwOnError();

        return res.status(StatusCodes.OK).json({
            message: "Tier redeemed successfully!",
            userId,
            tier,
        });
    }
);

export default attendeeRouter;
