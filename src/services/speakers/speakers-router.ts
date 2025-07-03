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

    const responseSpeakers = (speakers || []).map((speaker) => ({
        speakerId: speaker.speaker_id,
        name: speaker.name,
        title: speaker.title,
        bio: speaker.bio,
        eventTitle: speaker.event_title,
        eventDescription: speaker.event_description,
        imgUrl: speaker.img_url,
    }));

    return res.status(StatusCodes.OK).json(responseSpeakers);
});

// Get a specific speaker
speakersRouter.get("/:SPEAKERID", RoleChecker([], true), async (req, res) => {
    const speakerId = req.params.SPEAKERID;

    const { data: speaker } = await SupabaseDB.SPEAKERS.select("*")
        .eq("speaker_id", speakerId)
        .maybeSingle()
        .throwOnError();

    if (!speaker) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ error: "DoesNotExist" });
    }

    const responseSpeaker = {
        speakerId: speaker.speaker_id,
        name: speaker.name,
        title: speaker.title,
        bio: speaker.bio,
        eventTitle: speaker.event_title,
        eventDescription: speaker.event_description,
        imgUrl: speaker.img_url,
    };

    return res.status(StatusCodes.OK).json(responseSpeaker);
});

// Create a new speaker
speakersRouter.post(
    "/",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const validatedData = SpeakerValidator.parse(req.body);

        // Map from camelCase to snake_case for the database
        const newSpeakerData = {
            speaker_id: validatedData.speakerId,
            name: validatedData.name,
            title: validatedData.title,
            bio: validatedData.bio,
            event_title: validatedData.eventTitle,
            event_description: validatedData.eventDescription,
            img_url: validatedData.imgUrl,
        };

        const { data: newSpeaker } = await SupabaseDB.SPEAKERS.insert(
            newSpeakerData
        )
            .select()
            .single()
            .throwOnError();

        // Map back from snake_case to camelCase for the API response
        const responseSpeaker = {
            speakerId: newSpeaker.speaker_id,
            name: newSpeaker.name,
            title: newSpeaker.title,
            bio: newSpeaker.bio,
            eventTitle: newSpeaker.event_title,
            eventDescription: newSpeaker.event_description,
            imgUrl: newSpeaker.img_url,
        };

        return res.status(StatusCodes.CREATED).json(responseSpeaker);
    }
);

// Update a speaker
speakersRouter.put(
    "/:SPEAKERID",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const speakerId = req.params.SPEAKERID;
        const validatedData = UpdateSpeakerValidator.parse(req.body);

        // Map from camelCase to snake_case for the database
        const updateDataForDB = {
            name: validatedData.name,
            title: validatedData.title,
            bio: validatedData.bio,
            event_title: validatedData.eventTitle,
            event_description: validatedData.eventDescription,
            img_url: validatedData.imgUrl,
        };

        const { data: updatedSpeaker } = await SupabaseDB.SPEAKERS.update(
            updateDataForDB
        )
            .eq("speaker_id", speakerId)
            .select()
            .maybeSingle()
            .throwOnError();

        if (!updatedSpeaker) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        // Map back from snake_case to camelCase for the API response
        const responseSpeaker = {
            speakerId: updatedSpeaker.speaker_id,
            name: updatedSpeaker.name,
            title: updatedSpeaker.title,
            bio: updatedSpeaker.bio,
            eventTitle: updatedSpeaker.event_title,
            eventDescription: updatedSpeaker.event_description,
            imgUrl: updatedSpeaker.img_url,
        };

        return res.status(StatusCodes.OK).json(responseSpeaker);
    }
);

// Delete a speaker
speakersRouter.delete(
    "/:SPEAKERID",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res) => {
        const speakerId = req.params.SPEAKERID;

        const { data: deletedSpeaker } = await SupabaseDB.SPEAKERS.delete()
            .eq("speaker_id", speakerId)
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
