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

// const makeError = (code: string) =>
//     ErrorSchema.extend({
//         error: z.literal(code),
//     });

// registry.register("DoesNotExistError", makeError("DoesNotExist"));
