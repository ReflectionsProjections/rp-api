import { Router } from "express";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import { registerDeviceSchema, sendToTopicSchema, manualTopicSchema } from "./notifications-schema";
import { SupabaseDB } from "../../supabase";
import { admin } from '../../firebase';

const notificationsRouter = Router();

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
        }).single().throwOnError();

        // sign them up for the default topic: all users (notify everyone who has the app)
        await admin.messaging().subscribeToTopic(notificationEnrollmentData.deviceId, 'allUsers');

        return res.status(StatusCodes.CREATED).json(notificationEnrollmentData);
    }
);

// Admins can send notifications to a specific topic
// parameter: the topicName that the admin is sending to
// ^ Can get this from dropdown (will have a route to get all topics)
// Request body: title, body. (title and body of the notification)
notificationsRouter.post(
    "/topics/:topicName",
    RoleChecker([Role.enum.ADMIN]), // for now thinking that only admins get to use this
    async (req, res) => {

        sendToTopicSchema.parse(req.body); // make sure it fits the validator

        const { topicName } = req.params;
        const { title, body} = req.body;

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
            message: `Notification sent to topic: ${topicName}`
        });

    }
);

// Admins can manually subscribe a user to a topic
// Request body: userId, topicName
notificationsRouter.post(
    "/manual-topic", // open to suggestions for a better name
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const { userId, topicName } =  manualTopicSchema.parse(req.body);
        // get the user's deviceId
        const { data: userDevice } = await SupabaseDB.NOTIFICATIONS
            .select("deviceId")
            .eq("userId", userId)
            .single().throwOnError();

        // Subscribe the user to the specified topic
        await admin.messaging().subscribeToTopic(userDevice.deviceId, topicName);

        return res.status(StatusCodes.OK).send({
            status: "success",
            message: `User ${userId} subscribed to topic: ${topicName}`
        });
    }
);

// Admins can manually unsubscribe a user from a topic
// Request body: userId, topicName
notificationsRouter.delete(
    "/manual-topic", // also open to suggestions for a better name here
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const { userId, topicName } =  manualTopicSchema.parse(req.body);
        // get the user's deviceId
        const { data: userDevice } = await SupabaseDB.NOTIFICATIONS
            .select("deviceId")
            .eq("userId", userId)
            .single().throwOnError();

        // Subscribe the user to the specified topic
        await admin.messaging().unsubscribeFromTopic(userDevice.deviceId, topicName);

        return res.status(StatusCodes.OK).send({
            status: "success",
            message: `User ${userId} unsubscribed from topic: ${topicName}`
        });
    }
);

// TODO Get all available notification topics
// Firebase doesn't have an actual way to get this. 
// one topic is allUsers, defined earlier in this file
// might be worth making a table in Supabase to store topics, and adding to it when a new topic is created

export default notificationsRouter;
