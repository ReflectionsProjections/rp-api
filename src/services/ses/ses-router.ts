import { Request, Response, Router } from "express";
import RoleChecker from "../../middleware/role-checker";
import { StatusCodes } from "http-status-codes";
import { Role } from "../auth/auth-models";
import { sendEmail } from "./ses-utils";

const sesRouter: Router = Router();

//Takes in a list of emails and sends a test email to each of them
//Will change this to take in a template_id later
//The template_id and substitutions will all be done locally
sesRouter.post(
    "/email",
    RoleChecker([Role.enum.STAFF], true),
    async (req: Request, res: Response) => {
        if (!req.body.emailList) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ error: "Invalid Params" });
        }

        const emailList: string[] = req.body.emailList;
        const emailPromises: Promise<void>[] = [];
        for (let i = 0; i < emailList.length; i++) {
            const params = {
                Destination: {
                    ToAddresses: [emailList[i]],
                },
                Message: {
                    Body: {
                        Text: {
                            Data: "Hello from SES!",
                        },
                    },
                    Subject: {
                        Data: `Test Email ${i}`,
                    },
                },
                Source: "no-reply@reflectionsprojections.org",
            };

            emailPromises.push(
                sendEmail(params)
                    .then(() => {})
                    .catch((err) => {
                        console.error(
                            `Error sending email ${i + 1}:`,
                            err.message
                        );
                    })
            );
        }

        Promise.all(emailPromises)
            .then(() => {
                return res
                    .status(StatusCodes.OK)
                    .send("All emails sent successfully");
            })
            .catch((err) => {
                console.error("Error sending emails:", err.message);
                return res
                    .status(StatusCodes.INTERNAL_SERVER_ERROR)
                    .send("Internal Server Error");
            });
    }
);

export default sesRouter;
