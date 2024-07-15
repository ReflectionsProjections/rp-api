import { z } from "zod";

const BatchResumeDownloadValidator = z.object({
    userIds: z.string().array(),
});

export default BatchResumeDownloadValidator;
