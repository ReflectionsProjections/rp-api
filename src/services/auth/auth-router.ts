import { Router } from "express";
import { Database } from "../../database";
import { StatusCodes } from "http-status-codes";
import { Role } from "./auth-schema";
import { createId } from "@paralleldrive/cuid2";

const authRouter = Router();

authRouter.get("/", async (req, res) => {
    const result = (await Database.ROLES.find());
    const mappedResult = result.map(item => item.toObject())
    return res.status(StatusCodes.OK).send(mappedResult);
});

authRouter.post("/", async (_, res, next) => {
    const user = {
        userId: createId(),
        roles: [Role.Enum.USER],
    };
    
    try {
        const result = (await Database.ROLES.create(user)).toObject();
        return res.status(StatusCodes.CREATED).send(result);
    } catch (err) {
        next(err);
    }
});

export default authRouter;
