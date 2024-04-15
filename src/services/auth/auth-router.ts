import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { createId } from "@paralleldrive/cuid2";
import { Database } from "../../database";
import { Role } from "./auth-schema";

const authRouter = Router();

authRouter.get("/", async (req, res) => {
    const result = await Database.ROLES.find();
    const mappedResult = result.map((item) => item.toObject());
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
