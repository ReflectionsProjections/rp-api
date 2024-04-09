import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { AttendeeValidator } from "./attendee-schema";
import { Database } from "../../database";

const attendeeRouter = Router();

// Create a new attendee
attendeeRouter.post("/", async (req, res) => {
    try {
        const attendeeData = AttendeeValidator.parse(req.body);
        const attendee = new Database.ATTENDEES(attendeeData);
        await attendee.save();

        return res.status(StatusCodes.CREATED).json(attendeeData);
    } catch (error) {
        console.error("Error:", error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .send("Error creating attendee.");
    }
});

// Check if a user email exists
attendeeRouter.get("/:email", async (req, res) => {
    try {
        const { email } = req.params;

        // Check if the user exists in the database
        const userExists = await Database.ATTENDEES.exists({ email });

        if (!userExists) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .send("User with that email does not exist.");
        }

        const user = await Database.ATTENDEES.findOne({
            email,
        });

        return res.status(StatusCodes.OK).json(user);
    } catch (error) {
        console.error("Error:", error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .send("Internal server error.");
    }
});

export default attendeeRouter;
