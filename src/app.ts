import express from "express";
import { StatusCodes } from "http-status-codes";
import { Config } from "./config";
import { connectToDatabase } from "./utilities";
import { rateLimiter } from "./middleware/rateLimiter";

import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import errorHandler from "./middleware/error-handler";

import attendeeRouter from "./services/attendees/attendee-router";
import authRouter from "./services/auth/auth-router";
import eventRouter from "./services/events/event-router";
import notificationsRouter from "./services/notifications/notifications-router";
import registrationRouter from "./services/registration/registration-router";
import s3Router from "./services/s3/s3-router";
import subscriptionRouter from "./services/subscription/subscription-router";

const app = express();

// to prevent server-side caching/returning status code 200
// (we can remove this later)
app.disable("etag");

app.use(rateLimiter);

app.use(cors());

// To display the logs every time
app.use("/", morgan("dev"));

app.use("/", bodyParser.json());

// API routes
app.use("/attendee", attendeeRouter);
app.use("/auth", authRouter);
app.use("/event", eventRouter);
app.use("/notifications", notificationsRouter);
app.use("/registration", registrationRouter);
app.use("/s3", s3Router);
app.use("/subscription", subscriptionRouter);

app.get("/status", (_, res) => {
    return res.status(StatusCodes.OK).send("API is alive!");
});

app.use("/", (_, res) =>
    res.status(StatusCodes.NOT_FOUND).send("No endpoint here!")
);

app.use(errorHandler);

app.listen(Config.DEFAULT_APP_PORT, async () => {
    await connectToDatabase();
    process.send?.("ready");
    console.log("Server is listening on port 3000...");
});
