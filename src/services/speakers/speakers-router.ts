import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SpeakerValidator } from "./speakers-schema";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";

const speakersRouter = Router();

// Get all speakers
speakersRouter.get("/", RoleChecker([], true), async (req, res, next) => {
    try {
        const speakers = await Database.SPEAKERS.find();
        return res.status(StatusCodes.OK).json(speakers);
    } catch (error) {
        next(error);
    }
});

// Get a specific speaker
speakersRouter.get(
    "/:SPEAKERID",
    RoleChecker([], true),
    async (req, res, next) => {
        const speakerId = req.params.SPEAKERID;

        try {
            const speaker = await Database.SPEAKERS.findOne({ speakerId });

            if (!speaker) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "DoesNotExist" });
            }

            return res.status(StatusCodes.OK).json(speaker);
        } catch (error) {
            next(error);
        }
    }
);

// Create a new speaker
speakersRouter.post(
    "/",
    RoleChecker([Role.Enum.STAFF]),
    async (req, res, next) => {
        try {
            const validatedData = SpeakerValidator.parse(req.body);
            const speaker = new Database.SPEAKERS(validatedData);
            await speaker.save();
            return res.status(StatusCodes.CREATED).json(speaker);
        } catch (error) {
            next(error);
        }
    }
);

// Update a speaker
speakersRouter.put(
    "/:SPEAKERID",
    RoleChecker([Role.Enum.STAFF]),
    async (req, res, next) => {
        const speakerId = req.params.SPEAKERID;

        try {
            const validatedData = SpeakerValidator.parse(req.body);
            const speaker = await Database.SPEAKERS.findOneAndUpdate(
                { speakerId },
                { $set: validatedData },
                { new: true, runValidators: true }
            );

            if (!speaker) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "DoesNotExist" });
            }

            return res.status(StatusCodes.OK).json(speaker);
        } catch (error) {
            next(error);
        }
    }
);

// Delete a speaker
speakersRouter.delete(
    "/:SPEAKERID",
    RoleChecker([Role.Enum.STAFF]),
    async (req, res, next) => {
        const speakerId = req.params.SPEAKERID;

        try {
            await Database.SPEAKERS.findOneAndDelete({ speakerId });

            return res.sendStatus(StatusCodes.NO_CONTENT);
        } catch (error) {
            next(error);
        }
    }
);

export default speakersRouter;
