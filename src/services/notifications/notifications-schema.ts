import { z } from "zod";
import { registry } from "../../middleware/openapi-registry";

const registerDeviceSchema = registry.register(
    "RegisterDeviceValidator",
    z
        .object({ deviceId: z.string() })
        .openapi("RegisterDeviceValidator", {
            example: { deviceId: "fCm_token_abc123" },
        })
);

const sendToTopicSchema = registry.register(
    "SendToTopicValidator",
    z
        .object({
            title: z.string().min(1, { message: "Title cannot be empty" }),
            body: z.string().min(1, { message: "Body cannot be empty" }),
        })
        .openapi("SendToTopicValidator", {
            example: { title: "R|P Update", body: "Check-in opens at 9am!" },
        })
);

const manualTopicSchema = registry.register(
    "ManualTopicValidator",
    z
        .object({
            userId: z.string(),
            topicName: z.string().min(1),
        })
        .openapi("ManualTopicValidator", {
            example: {
                userId: "user_abc123",
                topicName: "tag_Career_Readiness",
            },
        })
);

export const customTopicSchema = registry.register(
    "CustomTopicValidator",
    z
        .object({ topicName: z.string().min(1) })
        .openapi("CustomTopicValidator", {
            example: { topicName: "my-custom-topic" },
        })
);

export const notificationSuccessResponse = registry.register(
    "NotificationSuccessResponse",
    z
        .object({ status: z.string(), message: z.string() })
        .openapi("NotificationSuccessResponse", {
            example: { status: "success", message: "Notification sent to topic: allUsers" },
        })
);

export const topicsListResponse = registry.register(
    "TopicsListResponse",
    z
        .object({ topics: z.array(z.string()) })
        .openapi("TopicsListResponse", {
            example: { topics: ["allUsers", "tag_AI", "tag_Career_Readiness"] },
        })
);

export { registerDeviceSchema, sendToTopicSchema, manualTopicSchema };
