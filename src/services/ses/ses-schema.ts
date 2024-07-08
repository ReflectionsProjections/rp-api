import { z } from "zod";

// Zod schema for email requests
const NotificationsValidator = z.object({
    recipients: z.string(),
    template: z.string(),
    //should be able to work out subs from template
});

export { NotificationsValidator };
