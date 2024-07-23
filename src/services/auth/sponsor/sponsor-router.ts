import { Router } from "express";
import { Database } from "../../../database";
import RoleChecker from "../../../middleware/role-checker";
import { Role } from "../auth-models";
import { StatusCodes } from "http-status-codes";
import { sendEmail } from "../../ses/ses-utils";
import jsonwebtoken from "jsonwebtoken";
import { Config } from "../../../config";
import * as bcrypt from "bcrypt";
const sponsorRouter = Router();

// Get favorite events for an attendee
sponsorRouter.get(
    "/",
    RoleChecker([Role.Enum.CORPORATE]),
    async (req, res, next) => {
        try {
            const resumeUsers = await Database.REGISTRATION.find(
                { hasResume: true },
                { userId: 1 }
            );
            if (!resumeUsers) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "UserNotFound" });
            }
            return res.status(StatusCodes.OK).json(resumeUsers);
        } catch (error) {
            next(error);
        }
    }
);

function createSixDigitCode() {
    let result = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function encryptSixDigitCode(sixDigitCode: string): string {
    console.log("SixDigit: ", sixDigitCode);
    const saltRounds = 10;

    try {
        const hash = bcrypt.hashSync(sixDigitCode, saltRounds);
        return hash;
    } catch (err) {
        console.error("Error encrypting the code:", err);
        throw err;
    }
}

sponsorRouter.post("/login", async (req, res, next) => {
    const { email } = req.body;
    try {
        const sixDigitCode = createSixDigitCode();
        const expTime = Math.floor(Date.now() / 1000) + 300;
        const hashedVerificationCode = encryptSixDigitCode(sixDigitCode);
        await Database.SPONSOR.findOneAndUpdate(
            { email },
            {
                $set: {
                    hashedVerificationCode: hashedVerificationCode,
                    expTime: expTime,
                },
            },
            { upsert: true }
        );
        await sendEmail(
            email,
            "RP-Sponor Email Verification!",
            `Here is your verification code: ${sixDigitCode}`
        );
        return res.sendStatus(StatusCodes.CREATED);
    } catch (error) {
        next(error);
    }
});

sponsorRouter.post("/verify", async (req, res, next) => {
    const { email, sixDigitCode } = req.body;
    try {
        const sponsorData = await Database.SPONSOR.findOne({ email });
        if (!sponsorData) {
            return res.status(401).json({ message: "No Access" });
        }
        const { hashedVerificationCode, expTime } = sponsorData;
        if (Math.floor(Date.now() / 1000) > expTime) {
            return res.status(401).json({ message: "Code expired" });
        }
        const match = await bcrypt.compareSync(
            sixDigitCode,
            hashedVerificationCode
        );
        if (!match) {
            return res.status(401).json({ message: "Incorrect Code" });
        }
        await Database.SPONSOR.deleteOne({ email });
        const token = jsonwebtoken.sign(
            {
                email,
                role: "CORPORATE",
            },
            Config.JWT_SIGNING_SECRET,
            {
                expiresIn: Config.JWT_EXPIRATION_TIME,
            }
        );
        res.json({ token });
    } catch (error) {
        next(error);
    }
});

export default sponsorRouter;
