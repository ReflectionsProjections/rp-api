import express from "express";
import { StatusCodes } from "http-status-codes";
import { Config } from "./config";
import { rateLimiter } from "./middleware/rateLimiter";
import { isTest } from "./utilities";
import AWS from "aws-sdk";

import databaseMiddleware from "./middleware/database-middleware";
import customCors from "./middleware/cors-middleware";
import morgan from "morgan";
import bodyParser from "body-parser";
import errorHandler from "./middleware/error-handler";

import attendeeRouter from "./services/attendee/attendee-router";
import checkinRouter from "./services/checkin/checkin-router";
import authRouter from "./services/auth/auth-router";
import eventsRouter from "./services/events/events-router";
import notificationsRouter from "./services/notifications/notifications-router";
import registrationRouter from "./services/registration/registration-router";
import s3Router from "./services/s3/s3-router";
import statsRouter from "./services/stats/stats-router";
import subscriptionRouter from "./services/subscription/subscription-router";
import speakersRouter from "./services/speakers/speakers-router";
// import sponsorRouter from "./services/sponsor/sponsor-router";

AWS.config.update({
    region: Config.S3_REGION,
    accessKeyId: Config.S3_ACCESS_KEY,
    secretAccessKey: Config.S3_SECRET_KEY,
});

const app = express();

// to prevent server-side caching/returning status code 200
// (we can remove this later)
app.disable("etag");

app.use(rateLimiter);

app.use(customCors);

// To display the logs every time
app.use("/", morgan("dev"));

app.use("/", bodyParser.json());

// API routes
app.use("/attendee", databaseMiddleware, attendeeRouter);
app.use("/auth", databaseMiddleware, authRouter);
app.use("/checkin", databaseMiddleware, checkinRouter);
app.use("/events", databaseMiddleware, eventsRouter);
app.use("/notifications", databaseMiddleware, notificationsRouter);
app.use("/registration", databaseMiddleware, registrationRouter);
app.use("/s3", databaseMiddleware, s3Router);
app.use("/stats", databaseMiddleware, statsRouter);
app.use("/subscription", databaseMiddleware, subscriptionRouter);
app.use("/speakers", databaseMiddleware, speakersRouter);
// app.use("/sponsor", databaseMiddleware, sponsorRouter);

app.get("/status", (_, res) => {
    return res.status(StatusCodes.OK).send("API is alive!");
});

app.use("/", (_, res) =>
    res.status(StatusCodes.NOT_FOUND).send("No endpoint here!")
);

app.use(errorHandler);

if (!isTest()) {
    app.listen(Config.DEFAULT_APP_PORT, async () => {
        process.send?.("ready");
        console.log("Server is listening on port 3000...");
    });
}
export default app;
