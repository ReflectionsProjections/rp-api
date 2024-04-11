import { NextFunction } from "express";
import { Role } from "../services/auth/auth-schema";
import {z} from "zod";

export default function RoleChecker(req: Request, res: Response, next: NextFunction) {
    const jwt = req.headers.get("authorization");
    console.log(jwt);

    return function (requiredRoles: z.infer<typeof Role>[], weakVerification: boolean = false) {
        console.log("in here")
        next()
    }
}