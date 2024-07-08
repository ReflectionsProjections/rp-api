import { Request, Response, Router } from "express";
import RoleChecker from "../../middleware/role-checker";
import { StatusCodes } from "http-status-codes";
// import { Config } from "../../config";
import { Role } from "../auth/auth-models";
import { sesClientMiddleware } from "../../middleware/ses";
import { SESClient } from "@aws-sdk/client-ses";
import { createCreateTemplateCommand } from "./ses-utils";

const sesRouter: Router = Router();

sesRouter.post(
    "/template",
    RoleChecker([Role.enum.STAFF], true),
    sesClientMiddleware,
    async (req: Request, res: Response) => {
        const ses = res.locals.sesClient as SESClient;

        const createTemplateCommand = createCreateTemplateCommand();
        try {
            ses.send(createTemplateCommand);
            return res.status(StatusCodes.OK);
        } catch (err) {
            console.error("Error creating template", err);
            return res
                .status(StatusCodes.BAD_REQUEST)
                .send({ error: "Error creating template" });
        }
    }
);

sesRouter.post(
    "/email",
    RoleChecker([Role.enum.STAFF], false),
    sesClientMiddleware,
    async (req: Request, res: Response) => {
        //recipients (by userid)
        //template
        //data
        //idk
        //we'll have a function to send mail
        //individually given the data

        //we could have a template and then
        //for the sub values j follow
        //assumes we're grabbing from the attendee
        //profile
        //ex
        //sub values = ["name", "points"]
        // ... etc
        //which will have to match the template {{name}}, {{points}}

        // const userId: string = req.params.USERID;
        // const ses = res.locals.ses as SESClient;

        return res.status(StatusCodes.OK).send({ ok: "ok!" });
    }
);

export default sesRouter;
