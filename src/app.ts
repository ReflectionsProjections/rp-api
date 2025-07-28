import express from "express";
import { StatusCodes } from "http-status-codes";
import { Config, EnvironmentEnum } from "./config";
import { isTest } from "./utilities";
import AWS from "aws-sdk";

//import databaseMiddleware from "./middleware/database-middleware";
// import customCors from "./middleware/cors-middleware";
import morgan from "morgan";
import bodyParser from "body-parser";
import errorHandler from "./middleware/error-handler";

import attendeeRouter from "./services/attendee/attendee-router";
import staffRouter from "./services/staff/staff-router";
import checkinRouter from "./services/checkin/checkin-router";
import authRouter from "./services/auth/auth-router";
import eventsRouter from "./services/events/events-router";
import notificationsRouter from "./services/notifications/notifications-router";
import registrationRouter from "./services/registration/registration-router";
import s3Router from "./services/s3/s3-router";
import statsRouter from "./services/stats/stats-router";
import subscriptionRouter from "./services/subscription/subscription-router";
import speakersRouter from "./services/speakers/speakers-router";
import puzzlebangRouter from "./services/puzzlebang/puzzlebang-router";
import meetingsRouter from "./services/meetings/meetings-router";

import cors from "cors";

AWS.config.update({
    region: Config.S3_REGION,
    accessKeyId: Config.S3_ACCESS_KEY,
    secretAccessKey: Config.S3_SECRET_KEY,
});

const app = express();
app.enable("trust proxy");

// to prevent server-side caching/returning status code 200
// (we can remove this later)
app.disable("etag");

// app.use(rateLimiter);

// app.use(customCors);
app.use(cors());

// Logs
if (Config.ENV !== EnvironmentEnum.TESTING) {
    app.use(morgan("dev"));
}

// Parsing
app.use(bodyParser.json());

// Database
// app.use(databaseMiddleware);

// API routes
app.use("/attendee", attendeeRouter);
app.use("/staff", staffRouter);
app.use("/auth", authRouter);
app.use("/checkin", checkinRouter);
app.use("/events", eventsRouter);
app.use("/notifications", notificationsRouter);
app.use("/puzzlebang", puzzlebangRouter);
app.use("/registration", registrationRouter);
app.use("/s3", s3Router);
app.use("/stats", statsRouter);
app.use("/subscription", subscriptionRouter);
app.use("/speakers", speakersRouter);
app.use("/meetings", meetingsRouter);

app.get("/status", (req, res) => {
    return res.status(StatusCodes.OK).send({
        ok: true,
        message: "API is alive!",
    });
});

app.use("/", (req, res) =>
    res.status(StatusCodes.NOT_FOUND).send({
        error: "EndpointNotFound",
    })
);

app.use(errorHandler);

if (!isTest()) {
    app.listen(Config.DEFAULT_APP_PORT, async () => {
        process.send?.("ready");
        console.log("Server is listening on port 3000...");
    });
}
export default app;
