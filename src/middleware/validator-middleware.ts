import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";
import { StatusCodes } from "http-status-codes";

export default function validatorMiddleware(validator: ZodObject<any>) {
    return function (req: Request, res: Response, next: NextFunction) {
        try {
            // Validate req.body against the given validator
            const validatedData = validator.parse(req.body);

            // If validation succeeds, replace req.body with the validated data
            req.body = validatedData;

            // Proceed to the next middleware
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // If it's a Zod validation error, format it and send a 400 response
                res.status(StatusCodes.BAD_REQUEST).json({
                    message: "Validation failed",
                    errors: error.errors.map((err) => ({
                        path: err.path.join("."),
                        message: err.message,
                    })),
                });

                throw error;
            } else {
                // For other types of errors, pass to the default error handler
                next(error);
            }
        }
    };
}
