import { Router } from "express";
import { Database } from "../../../database";
import { StatusCodes } from "http-status-codes";
import { sendEmail } from "../../ses/ses-utils";
import jsonwebtoken from "jsonwebtoken";
import { Config } from "../../../config";
import { createSixDigitCode, encryptSixDigitCode} from "./sponsor-utils";
import * as bcrypt from "bcrypt";
import {AuthSponsorLoginValidator, AuthSponsorVerifyValidator} from "./sponsor-schema";

const sponsorRouter = Router();

sponsorRouter.post("/login", async (req, res, next) => {
    try {
        const { email } = AuthSponsorLoginValidator.parse(req.body);
        const sixDigitCode = createSixDigitCode();
        const expTime = Math.floor(Date.now() / 1000) + 300;
        const hashedVerificationCode = encryptSixDigitCode(sixDigitCode);
        await Database.AUTH_CODES.findOneAndUpdate(
            { email },
            {
                hashedVerificationCode: hashedVerificationCode,
                expTime: expTime,
            },
            { upsert: true }
        );
        await sendEmail(
            email,
            "R|P Sponsor Email Verification!",
            `Here is your verification code: ${sixDigitCode}`
        );
        return res.sendStatus(StatusCodes.CREATED);
    } catch (error) {
        next(error);
    }
});

sponsorRouter.post("/verify", async (req, res, next) => {
    try {
        const { email, sixDigitCode } = AuthSponsorVerifyValidator.parse(req.body);
        const sponsorData = await Database.AUTH_CODES.findOneAndDelete({ email });
        if (!sponsorData) {
            return res.sendStatus(StatusCodes.UNAUTHORIZED);
        }
        const { hashedVerificationCode, expTime } = sponsorData;
        if (Math.floor(Date.now() / 1000) > expTime) {
            return res.sendStatus(StatusCodes.GONE);
        }
        const match = await bcrypt.compareSync(
            sixDigitCode,
            hashedVerificationCode
        );
        if (!match) {
            return res.sendStatus(StatusCodes.BAD_REQUEST);
        }
        const token = jsonwebtoken.sign(
            {
                email,
                role: "CORPORATE",
            },
            Config.JWT_SIGNING_SECRET,
            {
                expiresIn: (Math.floor(Date.now() / 1000)) + Config.JWT_EXPIRATION_TIME
            }
        );
        res.json({ token });
    } catch (error) {
        next(error);
    }
});

export default sponsorRouter;
