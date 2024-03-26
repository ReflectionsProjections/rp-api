import { NextFunction, Request, Response } from "express";

// TODO: Fix this function
function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    next: NextFunction
) {
    console.error("IN HERE", err.stack);
    return res.status(500).send("Something broke!");
}

export default errorHandler;
