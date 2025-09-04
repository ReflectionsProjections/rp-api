import { z } from "zod";

const registerDeviceSchema = z.object({
    deviceId: z.string(),
});

const sendToTopicSchema = z.object({
    title: z.string().min(1, { message: "Title cannot be empty" }),
    body: z.string().min(1, { message: "Body cannot be empty" }),
});

const manualTopicSchema = z.object({
    userId: z.string(),
    topicName: z.string().min(1),
});

export { registerDeviceSchema, sendToTopicSchema, manualTopicSchema };
