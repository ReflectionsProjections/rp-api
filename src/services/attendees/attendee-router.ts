import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { AttendeeValidator } from "./attendee-schema";
import { AttendeeModel } from "./attendee-schema";

const attendeeRouter = Router();

// Create a new attendee
attendeeRouter.post("/", async (req, res) => {
    try {
        const { name, email } = AttendeeValidator.parse(req.body);
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
attendeeRouter.get("/:email", async (req, res) => {
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

export default attendeeRouter;
