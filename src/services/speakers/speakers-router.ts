import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SpeakerValidator, UpdateSpeakerValidator } from "./speakers-schema";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { SupabaseDB } from "../../supabase";

const speakersRouter = Router();

// Get all speakers
speakersRouter.get("/", RoleChecker([], true), async (req, res) => {
    const { data: speakers } =
        await SupabaseDB.SPEAKERS.select("*").throwOnError();

    return res.status(StatusCodes.OK).json(speakers);
});

// Get a specific speaker
speakersRouter.get("/:SPEAKERID", RoleChecker([], true), async (req, res) => {
    const speakerId = req.params.SPEAKERID;

    const { data: speaker } = await SupabaseDB.SPEAKERS.select("*")
        .eq("speakerId", speakerId)
        .maybeSingle()
        .throwOnError();

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

        const { data: newSpeaker } = await SupabaseDB.SPEAKERS.insert(
            validatedData
        )
            .select()
            .single()
            .throwOnError();

        return res.status(StatusCodes.CREATED).json(newSpeaker);
    }
);

// Update a speaker
speakersRouter.put(
    "/:SPEAKERID",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const speakerId = req.params.SPEAKERID;
        const validatedData = UpdateSpeakerValidator.parse(req.body);

        const { data: updatedSpeaker } = await SupabaseDB.SPEAKERS.update(
            validatedData
        )
            .eq("speakerId", speakerId)
            .select()
            .maybeSingle()
            .throwOnError();

        if (!updatedSpeaker) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        return res.status(StatusCodes.OK).json(updatedSpeaker);
    }
);

// Delete a speaker
speakersRouter.delete(
    "/:SPEAKERID",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const speakerId = req.params.SPEAKERID;

        const { data: deletedSpeaker } = await SupabaseDB.SPEAKERS.delete()
            .eq("speakerId", speakerId)
            .select()
            .maybeSingle()
            .throwOnError();

        if (!deletedSpeaker) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        return res.sendStatus(StatusCodes.NO_CONTENT);
    }
);

export default speakersRouter;
