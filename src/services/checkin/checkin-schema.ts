import { z } from "zod";

export type ScanPayload = z.infer<typeof ScanValidator>;
export type MerchScanPayload = z.infer<typeof MerchScanValidator>;
export type CheckinEventPayload = z.infer<typeof EventValidator>;

const ScanValidator = z.object({
    event_id: z.string().min(1, { message: "Event ID cannot be empty" }),
    qrCode: z.string().min(1, { message: "QR Code cannot be empty" }),
});

const MerchScanValidator = z.object({
    qrCode: z.string().min(1, { message: "QR Code cannot be empty" }),
});

const EventValidator = z.object({
    event_id: z.string().min(1, { message: "Event ID cannot be empty" }),
    user_id: z.string().min(1, { message: "User ID cannot be empty" }),
});

export { ScanValidator, MerchScanValidator, EventValidator };
