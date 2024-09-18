import { z } from "zod";

const ScanValidator = z.object({
    eventId: z.string(),
    qrCode: z.string(),
});

const MerchScanValidator = z.object({
    qrCode: z.string(),
});

export { ScanValidator, MerchScanValidator };
