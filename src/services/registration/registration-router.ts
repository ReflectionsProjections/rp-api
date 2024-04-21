import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    RegistrationValidator,
    RegistrationSchema,
} from "./registration-schema";
import { Database } from "../../database";
// import cors from "cors";
// import RoleChecker from "../../middleware/role-checker";
// import { Role } from "../auth/auth-models";

const registrationRouter = Router();

// A database upsert operation to save registration mid-progress
registrationRouter.post("/save", async (req, res, next) => {
    try {
        const registrationData = RegistrationValidator.parse(req.body);

        await Database.REGISTRATION.findOneAndUpdate(
            { email: registrationData.email }, // only required one
            {
                ...registrationData,
                complete: false,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(StatusCodes.OK).json(registrationData);
    } catch (error) {
        next(error);
    }
});

registrationRouter.post("/submit", async (req, res, next) => {
    try {
        const registrationData = RegistrationValidator.parse(req.body);

        await Database.REGISTRATION.findOneAndUpdate(
            { email: registrationData.email }, // only required one
            {
                ...registrationData,
                complete: true,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(StatusCodes.OK).json(registrationData);
    } catch (error) {
        next(error);
    }
});

// Retrieve registration fields both to repopulate registration info for a user
registrationRouter.get("/get/:email", async (req, res, next) => {
    try {
        const email = req.params.email;

        const registration = await Database.REGISTRATION.findOne({ email });

        if (!registration) {
            return { error: "DoesNotExist" };
        }

        res.status(StatusCodes.OK).json({ registration });
    } catch (error) {
        next(error);
    }
});

export default registrationRouter;
