import { Router } from "express";
import { Database } from "../../database";
import { StatusCodes } from "http-status-codes";

const authRouter = Router();

authRouter.get("/", async (req, res) => {
    const newVal = await Database.ROLES.findOneAndUpdate(
        { email: "aydanpirani@gmail.com" },
        { email: "aydanpirani@gmail.com", roles: [] },
        { upsert: true, new: true }
    );
    return res.status(StatusCodes.OK).send(newVal);
});

export default authRouter;
