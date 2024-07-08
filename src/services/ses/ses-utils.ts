import { CreateTemplateCommand } from "@aws-sdk/client-ses";

export const createCreateTemplateCommand = () => {
    return new CreateTemplateCommand({
        Template: {
            TemplateName: "tester_template",
            HtmlPart: `
          <h1>Hello, {{contact.firstName}}!</h1>
          <p>
          Did you know Amazon has a mascot named Peccy?
          </p>
        `,
            SubjectPart: "Amazon Tip",
        },
    });
};
