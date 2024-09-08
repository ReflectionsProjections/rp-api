import { ses, Config } from "../../config";

export function sendManyEmails(
    emailIds: string[],
    subject: string,
    emailBody: string
): Promise<AWS.SES.SendEmailResponse>[] {
    const emailPromises: Promise<AWS.SES.SendEmailResponse>[] = [];
    for (let i = 0; i < emailIds.length; i++) {
        emailPromises.push(sendEmail(emailIds[i], subject, emailBody));
    }
    return emailPromises;
}

export function sendEmail(
    emailId: string,
    subject: string,
    emailBody: string
): Promise<AWS.SES.SendEmailResponse> {
    return ses
        .sendEmail({
            Destination: {
                ToAddresses: [emailId],
            },
            Message: {
                Body: {
                    Text: {
                        Data: emailBody,
                    },
                },
                Subject: {
                    Data: subject,
                },
            },
            Source: Config.OUTGOING_EMAIL_ADDRESSES.Enum[
                "no-reply@reflectionsprojections.org"
            ],
        })
        .promise();
}

export function sendHTMLEmail(
    emailId: string,
    subject: string,
    emailHtml: string
): Promise<AWS.SES.SendEmailResponse> {
    return ses
        .sendEmail({
            Destination: {
                ToAddresses: [emailId],
            },
            Message: {
                Body: {
                    Html: {
                        Data: emailHtml,
                    },
                },
                Subject: {
                    Data: subject,
                },
            },
            Source: Config.OUTGOING_EMAIL_ADDRESSES.Enum[
                "no-reply@reflectionsprojections.org"
            ],
        })
        .promise();
}
