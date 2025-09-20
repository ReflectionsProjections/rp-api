import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Config, EnvironmentEnum } from "./config";
import { isTest } from "./utilities";
import "./firebase";
import jsonwebtoken, { TokenExpiredError } from "jsonwebtoken";

// import databaseMiddleware from "./middleware/database-middleware";
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
import shiftsRouter from "./services/shifts/shifts-router";
import leaderboardRouter from "./services/leaderboard/leaderboard-router";

import cors from "cors";
import { JwtPayloadValidator } from "./services/auth/auth-models";

const app = express();
app.enable("trust proxy");

// to prevent server-side caching/returning status code 200
// (we can remove this later)
app.disable("etag");

// app.use(rateLimiter);

// app.use(customCors);
app.use(cors());

// Logs
if (Config.ENV != EnvironmentEnum.TESTING) {
    morgan.token("userid", (req, _res) => {
        const jwt = req.headers.authorization;
        if (!jwt) {
            return "unauthorized";
        }

        try {
            const payloadData = jsonwebtoken.verify(
                jwt,
                Config.JWT_SIGNING_SECRET
            );
            const payload = JwtPayloadValidator.parse(payloadData);
            return payload.userId;
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                return "expired-token";
            }

            return "invalid-token";
        }
    });

    app.use(
        morgan(
            ':remote-addr - :remote-user :userid ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
        )
    );
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
app.use("/leaderboard", leaderboardRouter);
app.use("/notifications", notificationsRouter);
app.use("/puzzlebang", puzzlebangRouter);
app.use("/registration", registrationRouter);
app.use("/s3", s3Router);
app.use("/stats", statsRouter);
app.use("/subscription", subscriptionRouter);
app.use("/speakers", speakersRouter);
app.use("/meetings", meetingsRouter);
app.use("/shifts", shiftsRouter);

const status = (req: Request, res: Response) => {
    return res.status(StatusCodes.OK).send({
        ok: true,
        message: "API is alive!",
        timestamp: new Date().toISOString(),
        environment: Config.ENV,
    });
};
app.get("/status", status);
app.get("/", status);

app.use((req, res) =>
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
