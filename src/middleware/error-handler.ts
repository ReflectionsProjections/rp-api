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

    // Handle Postgres unique violation errors
    if (err && typeof err === 'object' && 'code' in err && err.code === "23505") {
        return res.status(StatusCodes.BAD_REQUEST).json({
            error: "UserAlreadyExists",
        });
    }

    console.error("ERROR", err.stack);
    return res.status(500).send({
        error: "InternalError",
    });
}

export default errorHandler;
