import { ses, Config } from "../../config";
import { SendEmailCommand, SendEmailCommandOutput } from "@aws-sdk/client-ses";

export function sendManyEmails(
    emailIds: string[],
    subject: string,
    emailBody: string
): Promise<SendEmailCommandOutput>[] {
    const emailPromises: Promise<SendEmailCommandOutput>[] = [];
    for (let i = 0; i < emailIds.length; i++) {
        emailPromises.push(sendEmail(emailIds[i], subject, emailBody));
    }
    return emailPromises;
}

export function sendEmail(
    emailId: string,
    subject: string,
    emailBody: string
): Promise<SendEmailCommandOutput> {
    return ses.send(
        new SendEmailCommand({
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
    );
}

export function sendHTMLEmail(
    emailId: string,
    subject: string,
    emailHtml: string
): Promise<SendEmailCommandOutput> {
    return ses.send(
        new SendEmailCommand({
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
    );
}
