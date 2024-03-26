import { Router } from "express";
import { Database } from "../../database";
import { StatusCodes } from "http-status-codes";
import { Role } from "./auth-schema";
import { createId } from "@paralleldrive/cuid2";

const authRouter = Router();

authRouter.get("/", async (req, res) => {
    const body = req.body;
    console.log(body);
    return res.status(StatusCodes.OK).send(body);
});

authRouter.post("/", async (_, res) => {
    const user = {
        userId: createId(),
        roles: [Role.Enum.USER],
    };

    const result = (await Database.ROLES.create(user)).toObject();
    if (!result) {
        return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(StatusCodes.CREATED).send(result);
});

export default authRouter;
