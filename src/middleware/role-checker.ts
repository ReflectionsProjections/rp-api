import { NextFunction, Request, Response } from "express";
import { JwtPayloadValidator, Role } from "../services/auth/auth-models";
import jsonwebtoken, { TokenExpiredError } from "jsonwebtoken";
import { Config } from "../config";
import { StatusCodes } from "http-status-codes";

export default function RoleChecker(
    requiredRoles: Role[],
    weakVerification: boolean = false
) {
    return function (req: Request, res: Response, next: NextFunction) {
        const jwt = req.headers.authorization;

        if (jwt == undefined) {
            if (weakVerification) {
                return next();
            }

            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json({ error: "NoJWT" });
        }

        let payloadData;
        try {
            payloadData = jsonwebtoken.verify(jwt, Config.JWT_SIGNING_SECRET);
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                return res
                    .status(StatusCodes.FORBIDDEN)
                    .json({ error: "ExpiredJWT" });
            }

            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json({ error: "InvalidJWT" });
        }

        const payload = JwtPayloadValidator.parse(payloadData);
        res.locals.payload = payload;

        const userRoles = payload.roles;

        if (weakVerification) {
            return next();
        }

        if (requiredRoles.length == 0) {
            return next();
        }

        const matchingRoles = userRoles.filter((role) =>
            requiredRoles.includes(role)
        );
        if (matchingRoles.length == 0) {
            return res.status(StatusCodes.FORBIDDEN).send({
                error: "Forbidden",
                message: `You require one of the following roles to do that: ${requiredRoles.join(", ")}`,
            });
        }

        return next();
    };
}
