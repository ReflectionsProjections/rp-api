import express from "express";
import { StatusCodes } from "http-status-codes";
import morgan from "morgan";
import bodyParser from "body-parser";
import { Config } from "./config";
import { connectToDatabase } from "./utilities";
import rateLimit from "express-rate-limit";

import errorHandler from "./middleware/error-handler";

import authRouter from "./services/auth/auth-router";

const app = express();

// to prevent server-side caching/returning status code 200
// (we can remove this later)
app.disable("etag");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    message: "Too many requests from this IP at this time, try again later!",
});

app.use(limiter);

// To display the logs every time
app.use("/", morgan("dev"));

app.use("/", bodyParser.json());

app.use("/auth", authRouter);

app.get("/status", (_, res) => {
    console.log(StatusCodes.OK);
    return res.status(StatusCodes.OK).send("API is alive!");
});

app.use("/", (_, res) =>
    res.status(StatusCodes.NOT_FOUND).send("No endpoint here!")
);

app.use(errorHandler);

app.listen(Config.DEFAULT_APP_PORT, async () => {
    await connectToDatabase();
    console.log("Server is listening on port 3000...");
});
