import {
    extendZodWithOpenApi,
    OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import z from "zod";
// add .openapi to zod objects
extendZodWithOpenApi(z);
// create an openapi registry to register schemas to
export const registry = new OpenAPIRegistry();
