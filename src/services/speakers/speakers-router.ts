import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SpeakerValidator, UpdateSpeakerValidator } from "./speakers-schema";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { SupabaseDB } from "../../database";

const speakersRouter = Router();

/**
 * @swagger
 * /speakers/:
 *   get:
 *     summary: Get all speakers
 *     description: |
 *       Returns a list of all speakers.
 *
 *       **Required roles: none**
 *     tags: [Speakers]
 *     responses:
 *       200:
 *         description: A list of all speakers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SpeakerValidator'
 *     security: []
 */
speakersRouter.get("/", RoleChecker([], true), async (req, res) => {
    const { data: speakers } =
        await SupabaseDB.SPEAKERS.select("*").throwOnError();

    return res.status(StatusCodes.OK).json(speakers);
});

/**
 * @swagger
 * /speakers/{SPEAKERID}:
 *   get:
 *     summary: Get a speaker by id
 *     description: |
 *       Returns a single speaker by their id.
 *
 *       **Required roles: none**
 *     tags: [Speakers]
 *     parameters:
 *       - name: SPEAKERID
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The requested speaker
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SpeakerValidator'
 *       404:
 *         description: Couldn't find the requested speaker
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoesNotExistError'
 *     security: []
 */
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

/**
 * @swagger
 * /speakers/:
 *   post:
 *     summary: Create a speaker
 *     description: |
 *       Creates a new speaker and adds them to the database.
 *
 *       **Required roles: ADMIN | STAFF**
 *     tags: [Speakers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SpeakerValidator'
 *     responses:
 *       201:
 *         description: The newly created speaker
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SpeakerValidator'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /speakers/{SPEAKERID}:
 *   put:
 *     summary: Update a speaker
 *     description: |
 *       Updates the data for a pre-existing speaker.
 *
 *       **Required roles: ADMIN | STAFF**
 *     tags: [Speakers]
 *     parameters:
 *       - name: SPEAKERID
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSpeakerValidator'
 *     responses:
 *       200:
 *         description: The updated speaker
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SpeakerValidator'
 *       404:
 *         description: Couldn't find the requested speaker
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoesNotExistError'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /speakers/{SPEAKERID}:
 *   delete:
 *     summary: Delete a speaker
 *     description: |
 *       Deletes a speaker entry from the database.
 *
 *       **Required roles: ADMIN | STAFF**
 *     tags: [Speakers]
 *     parameters:
 *       - name: SPEAKERID
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: The speaker was successfully deleted
 *       404:
 *         description: Couldn't find the requested speaker
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoesNotExistError'
 *     security:
 *       - bearerAuth: []
 */
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
