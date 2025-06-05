import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SpeakerValidator } from "./speakers-schema";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";

const speakersRouter = Router();

// Get all speakers
speakersRouter.get("/", RoleChecker([], true), async (req, res) => {
    const speakers = await Database.SPEAKERS.find();
    return res.status(StatusCodes.OK).json(speakers);
});

// Get a specific speaker
speakersRouter.get("/:SPEAKERID", RoleChecker([], true), async (req, res) => {
    const speakerId = req.params.SPEAKERID;

    const speaker = await Database.SPEAKERS.findOne({ speakerId });

    if (!speaker) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ error: "DoesNotExist" });
    }

    return res.status(StatusCodes.OK).json(speaker);
});

// Create a new speaker
speakersRouter.post(
    "/",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const validatedData = SpeakerValidator.parse(req.body);

        const existingSpeaker = await Database.SPEAKERS.findOne({
            speakerId: validatedData.speakerId,
        });

        if (existingSpeaker) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ error: "UserAlreadyExists" });
        }

        const speaker = new Database.SPEAKERS(validatedData);
        await speaker.save();
        return res.status(StatusCodes.CREATED).json(speaker);
    }
);

// Update a speaker
speakersRouter.put(
    "/:SPEAKERID",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const speakerId = req.params.SPEAKERID;

        const validatedData = SpeakerValidator.parse(req.body);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { speakerId: _, ...updateData } = validatedData; // omit speakerId from validatedData to prevent it from overwritting

        const speaker = await Database.SPEAKERS.findOneAndUpdate(
            { speakerId: speakerId },
            { $set: updateData }, // updates all fields besides speakerId
            { new: true, runValidators: true }
        );

        if (!speaker) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        return res.status(StatusCodes.OK).json(speaker);
    }
);

// Delete a speaker
speakersRouter.delete(
    "/:SPEAKERID",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const speakerId = req.params.SPEAKERID;

        const deletedSpeaker = await Database.SPEAKERS.findOneAndDelete({
            speakerId,
        });
        if (!deletedSpeaker) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        return res.sendStatus(StatusCodes.NO_CONTENT);
    }
);

export default speakersRouter;
