import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) {
    if (err instanceof z.ZodError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            error: "BadRequest",
            details: err.errors,
        });
    }

    console.error("ERROR", err.stack);
    return res.status(500).send({
        error: "InternalError",
    });
}

export default errorHandler;
