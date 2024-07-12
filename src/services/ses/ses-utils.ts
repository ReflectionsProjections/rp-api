import { sendEmailParams } from "./ses-formats.js";
import { ses } from "../../config";

export function sendEmail(
    params: sendEmailParams
): Promise<AWS.SES.SendEmailResponse> {
    return ses.sendEmail(params).promise();
}
