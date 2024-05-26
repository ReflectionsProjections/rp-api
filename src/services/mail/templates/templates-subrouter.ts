import { Router } from "express";
import RoleChecker from "../../../middleware/role-checker";
import { Role } from "../../auth/auth-models";
import { Database } from "../../../database";
import { StatusCodes } from "http-status-codes";
import { TemplateValidator } from "./templates-schema";
import { z } from "zod";
import { Config } from "../../../config";

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
            let templateData = TemplateValidator.parse(req.body);
            let substitutions = templateData.content.matchAll(Config.MAIL_TEMPLATE_REGEX)
            const subVars = Array.from(substitutions, substitutions => substitutions[1]);

            await Database.TEMPLATES.create({...templateData, substitutions: subVars});
            return res.sendStatus(StatusCodes.CREATED);
        } catch (error) {
            return res.status(StatusCodes.BAD_REQUEST).send(error);
        }
    }
);

templatesSubRouter.put(
    "/",
    RoleChecker([Role.Values.ADMIN]),
    async (req, res) => {
        try {
            let templateData = TemplateValidator.parse(req.body);
            let substitutions = templateData.content.matchAll(Config.MAIL_TEMPLATE_REGEX)
            const subVars = Array.from(substitutions, substitutions => substitutions[1]);

            const updateResult = await Database.TEMPLATES.findOneAndUpdate({templateId: templateData.templateId}, {...templateData, substitutions: subVars});
            
            if (!updateResult) {
                return res.status(StatusCodes.NOT_FOUND).send({error: "NoSuchId"});
            }

            return res.sendStatus(StatusCodes.OK);
        } catch (error) {
            return res.status(StatusCodes.BAD_REQUEST).send(error);
        }
    }
);

templatesSubRouter.get(
    "/:TEMPLATEID",
    RoleChecker([Role.Values.STAFF]),
    async (req, res) => {
        const templateId = req.params.TEMPLATEID;
        const templateInfo = await Database.TEMPLATES.findOne({templateId: templateId});
        if (!templateInfo) {
            return res.status(StatusCodes.NOT_FOUND).send({error: "NoSuchId"});
        }
        return res.status(StatusCodes.OK).json(templateInfo?.toObject());
    }
);

templatesSubRouter.delete(
    "/:TEMPLATEID",
    RoleChecker([Role.Values.ADMIN]),
    async (req, res) => {
        try {
            const templateId = req.params.TEMPLATEID;
            await Database.TEMPLATES.findOneAndDelete({templateId: templateId});
            return res.sendStatus(StatusCodes.NO_CONTENT);

        } catch (error) {
            return res.status(StatusCodes.BAD_REQUEST).send(error);
        }
    }
);

export default templatesSubRouter;
