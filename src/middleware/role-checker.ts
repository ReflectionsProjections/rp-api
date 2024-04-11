import { NextFunction, Request, Response } from "express";
import { JwtPayloadValidator, Role } from "../services/auth/auth-models";
import { z } from "zod";
import jsonwebtoken from "jsonwebtoken";
import { Config } from "../config";
import { StatusCodes } from "http-status-codes";

export default function RoleChecker(
    requiredRoles: z.infer<typeof Role>[],
    weakVerification: boolean = false
) {
    return function (req: Request, res: Response, next: NextFunction) {
        const jwt = req.headers.authorization;

        if (jwt == undefined) {
            if (weakVerification) {
                next();
            }

            return res.status(StatusCodes.BAD_REQUEST).json({ error: "NoJWT" });
        }

        try {
            const payloadData = jsonwebtoken.verify(
                jwt,
                Config.JWT_SIGNING_SECRET
            );

            const payload = JwtPayloadValidator.parse(payloadData);
            res.locals.payload = payload;

            const error = new Error("InvalidRoles");
            const userRoles = payload.roles;

            if (weakVerification) {
                next();
            }

            if (requiredRoles.length == 0) {
                next();
            }

            // Admins (staff) can access any endpoint
            if (userRoles.includes(Role.Enum.ADMIN)) {
                next();
            }

            // Corporate role can access corporate only endpoints
            if (requiredRoles.includes(Role.Enum.CORPORATE)) {
                if (userRoles.includes(Role.Enum.CORPORATE)) {
                    next();
                }
            }

            // Need to be a user to access user endpoints (app users)
            if (requiredRoles.includes(Role.Enum.USER)) {
                if (userRoles.includes(Role.Enum.USER)) {
                    next();
                }
            }

            throw error;
        } catch (error) {
            next(error);
        }
    };
}
