import express from "express";
import { StatusCodes } from "http-status-codes";
import { Config } from "./config";
import { connectToDatabase } from "./utilities";

import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import errorHandler from "./middleware/error-handler";

import authRouter from "./services/auth/auth-router";
import subscriptionRouter from "./services/subscription/subscription-router";

import attendeeRouter from "./services/attendees/attendee-router";
import eventRouter from "./services/events/event-router";

const app = express();

// to prevent server-side caching/returning status code 200
// (we can remove this later)
app.disable("etag");

app.use(cors());

// To display the logs every time
app.use("/", morgan("dev"));

app.use("/", bodyParser.json());

// API routes
app.use("/auth", authRouter);
app.use("/attendee", attendeeRouter);
app.use("/event", eventRouter);

app.get("/status", (_, res) => {
    return res.status(StatusCodes.OK).send("API is alive!");
});

app.use("/", (_, res) => {
    return res.status(StatusCodes.NOT_FOUND).send("No endpoint here!");
});

app.use(errorHandler);

app.listen(Config.DEFAULT_APP_PORT, async () => {
    await connectToDatabase();
    process.send?.("ready");
    console.log("Server is listening on port 3000...");
});
