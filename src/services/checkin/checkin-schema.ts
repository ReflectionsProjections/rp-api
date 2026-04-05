import { z } from "zod";
import { registry } from "../../middleware/openapi-registry";

export type ScanPayload = z.infer<typeof ScanValidator>;
export type MerchScanPayload = z.infer<typeof MerchScanValidator>;
export type CheckinEventPayload = z.infer<typeof EventValidator>;

const ScanValidator = registry.register(
    "ScanValidator",
    z
        .object({
            eventId: z.string().min(1, { message: "Event ID cannot be empty" }),
            qrCode: z.string().min(1, { message: "QR Code cannot be empty" }),
        })
        .openapi("ScanValidator", {
            example: {
                eventId: "3a72d491-c2f9-4baf-af5a-55713621d978",
                qrCode: "abc123:1711483200",
            },
        })
);

const MerchScanValidator = registry.register(
    "MerchScanValidator",
    z
        .object({
            qrCode: z.string().min(1, { message: "QR Code cannot be empty" }),
        })
        .openapi("MerchScanValidator", {
            example: { qrCode: "abc123:1711483200" },
        })
);

const EventValidator = registry.register(
    "EventValidator",
    z
        .object({
            eventId: z.string().min(1, { message: "Event ID cannot be empty" }),
            userId: z.string().min(1, { message: "User ID cannot be empty" }),
        })
        .openapi("EventValidator", {
            example: {
                eventId: "3a72d491-c2f9-4baf-af5a-55713621d978",
                userId: "user_abc123",
            },
        })
);

export const CheckinUserIdResponse = registry.register(
    "CheckinUserIdResponse",
    z.string().openapi("CheckinUserIdResponse", {
        description: "The checked-in user's ID",
        example: "user_abc123",
    })
);

export { ScanValidator, MerchScanValidator, EventValidator };
