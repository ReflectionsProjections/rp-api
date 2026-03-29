import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    AttendeeIconUpdateValidator,
    AttendeeTagsUpdateValidator,
    AttendeeRedeemMerchValidator,
    EventIdValidator,
    AttendeePointsUpdateValidator,
} from "./attendee-validators";
import { Tiers } from "./attendee-schema";
import { SupabaseDB, IconColorType, TierType } from "../../database";
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

/**
 * @swagger
 * /attendee/favorites/{eventId}:
 *   post:
 *     summary: Favorite an event
 *     description: |
 *       Adds an event to the authenticated attendee's favorites list and subscribes
 *       their device to the event's notification topic (if a device is registered).
 *
 *       **Required roles: USER**
 *     tags: [Attendee]
 *     parameters:
 *       - name: eventId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Updated favorites list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeeFavoritesUpdateResponse'
 *       404:
 *         description: Attendee or event not found
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                     example:
 *                       error: "UserNotFound"
 *                 - $ref: '#/components/schemas/Error'
 *                     example:
 *                       error: "EventNotFound"
 *     security:
 *       - bearerAuth: []
 */
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

        const { data: event } = await SupabaseDB.EVENTS.select()
            .eq("eventId", eventId)
            .maybeSingle()
            .throwOnError();

        if (!event) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "EventNotFound" });
        }

        const topicName = `event_${event.name.replace(/[^a-zA-Z0-9-_.~%]/g, "_")}`;

        if (device?.deviceId) {
            await getFirebaseAdmin()
                .messaging()
                .subscribeToTopic(device?.deviceId, topicName);
        }

        return res.status(StatusCodes.OK).json({ favorites: newFavorites });
    }
);

/**
 * @swagger
 * /attendee/favorites/{eventId}:
 *   delete:
 *     summary: Unfavorite an event
 *     description: |
 *       Removes an event from the authenticated attendee's favorites list and
 *       unsubscribes their device from the event's notification topic (if registered).
 *
 *       **Required roles: USER**
 *     tags: [Attendee]
 *     parameters:
 *       - name: eventId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Updated favorites list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeeFavoritesUpdateResponse'
 *       404:
 *         description: Attendee or event not found
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                     example:
 *                       error: "UserNotFound"
 *                 - $ref: '#/components/schemas/Error'
 *                     example:
 *                       error: "EventNotFound"
 *     security:
 *       - bearerAuth: []
 */
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

        const { data: event } = await SupabaseDB.EVENTS.select()
            .eq("eventId", eventId)
            .maybeSingle()
            .throwOnError();

        if (!event) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "EventNotFound" });
        }

        const topicName = `event_${event.name.replace(/[^a-zA-Z0-9-_.~%]/g, "_")}`;

        if (device?.deviceId) {
            await getFirebaseAdmin()
                .messaging()
                .unsubscribeFromTopic(device?.deviceId, topicName);
        }

        return res.status(StatusCodes.OK).json({ favorites: updatedFavorites });
    }
);

/**
 * @swagger
 * /attendee/favorites:
 *   get:
 *     summary: Get favorited events
 *     description: |
 *       Returns the authenticated attendee's list of favorited event IDs.
 *
 *       **Required roles: USER**
 *     tags: [Attendee]
 *     responses:
 *       200:
 *         description: The attendee's favorited events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeeFavoritesView'
 *       404:
 *         description: Attendee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /attendee/qr/:
 *   get:
 *     summary: Get attendee QR code
 *     description: |
 *       Generates a time-limited (20-second) QR code hash for the authenticated attendee,
 *       used for check-in scanning.
 *
 *       **Required roles: USER**
 *     tags: [Attendee]
 *     responses:
 *       200:
 *         description: A short-lived QR code string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeeQrResponse'
 *     security:
 *       - bearerAuth: []
 */
// generates a unique QR code for each attendee
attendeeRouter.get("/qr/", RoleChecker([Role.Enum.USER]), async (req, res) => {
    const payload = res.locals.payload;

    const userId = payload.userId;
    const expTime = Math.floor(Date.now() / 1000) + 20; // Current epoch time in seconds + 20 seconds
    const qrCodeString = generateQrHash(userId, expTime);
    return res.status(StatusCodes.OK).json({ qrCode: qrCodeString });
});

/**
 * @swagger
 * /attendee/points:
 *   get:
 *     summary: Get attendee points
 *     description: |
 *       Returns the current point total for the authenticated attendee.
 *
 *       **Required roles: USER**
 *     tags: [Attendee]
 *     responses:
 *       200:
 *         description: The attendee's current points
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeePointsResponse'
 *       404:
 *         description: Attendee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /attendee/foodwave:
 *   get:
 *     summary: Get attendee food wave
 *     description: |
 *       Returns which meal wave (1 = priority, 2 = general) the authenticated attendee
 *       belongs to, based on priority flags and dietary restrictions.
 *
 *       **Required roles: USER**
 *     tags: [Attendee]
 *     responses:
 *       200:
 *         description: The attendee's food wave assignment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeeFoodwaveResponse'
 *       404:
 *         description: Attendee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /attendee/:
 *   get:
 *     summary: Get current attendee profile
 *     description: |
 *       Returns the full profile record for the authenticated attendee.
 *
 *       **Required roles: USER**
 *     tags: [Attendee]
 *     responses:
 *       200:
 *         description: The attendee's profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeeView'
 *       404:
 *         description: Attendee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /attendee/id/{userId}:
 *   get:
 *     summary: Get attendee by user ID
 *     description: |
 *       Returns the full profile record for any attendee by their user ID.
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Attendee]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The requested attendee's profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeeView'
 *       404:
 *         description: Attendee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /attendee/emails:
 *   get:
 *     summary: Get all attendee emails
 *     description: |
 *       Returns a list of email, userId, and name for all registered attendees.
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Attendee]
 *     responses:
 *       200:
 *         description: List of attendee email records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AttendeeEmailEntry'
 *     security:
 *       - bearerAuth: []
 */
attendeeRouter.get(
    "/emails",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (_req, res) => {
        const { data } = await SupabaseDB.REGISTRATIONS.select(
            "email, userId, name"
        ).throwOnError();

        return res.status(StatusCodes.OK).json(data);
    }
);

/**
 * @swagger
 * /attendee/redeemable/{userId}:
 *   get:
 *     summary: Get redeemable merchandise tiers for an attendee
 *     description: |
 *       Returns the attendee's current tier, already-redeemed tiers, and tiers
 *       still available to redeem.
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Attendee]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Redeemable tier information for the attendee
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeeRedeemableView'
 *       404:
 *         description: Attendee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /attendee/redeem:
 *   post:
 *     summary: Redeem a merchandise tier for an attendee
 *     description: |
 *       Marks a merchandise tier as redeemed for the specified attendee.
 *       Fails if the tier has already been redeemed or the attendee's current
 *       tier is too low.
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Attendee]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AttendeeRedeemMerchValidator'
 *     responses:
 *       200:
 *         description: Tier redeemed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeeRedeemResponse'
 *       400:
 *         description: Redemption not allowed
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                     example:
 *                       error: "TierAlreadyRedeemed"
 *                 - $ref: '#/components/schemas/Error'
 *                     example:
 *                       error: "UserTierTooLow"
 *       404:
 *         description: Attendee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /attendee/icon:
 *   patch:
 *     summary: Update attendee icon color
 *     description: |
 *       Updates the icon color for the authenticated attendee.
 *
 *       **Required roles: USER**
 *     tags: [Attendee]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AttendeeIconUpdateValidator'
 *     responses:
 *       200:
 *         description: Updated icon color
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeeIconResponse'
 *       404:
 *         description: Attendee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
// Update attendee icon
attendeeRouter.patch(
    "/icon",
    RoleChecker([Role.Enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const userId = payload.userId;

        const { icon } = AttendeeIconUpdateValidator.parse(req.body);

        // Check if the user exists in the database
        const { data: user } = await SupabaseDB.ATTENDEES.select("icon")
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        if (!user) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        // Update the icon
        await SupabaseDB.ATTENDEES.update({ icon: icon as IconColorType })
            .eq("userId", userId)
            .throwOnError();

        return res.status(StatusCodes.OK).json({ icon });
    }
);

/**
 * @swagger
 * /attendee/tags:
 *   patch:
 *     summary: Update attendee interest tags
 *     description: |
 *       Replaces the authenticated attendee's interest tags and syncs Firebase
 *       notification topic subscriptions accordingly.
 *
 *       **Required roles: USER**
 *     tags: [Attendee]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AttendeeTagsUpdateValidator'
 *     responses:
 *       200:
 *         description: Updated tags list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeeTagsResponse'
 *       404:
 *         description: Attendee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
// Update attendee tags
attendeeRouter.patch(
    "/tags",
    RoleChecker([Role.Enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const userId = payload.userId;

        const { tags: newTags } = AttendeeTagsUpdateValidator.parse(req.body);

        // Check if the user exists in the database

        const [userData, notificationData] = await Promise.all([
            SupabaseDB.ATTENDEES.select("tags")
                .eq("userId", userId)
                .maybeSingle()
                .throwOnError(),
            SupabaseDB.NOTIFICATIONS.select("deviceId")
                .eq("userId", userId)
                .maybeSingle()
                .throwOnError(),
        ]);

        const user = userData.data;
        const deviceId = notificationData.data?.deviceId;

        if (!user) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        const oldTags = user.tags || [];

        if (deviceId) {
            const tagsToSubscribe = newTags.filter(
                (tag) => !oldTags.includes(tag)
            );
            const tagsToUnsubscribe = oldTags.filter(
                (tag) => !newTags.includes(tag)
            );
            const subscribePromises = tagsToSubscribe.map((tag) => {
                const topicName = `tag_${tag.replace(/[^a-zA-Z0-9-_.~%]/g, "_")}`;
                return getFirebaseAdmin()
                    .messaging()
                    .subscribeToTopic(deviceId, topicName);
            });

            const unsubscribePromises = tagsToUnsubscribe.map((tag) => {
                const topicName = `tag_${tag.replace(/[^a-zA-Z0-9-_.~%]/g, "_")}`;
                return getFirebaseAdmin()
                    .messaging()
                    .unsubscribeFromTopic(deviceId, topicName);
            });

            Promise.all([...subscribePromises, ...unsubscribePromises]).catch(
                (error) => {
                    console.error(
                        `Failed to sync FCM topics for user ${userId}:`,
                        error
                    );
                }
            );
        }

        // Update the tags
        await SupabaseDB.ATTENDEES.update({ tags: newTags })
            .eq("userId", userId)
            .throwOnError();

        return res.status(StatusCodes.OK).json({ tags: newTags });
    }
);

/**
 * @swagger
 * /attendee/addPoints:
 *   patch:
 *     summary: Add points to an attendee
 *     description: |
 *       Adds a specified number of points to any attendee's total.
 *
 *       **Required roles: ADMIN**
 *     tags: [Attendee]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AttendeePointsUpdateValidator'
 *     responses:
 *       200:
 *         description: Updated point total
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendeePointsResponse'
 *       404:
 *         description: Attendee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
// Custom add points to attendee
// Request body: { userId: string, pointsToAdd: number }
attendeeRouter.patch(
    "/addPoints",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { userId, pointsToAdd } = AttendeePointsUpdateValidator.parse(
            req.body
        );
        // Check if the user exists in the database
        const { data: user } = await SupabaseDB.ATTENDEES.select("points")
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        if (!user) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "UserNotFound" });
        }

        const newPoints = (user.points || 0) + pointsToAdd;

        // Update the points
        console.log(`Updating points for user ${userId} to ${newPoints}`);
        await SupabaseDB.ATTENDEES.update({ points: newPoints })
            .eq("userId", userId)
            .throwOnError();

        return res.status(StatusCodes.OK).json({ points: newPoints });
    }
);

export default attendeeRouter;
