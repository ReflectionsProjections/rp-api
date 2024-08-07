import { z } from "zod";

const ScanValidator = z.object({
    eventId: z.string(),
    qrCode: z.string(),
});

export { ScanValidator };
