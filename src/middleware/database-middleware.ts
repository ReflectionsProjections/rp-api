import { Request, Response, NextFunction } from "express";
import { connectToDatabase } from "../utilities";
import { isTest } from "../utilities";

let initialized = false;

export default async function (
    _req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    if (!initialized && !isTest()) {
        initialized = true;
        await connectToDatabase();
    }
    next();
}
