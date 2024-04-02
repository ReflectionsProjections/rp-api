import { Router } from "express";
import { Database } from "../database";
import { StatusCodes } from "http-status-codes";
import { createId } from "@paralleldrive/cuid2";

const authRouter = Router();

authRouter.get("/", async (req, res) => {
});

authRouter.post("/", async (req, res, next) => {
});

export default authRouter;