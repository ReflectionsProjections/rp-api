import express, { NextFunction } from "express";
import { Request, Response } from 'express';
import { StatusCodes } from "http-status-codes";
import { Config } from "./config";
import { connectToDatabase } from "./utilities";

import bodyParser from "body-parser";
import morgan from "morgan";
import authRouter from "./services/auth/auth-router";

const app = express();

// to prevent server-side caching/returning status code 200
// (we can remove this later)
app.disable("etag");

// To display the logs every time
app.use("/", morgan("dev"));

app.use("/", bodyParser.json());

app.use("/auth", authRouter);

app.get("/status", (_, res) => {
    console.log(StatusCodes.OK);
    return res.status(StatusCodes.OK).send("API is alive!");
});

app.use("/", (_, res) => {
    return res.status(StatusCodes.NOT_FOUND).send("No endpoint here!");
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("IN HERE", err.stack);
  return res.status(500).send('Something broke!');
});

app.listen(Config.DEFAULT_APP_PORT, async () => {
    await connectToDatabase();
    console.log("Server is listening on port 3000...");
});
