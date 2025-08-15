import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { sendHTMLEmail } from "../../ses/ses-utils";
import jsonwebtoken from "jsonwebtoken";
import { Config } from "../../../config";
import { Role } from "../../auth/auth-models";
import mustache from "mustache";
import templates from "../../../templates/templates";

import { createSixDigitCode, encryptSixDigitCode } from "./sponsor-utils";
import * as bcrypt from "bcrypt";
import {
    AuthSponsorLoginValidator,
    AuthSponsorVerifyValidator,
} from "./sponsor-schema";
import { SupabaseDB } from "../../../supabase";

const authSponsorRouter = Router();

authSponsorRouter.post("/login", async (req, res) => {
    const { email } = AuthSponsorLoginValidator.parse(req.body);
    const { data: existing } = await SupabaseDB.CORPORATE.select()
        .eq("email", email)
        .maybeSingle()
        .throwOnError();
    if (!existing) {
        return res.sendStatus(StatusCodes.UNAUTHORIZED);
    }

    const sixDigitCode = createSixDigitCode();
    const expTime = new Date(
        Date.now() + Config.VERIFY_EXP_TIME_MS
    ).toISOString();
    const hashedVerificationCode = encryptSixDigitCode(sixDigitCode);
    await SupabaseDB.AUTH_CODES.upsert({
        email,
        hashedVerificationCode,
        expTime,
    })
        .eq("email", email)
        .throwOnError();

    const emailBody = mustache.render(templates.SPONSOR_VERIFICATION, {
        code: sixDigitCode,
    });

    await sendHTMLEmail(email, "R|P Resume Book Email Verification", emailBody);
    return res.sendStatus(StatusCodes.CREATED);
});

authSponsorRouter.post("/verify", async (req, res) => {
    const { email, sixDigitCode } = AuthSponsorVerifyValidator.parse(req.body);
    const { data: sponsorData } = await SupabaseDB.AUTH_CODES.delete()
        .eq("email", email)
        .select()
        .maybeSingle()
        .throwOnError();
    const { data: corpResponse } = await SupabaseDB.CORPORATE.select()
        .eq("email", email)
        .maybeSingle();

    if (!sponsorData) {
        return res.status(StatusCodes.UNAUTHORIZED).send({
            error: "InvalidCode",
        });
    }

    const match = bcrypt.compareSync(
        sixDigitCode,
        sponsorData.hashedVerificationCode
    );
    if (!match) {
        return res.status(StatusCodes.UNAUTHORIZED).send({
            error: "InvalidCode",
        });
    }

    const expTimeDate = new Date(sponsorData.expTime);
    if (Date.now() > expTimeDate.getTime()) {
        return res.status(StatusCodes.UNAUTHORIZED).send({
            error: "ExpiredCode",
        });
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
});

export default authSponsorRouter;
