import express from "express";
import { StatusCodes } from "http-status-codes";
import { Config } from "./config";
import { connectToDatabase } from "./utilities";

import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import errorHandler from "./middleware/error-handler";

import authRouter from "./services/auth/auth-router";
import eventRouter from "./services/events/events-router";
import subscriptionRouter from "./services/subscription/subscription-router";

import { CreateAttendeeSchema } from "./services/attendees/attendee-schema";
import { AttendeeModel } from "./services/attendees/attendee-schema";

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
app.use("/event", eventRouter);
app.use("/subscription", subscriptionRouter);

// Create a new attendee
app.post("/attendees", async (req, res) => {
    try {
        const { name, email } = CreateAttendeeSchema.parse(req.body);
        console.log("Name:", name);
        console.log("Email:", email);

        // Save attendee to the database
        const attendee = new AttendeeModel({ name, email });
        await attendee.save();

        res.status(201).send("Attendee created successfully.");
    } catch (error) {
        console.error("Error:", error);
        res.status(400).send("Error creating attendee.");
    }
});

// Check if a user email exists
app.get("/attendees/:email", async (req, res) => {
    try {
        const { email } = req.params;

        // Check if the user exists in the database
        const userExists = await AttendeeModel.exists({ email });

        if (!userExists) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .send("User with that email does not exist.");
        }

        return res.status(StatusCodes.OK).send("User exists.");
    } catch (error) {
        console.error("Error:", error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .send("Internal server error.");
    }
});

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
