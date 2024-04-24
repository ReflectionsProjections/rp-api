import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000,
    message: "Too many requests from this IP at this time, try again later!",
});

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
        next();
    } else {
        limiter(req, res, next);
    }
};
