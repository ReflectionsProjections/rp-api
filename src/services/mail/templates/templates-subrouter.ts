import { Router } from "express";
import RoleChecker from "../../../middleware/role-checker";
import { Role } from "../../auth/auth-models";
import { Database } from "../../../database";
import { StatusCodes } from "http-status-codes";
import { TemplateValidator } from "./templates-schema";
import { z } from "zod";

type TemplateData = z.infer<typeof TemplateValidator>;

const templatesSubRouter = Router();

templatesSubRouter.get(
    "/",
    RoleChecker([Role.Values.STAFF]),
    async (req, res) => {
        const templates = await Database.TEMPLATES.find();
        const cleanedTemplates = templates.map((x) => x.toObject());
        return res.status(StatusCodes.OK).json(cleanedTemplates);
    }
);

templatesSubRouter.post(
    "/",
    RoleChecker([Role.Values.ADMIN]),
    async (req, res) => {
        try {
            const templateData = TemplateValidator.parse(req.body);
            await Database.TEMPLATES.create(templateData);
            return res.sendStatus(StatusCodes.CREATED);
        } catch (error) {
            return res.status(StatusCodes.BAD_REQUEST).send(error);
        }
    }
);

templatesSubRouter.delete(
    "/:TEMPLATEID",
    RoleChecker([Role.Values.ADMIN]),
    async (req, res) => {
        try {
            const templateId = req.params.TEMPLATEID;
            const templateData = (await Database.TEMPLATES.findOne({
                templateId: templateId,
            })) as TemplateData;

            if (!templateData) {
                return res
                    .status(StatusCodes.BAD_REQUEST)
                    .json({ error: "NoSuchId" });
            }
        } catch (error) {
            return res.status(StatusCodes.BAD_REQUEST).send(error);
        }
    }
);

export default templatesSubRouter;
