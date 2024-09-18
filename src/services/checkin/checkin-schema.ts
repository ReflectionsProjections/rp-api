import { z } from "zod";

const ScanValidator = z.object({
    eventId: z.string(),
    qrCode: z.string(),
});

const MerchScanValidator = z.object({
    qrCode: z.string(),
});

const EventValidator = z.object({
    eventId: z.string(),
    userId: z.string(),
});

export { ScanValidator, MerchScanValidator, EventValidator };
