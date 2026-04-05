import { Router } from "express";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import {
    registerDeviceSchema,
    sendToTopicSchema,
    manualTopicSchema,
} from "./notifications-schema";
import { SupabaseDB } from "../../database";
import { getFirebaseAdmin } from "../../firebase";
import { getCurrentDay } from "../checkin/checkin-utils";

const notificationsRouter = Router();

/**
 * @swagger
 * /notifications/register:
 *   post:
 *     summary: Register a device for push notifications
 *     description: |
 *       Registers the caller’s FCM device token under their userId and
 *       subscribes them to the `allUsers` topic plus any tag-based topics
 *       derived from their attendee profile.
 *
 *       **Required roles: USER**
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: ‘#/components/schemas/RegisterDeviceValidator’
 *     responses:
 *       201:
 *         description: Device registered; returns the validated registration data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: ‘#/components/schemas/RegisterDeviceValidator’
 *     security:
 *       - bearerAuth: []
 */
// Register user’s device identifier under their userId
// Request body: deviceId: The FCM device token from the client app.
notificationsRouter.post(
    "/register",
    RoleChecker([Role.enum.USER]),
    async (req, res) => {
        const payload = res.locals.payload;
        const userId = payload.userId;
        const notificationEnrollmentData = registerDeviceSchema.parse(req.body);
        await SupabaseDB.NOTIFICATIONS.upsert({
            userId: userId,
            deviceId: notificationEnrollmentData.deviceId,
        })
            .single()
            .throwOnError();

        // sign them up for the default topic: all users (notify everyone who has the app)
        await getFirebaseAdmin()
            .messaging()
            .subscribeToTopic(notificationEnrollmentData.deviceId, "allUsers");

        // Get their tags
        const { data: attendee } = await SupabaseDB.ATTENDEES.select("tags")
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

        // enroll them in a topic for the tags
        if (attendee?.tags && attendee.tags.length > 0) {
            const userTags = attendee.tags;
            const subscriptionPromises = userTags.map((tag) => {
                const topicName = `tag_${tag.replace(/[^a-zA-Z0-9-_.~%]/g, "_")}`;
                return getFirebaseAdmin()
                    .messaging()
                    .subscribeToTopic(
                        notificationEnrollmentData.deviceId,
                        topicName
                    );
            });
            await Promise.all(subscriptionPromises);
        }

        return res.status(StatusCodes.CREATED).json(notificationEnrollmentData);
    }
);

/**
 * @swagger
 * /notifications/topics/{topicName}:
 *   post:
 *     summary: Send a push notification to a topic
 *     description: |
 *       Sends an FCM notification to all devices subscribed to the given topic.
 *
 *       **Required roles: SUPER_ADMIN**
 *     tags: [Notifications]
 *     parameters:
 *       - name: topicName
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: allUsers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendToTopicValidator'
 *     responses:
 *       200:
 *         description: Notification successfully sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationSuccessResponse'
 *     security:
 *       - bearerAuth: []
 */
// Super admins can send notifications to a specific topic
// parameter: the topicName that the admin is sending to
// ^ Can get this from dropdown (will have a route to get all topics)
// Request body: title, body. (title and body of the notification)
notificationsRouter.post(
    "/topics/:topicName",
    RoleChecker([Role.enum.SUPER_ADMIN]),
    async (req, res) => {
        sendToTopicSchema.parse(req.body); // make sure it fits the validator

        const { topicName } = req.params;
        const { title, body } = req.body;

        const message = {
            topic: topicName,
            notification: {
                title: title,
                body: body,
            },
        };

        await getFirebaseAdmin().messaging().send(message);

        return res.status(StatusCodes.OK).send({
            status: "success",
            message: `Notification sent to topic: ${topicName}`,
        });
    }
);

/**
 * @swagger
 * /notifications/custom-topic:
 *   post:
 *     summary: Create a custom notification topic
 *     description: |
 *       Persists a custom topic name to the database so it appears in
 *       the topics list and can be targeted by future notifications.
 *
 *       **Required roles: ADMIN**
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomTopicValidator'
 *     responses:
 *       201:
 *         description: Custom topic created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationSuccessResponse'
 *     security:
 *       - bearerAuth: []
 */
// Admins can create a custom topic
// Request body: topicName
notificationsRouter.post(
    "/custom-topic",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const { topicName } = req.body;
        await SupabaseDB.CUSTOM_TOPICS.insert({
            topicName: topicName,
        }).throwOnError();

        return res.status(StatusCodes.CREATED).send({
            status: "success",
            message: `Custom topic created: ${topicName}`,
        });
    }
);

/**
 * @swagger
 * /notifications/manual-users-topic:
 *   post:
 *     summary: Manually subscribe a user to a topic
 *     description: |
 *       Looks up the user's registered device token and subscribes it to
 *       the specified FCM topic.
 *
 *       **Required roles: ADMIN**
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ManualTopicValidator'
 *     responses:
 *       200:
 *         description: User successfully subscribed to topic
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationSuccessResponse'
 *     security:
 *       - bearerAuth: []
 */
// Admins can manually subscribe a user to a topic
// Request body: userId, topicName
notificationsRouter.post(
    "/manual-users-topic", // open to suggestions for a better name
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const { userId, topicName } = manualTopicSchema.parse(req.body);
        // get the user's deviceId
        const { data: userDevice } = await SupabaseDB.NOTIFICATIONS.select(
            "deviceId"
        )
            .eq("userId", userId)
            .single()
            .throwOnError();

        // Subscribe the user to the specified topic
        await getFirebaseAdmin()
            .messaging()
            .subscribeToTopic(userDevice.deviceId, topicName);

        return res.status(StatusCodes.OK).send({
            status: "success",
            message: `User ${userId} subscribed to topic: ${topicName}`,
        });
    }
);

/**
 * @swagger
 * /notifications/manual-users-topic:
 *   delete:
 *     summary: Manually unsubscribe a user from a topic
 *     description: |
 *       Looks up the user's registered device token and unsubscribes it from
 *       the specified FCM topic.
 *
 *       **Required roles: ADMIN**
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ManualTopicValidator'
 *     responses:
 *       200:
 *         description: User successfully unsubscribed from topic
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationSuccessResponse'
 *     security:
 *       - bearerAuth: []
 */
// Admins can manually unsubscribe a user from a topic
// Request body: userId, topicName
notificationsRouter.delete(
    "/manual-users-topic", // also open to suggestions for a better name here
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const { userId, topicName } = manualTopicSchema.parse(req.body);
        // get the user's deviceId
        const { data: userDevice } = await SupabaseDB.NOTIFICATIONS.select(
            "deviceId"
        )
            .eq("userId", userId)
            .single()
            .throwOnError();

        // Subscribe the user to the specified topic
        await getFirebaseAdmin()
            .messaging()
            .unsubscribeFromTopic(userDevice.deviceId, topicName);

        return res.status(StatusCodes.OK).send({
            status: "success",
            message: `User ${userId} unsubscribed from topic: ${topicName}`,
        });
    }
);

/**
 * @swagger
 * /notifications/topics:
 *   get:
 *     summary: Get all available notification topics
 *     description: |
 *       Returns a sorted, deduplicated list of all subscribable FCM topics,
 *       including static topics (`allUsers`, daily food-wave), event-derived
 *       topics, custom topics from the database, and tag-based topics.
 *
 *       **Required roles: ADMIN**
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: All available notification topics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopicsListResponse'
 *     security:
 *       - bearerAuth: []
 */
// Get all available notification topics
// Firebase doesn't have an actual way to get this.
// one topic is allUsers, defined earlier in this file
// the other topics are event topics, denoted by event_{eventId}
// any custom topics are in the customTopics table
notificationsRouter.get(
    "/topics",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const day = getCurrentDay();
        const currentDayTopic = `food-wave-1-${day.toLowerCase()}`;
        const staticTopics = ["allUsers", currentDayTopic]; // add any other static topics to this array in future

        const { data: events } =
            await SupabaseDB.EVENTS.select("name").throwOnError();
        const eventTopics =
            events?.map(
                (event) =>
                    `event_${event.name.replace(/[^a-zA-Z0-9-_.~%]/g, "_")}`
            ) ?? [];
        const { data: customTopicsData } =
            await SupabaseDB.CUSTOM_TOPICS.select("topicName").throwOnError();
        const customTopics =
            customTopicsData.map((topic) => topic.topicName) ?? [];

        const hardcodedTags = [
            "Career Readiness",
            "AI",
            "Research",
            "Interactive Events",
            "HCI",
            "Ethics",
            "Art/Media",
            "Autonomous Vehicles",
            "Networking",
            "Company Talk",
            "Cybersecurity",
        ];

        const tagTopics = hardcodedTags.map(
            (tag) => `tag_${tag.replace(/[^a-zA-Z0-9-_.~%]/g, "_")}`
        );

        const allTopics = [
            ...new Set([
                ...staticTopics,
                ...eventTopics,
                ...customTopics,
                ...tagTopics,
            ]),
        ];
        return res.status(StatusCodes.OK).send({ topics: allTopics.sort() });
    }
);

export default notificationsRouter;
