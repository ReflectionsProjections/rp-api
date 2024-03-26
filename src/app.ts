import express from "express";
import { Config } from "./config";
import { connectToDatabase } from "./utilities";
import { StatusCodes } from "http-status-codes";

import authRouter from "./services/auth/auth-router";

const app = express();

app.use("/auth", authRouter);

app.get("/status", (_, res) => {
    return res.status(StatusCodes.OK).send("API is alive!");
});

app.use("/", (_, res) => {
    return res.status(StatusCodes.NOT_FOUND).send("No endpoint here!");
});

app.listen(Config.DEFAULT_APP_PORT, async () => {
    await connectToDatabase();
    console.log("Server is listening on port 3000...");
});
