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
