import { Router } from "express";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import { SponsorValidator } from "./sponsor-schema";
import {sendEmail} from "../ses/ses-utils"
import jsonwebtoken from "jsonwebtoken";
import { Config } from "../../config";
const bcrypt = require('bcrypt');
const sponsorRouter = Router();

sponsorRouter.get('/test', (req, res) => {
    res.status(200).send({ message: 'Route found' });
  });

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
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function encryptSixDigitCode(sixDigitCode) {
    console.log("SixDijit: ", sixDigitCode)
    const saltRounds = 10; 

    try {
        const hash = bcrypt.hashSync(sixDigitCode, saltRounds);
        return hash
    } catch (err) {
        console.error('Error encrypting the code:', err);
        throw err;
    }
}

sponsorRouter.post(
    "/login",
    async (req, res, next) => {
        const { email } = req.body;
        try {
            console.log("email: ", email)
            console.log("req: ", req.body)

            const sixDigitCode = createSixDigitCode();
            console.log("SixDijit: ", sixDigitCode)
            const expTime = Math.floor(Date.now() / 1000) + 120; //2 minutes
            console.log("expTime: ", expTime)
            const hashedVerificationCode = encryptSixDigitCode(sixDigitCode);
            // const validatedData = SponsorValidator.parse({email, hashedVerificationCode, expTime});
            console.log("created hashed code:",hashedVerificationCode)
            // const sponsor = new Database.SPONSOR(validatedData);
            // await sponsor.save();
            await Database.SPONSOR.findOneAndUpdate(
                { email }, 
                {
                  $set: {
                    hashed_code: hashedVerificationCode,
                    expiration_time: expTime,
                  },
                },
                { upsert: true }
              );
              console.log("added to sponsor collectoin")

             await sendEmail(email, 'RP-Verify your Email', ` Verifiction Code: ${sixDigitCode}`);
            console.log("sent email")
            return res.sendStatus(StatusCodes.CREATED);
        } catch (error) {
            next(error);
        }
    }
);

sponsorRouter.post(
    "/verify",
    async (req, res, next) => {
        const { email, sixDigitCodeInput } = req.body;
        try {

            const sponsorData = await Database.SPONSOR.findOne({ email: email });
            const { hashedVerificationCode, expTime } = sponsorData
            console.log("retrieved hashedcode: ",hashedVerificationCode)
            if (new Date() > expTime){
                return res.status(401).json({ message: 'Code expired' });
            }
            const match = await bcrypt.compareSync(sixDigitCodeInput, hashedVerificationCode)
            if (!match) {
              return res.status(401).json({ message: 'Incorrect Code' });
            }
            console.log("matched the code")
            await Database.SPONSOR.deleteOne({ email });
            console.log("removed email from collection");
            const token = jsonwebtoken.sign(
                {
                email,
                role: 'CORPORATE'
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
    }
);

export default sponsorRouter;
