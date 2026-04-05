import {
    extendZodWithOpenApi,
    OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import z from "zod";
// add .openapi to zod objects
extendZodWithOpenApi(z);
// create an openapi registry to register schemas to
export const registry = new OpenAPIRegistry();

// add an error type to the registry
export const ErrorSchema = registry.register(
    "Error",
    z
        .object({
            error: z.string(),
        })
        .openapi("Error")
);

// const makeError = (code: string, example?: string) =>
//     ErrorSchema.extend({
//         error: z.literal(code),
//     }).openapi({
//         example: { error: example ?? code },
//     });

// registry.register("DoesNotExistError", makeError("DoesNotExist"));
// registry.register("UserNotFoundError", makeError("UserNotFound"));
// registry.register("EventNotFoundError", makeError("EventNotFound"));
// registry.register(
//     "TierAlreadyRedeemedError",
//     makeError("Tier already redeemed")
// );
// registry.register(
//     "UserTierTooLowError",
//     makeError("User tier too low for redemption")
// );
