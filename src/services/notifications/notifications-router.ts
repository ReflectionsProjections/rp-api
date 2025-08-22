import { Router } from "express";
// import RoleChecker from "../../middleware/role-checker";
// import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import {
    registerDeviceSchema,
    sendToTopicSchema,
    manualTopicSchema,
} from "./notifications-schema";
import { SupabaseDB } from "../../database";
import { admin } from "../../firebase";

const notificationsRouter = Router();

// Register user’s device identifier under their userId
// Request body: deviceId: The FCM device token from the client app.
notificationsRouter.post(
    "/register",
    // RoleChecker([Role.enum.USER]),
    async (req, res) => {
        // const payload = res.locals.payload;
        // const userId = payload.userId;
        const userId = "123";
        const deviceId = "cQBYOfCAZ0JkulTJWi31rS:APA91bHe6jXBkmtNOkI_V4HgL9vg9jfi3_jTJCIXkTuHks02VJ6ctTzmIB0csPL4FxLpLhZwOSXncu-xGhBg2K8ZCVaY1U0wnv5a1GOiKGTVpruRZ7CNKbE";
        // const notificationEnrollmentData = registerDeviceSchema.parse(req.body);
        await SupabaseDB.NOTIFICATIONS.upsert({
            userId: userId,
            // deviceId: notificationEnrollmentData.deviceId,
            deviceId: deviceId,
        })
            .single()
            .throwOnError();

        // sign them up for the default topic: all users (notify everyone who has the app)
        await admin
            .messaging()
            .subscribeToTopic(deviceId, "allUsers");

        // return res.status(StatusCodes.CREATED).json(notificationEnrollmentData);
        return res.status(StatusCodes.CREATED);

    }
);

// Admins can send notifications to a specific topic
// parameter: the topicName that the admin is sending to
// ^ Can get this from dropdown (will have a route to get all topics)
// Request body: title, body. (title and body of the notification)
notificationsRouter.post(
    "/topics/:topicName",
    // RoleChecker([Role.enum.ADMIN]), // for now thinking that only admins get to use this
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

        await admin.messaging().send(message);

        return res.status(StatusCodes.OK).send({
            status: "success",
            message: `Notification sent to topic: ${topicName}`,
        });
    }
);

// Admins can create a custom topic
// Request body: topicName
notificationsRouter.post(
    "/custom-topic",
    // RoleChecker([Role.enum.ADMIN]),
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

// Admins can manually subscribe a user to a topic
// Request body: userId, topicName
notificationsRouter.post(
    "/manual-users-topic", // open to suggestions for a better name
    // RoleChecker([Role.enum.ADMIN]),
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
        await admin
            .messaging()
            .subscribeToTopic(userDevice.deviceId, topicName);

        return res.status(StatusCodes.OK).send({
            status: "success",
            message: `User ${userId} subscribed to topic: ${topicName}`,
        });
    }
);

// Admins can manually unsubscribe a user from a topic
// Request body: userId, topicName
notificationsRouter.delete(
    "/manual-users-topic", // also open to suggestions for a better name here
    // RoleChecker([Role.enum.ADMIN]),
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
        await admin
            .messaging()
            .unsubscribeFromTopic(userDevice.deviceId, topicName);

        return res.status(StatusCodes.OK).send({
            status: "success",
            message: `User ${userId} unsubscribed from topic: ${topicName}`,
        });
    }
);

// Get all available notification topics
// Firebase doesn't have an actual way to get this.
// one topic is allUsers, defined earlier in this file
// the other topics are event topics, denoted by event_{eventId}
// any custom topics are in the customTopics table
notificationsRouter.get(
    "/topics",
    // RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const staticTopics = ["allUsers"]; // add any other static topics to this array in future

        const { data: events } =
            await SupabaseDB.EVENTS.select("eventId").throwOnError();
        const eventTopics =
            events.map((event) => `event_${event.eventId}`) ?? [];
        const { data: customTopicsData } =
            await SupabaseDB.CUSTOM_TOPICS.select("topicName").throwOnError();
        const customTopics =
            customTopicsData.map((topic) => topic.topicName) ?? [];
        const allTopics = [
            ...new Set([...staticTopics, ...eventTopics, ...customTopics]),
        ];
        return res.status(StatusCodes.OK).send({ topics: allTopics.sort() });
    }
);

export default notificationsRouter;
