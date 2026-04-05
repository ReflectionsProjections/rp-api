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
import { SupabaseDB } from "../../../database";

const authSponsorRouter = Router();

/**
 * @swagger
 * /auth/sponsor/login:
 *   post:
 *     summary: Request a sponsor verification code
 *     description: |
 *       Sends a 6-digit email verification code to the given corporate sponsor
 *       email address. The email must already exist in the corporate sponsors list.
 *
 *       **Required roles: none**
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthSponsorLoginValidator'
 *     responses:
 *       201:
 *         description: Verification code sent successfully
 *       401:
 *         description: Email not found in corporate sponsors list
 *     security: []
 */
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
    await SupabaseDB.AUTH_CODES.upsert(
        {
            email,
            hashedVerificationCode,
            expTime,
        },
        {
            onConflict: "email",
        }
    ).throwOnError();

    const emailBody = mustache.render(templates.SPONSOR_VERIFICATION, {
        code: sixDigitCode,
    });

    await sendHTMLEmail(email, "R|P Resume Book Email Verification", emailBody);
    return res.sendStatus(StatusCodes.CREATED);
});

/**
 * @swagger
 * /auth/sponsor/verify:
 *   post:
 *     summary: Verify a sponsor code and receive a JWT
 *     description: |
 *       Verifies the 6-digit code sent to the sponsor's email. Returns a signed
 *       JWT with the CORPORATE role on success.
 *
 *       **Required roles: none**
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthSponsorVerifyValidator'
 *     responses:
 *       200:
 *         description: A signed JWT with the CORPORATE role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthJwtResponse'
 *       401:
 *         description: Invalid or expired verification code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "InvalidCode"
 *     security: []
 */
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
