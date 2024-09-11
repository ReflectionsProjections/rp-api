import { Router } from "express";
import { Database } from "../../../database";
import { StatusCodes } from "http-status-codes";
import { sendHTMLEmail } from "../../ses/ses-utils";
import jsonwebtoken from "jsonwebtoken";
import { Config } from "../../../config";
import { Role } from "../../auth/auth-models";
import mustache from "mustache";
import templates from "../../../templates/templates";

import {
    createSixDigitCode,
    encryptSixDigitCode,
    sponsorExists,
} from "./sponsor-utils";
import * as bcrypt from "bcrypt";
import {
    AuthSponsorLoginValidator,
    AuthSponsorVerifyValidator,
} from "./sponsor-schema";

const authSponsorRouter = Router();

authSponsorRouter.post("/login", async (req, res, next) => {
    try {
        const { email } = AuthSponsorLoginValidator.parse(req.body);
        if (!(await sponsorExists(email))) {
            return res.sendStatus(StatusCodes.UNAUTHORIZED);
        }

        const sixDigitCode = createSixDigitCode();
        const expTime =
            Math.floor(Date.now() / 1000) + Config.VERIFY_EXP_TIME_MS;
        const hashedVerificationCode = encryptSixDigitCode(sixDigitCode);
        await Database.AUTH_CODES.findOneAndUpdate(
            { email },
            {
                hashedVerificationCode,
                expTime,
            },
            { upsert: true }
        );

        const emailBody = mustache.render(templates.SPONSOR_VERIFICATION, {
            code: sixDigitCode,
        });

        await sendHTMLEmail(email, "R|P Resume Book Email Verification", emailBody);
        return res.sendStatus(StatusCodes.CREATED);
    } catch (error) {
        next(error);
    }
});

authSponsorRouter.post("/verify", async (req, res, next) => {
    try {
        const { email, sixDigitCode } = AuthSponsorVerifyValidator.parse(
            req.body
        );
        const sponsorData = await Database.AUTH_CODES.findOneAndDelete({
            email,
        });
        const corpResponse = await Database.CORPORATE.findOne({
            email: email,
        });
        if (!sponsorData) {
            return res.sendStatus(StatusCodes.UNAUTHORIZED);
        }
        if (Math.floor(Date.now() / 1000) > sponsorData.expTime) {
            return res.sendStatus(StatusCodes.GONE);
        }
        const match = bcrypt.compareSync(
            sixDigitCode,
            sponsorData.hashedVerificationCode
        );
        if (!match) {
            return res.sendStatus(StatusCodes.UNAUTHORIZED);
        }
        const token = jsonwebtoken.sign(
            {
                userId: email,
                displayName: corpResponse?.name,
                email: email,
                roles: [Role.Enum.CORPORATE],
            },
            Config.JWT_SIGNING_SECRET,
            {
                expiresIn: Config.JWT_EXPIRATION_TIME,
            }
        );
        return res.status(StatusCodes.OK).json({ token });
    } catch (error) {
        next(error);
    }
});

export default authSponsorRouter;
