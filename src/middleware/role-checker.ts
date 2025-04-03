import { NextFunction, Request, Response } from "express";
import { JwtPayloadValidator, Role } from "../services/auth/auth-models";
import { z } from "zod";
import jsonwebtoken, { TokenExpiredError } from "jsonwebtoken";
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
                return next();
            }

            return res.status(StatusCodes.UNAUTHORIZED).json({ error: "NoJWT" });
        }

        let payloadData;
        try {
            payloadData = jsonwebtoken.verify(
                jwt,
                Config.JWT_SIGNING_SECRET
            );
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                return res.status(StatusCodes.FORBIDDEN).json({ error: "ExpiredJWT" });
            }

            return res.status(StatusCodes.UNAUTHORIZED).json({ error: "InvalidJWT" });
        }

        try {
            const payload = JwtPayloadValidator.parse(payloadData);
            res.locals.payload = payload;

            const error = new Error("InvalidRoles");
            const userRoles = payload.roles;

            if (weakVerification) {
                return next();
            }

            if (requiredRoles.length == 0) {
                return next();
            }

            // Admins and staff can access any endpoint
            if (
                userRoles.includes(Role.Enum.ADMIN) ||
                userRoles.includes(Role.Enum.STAFF)
            ) {
                return next();
            }

            // PuzzleBang JWT can access puzzlebang endpoints
            if (requiredRoles.includes(Role.Enum.PUZZLEBANG)) {
                if (userRoles.includes(Role.Enum.PUZZLEBANG)) {
                    return next();
                }
            }

            // Corporate role can access corporate only endpoints
            if (requiredRoles.includes(Role.Enum.CORPORATE)) {
                if (userRoles.includes(Role.Enum.CORPORATE)) {
                    return next();
                }
            }

            // Need to be a user to access user endpoints (app users)
            if (requiredRoles.includes(Role.Enum.USER)) {
                if (userRoles.includes(Role.Enum.USER)) {
                    return next();
                }
            }

            throw error;
        } catch (error) {
            next(error);
        }
    };
}
