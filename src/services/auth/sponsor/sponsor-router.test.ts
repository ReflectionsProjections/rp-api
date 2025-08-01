import { SendEmailResponse } from "aws-sdk/clients/ses";
import * as sesUtils from "../../ses/ses-utils";
import * as sponsorUtils from "./sponsor-utils";
import { post } from "../../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { Corporate } from "../corporate-schema";
import { Database } from "../../../database";
import { compareSync } from "bcrypt";
import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import Config from "../../../config";
import { Role } from "../auth-models";

const CORPORATE_USER = {
    email: "sponsor@big-man.corp",
    name: "Big Corporate Man",
} satisfies Corporate;
const VALID_CODE = "AAABBB";

beforeEach(async () => {
    await Database.CORPORATE.create(CORPORATE_USER);
    await Database.AUTH_CODES.create({
        hashedVerificationCode: sponsorUtils.encryptSixDigitCode(VALID_CODE),
        expTime: Date.now() + 60 * 1000,
        email: CORPORATE_USER.email,
    });
});

describe("POST /auth/sponsor/login", () => {
    const mockSendHTMLEmail = jest
        .spyOn(sesUtils, "sendHTMLEmail")
        .mockImplementation((_emailId, _subject, _emailHTML) =>
            Promise.resolve({} as unknown as SendEmailResponse)
        );
    const mockCreateSixDigitCode = jest.spyOn(
        sponsorUtils,
        "createSixDigitCode"
    );

    beforeEach(async () => {
        mockSendHTMLEmail.mockClear();
        mockCreateSixDigitCode.mockClear();
    });

    it("should send a login code", async () => {
        await post("/auth/sponsor/login")
            .send({
                email: CORPORATE_USER.email,
            })
            .expect(StatusCodes.CREATED);
        expect(mockCreateSixDigitCode).toHaveBeenCalled();
        const sixDigitCode = `${mockCreateSixDigitCode.mock.results.at(-1)?.value}`;
        expect(mockSendHTMLEmail).toHaveBeenCalledWith(
            CORPORATE_USER.email,
            expect.stringContaining("Email Verification"),
            expect.stringContaining(sixDigitCode)
        );

        const stored = await Database.AUTH_CODES.findOne({
            email: CORPORATE_USER.email,
        });
        expect(stored?.toObject()).toHaveProperty("hashedVerificationCode");
        expect(
            compareSync(sixDigitCode, `${stored?.hashedVerificationCode}`)
        ).toBe(true);
    });

    it("fails to send a code for invalid emails", async () => {
        const email = "badGuy@evil.com";
        await post("/auth/sponsor/login")
            .send({
                email,
            })
            .expect(StatusCodes.UNAUTHORIZED);
        expect(mockCreateSixDigitCode).not.toHaveBeenCalled();
        expect(mockSendHTMLEmail).not.toHaveBeenCalled();

        const stored = await Database.AUTH_CODES.findOne({
            email,
        });
        expect(stored?.toObject()).toBeUndefined();
    });
});

describe("POST /auth/sponsor/verify", () => {
    it("should login for valid codes", async () => {
        const start = Math.floor(Date.now() / 1000);
        const response = await post("/auth/sponsor/verify")
            .send({
                email: CORPORATE_USER.email,
                sixDigitCode: VALID_CODE,
            })
            .expect(StatusCodes.OK);

        expect(response.body).toHaveProperty("token");
        const payload = jsonwebtoken.verify(
            response.body.token,
            Config.JWT_SIGNING_SECRET
        ) as JwtPayload;
        expect(payload).toMatchObject({
            userId: CORPORATE_USER.email,
            displayName: CORPORATE_USER.name,
            email: CORPORATE_USER.email,
            roles: [Role.Enum.CORPORATE],
        });
        expect(payload.iat).toBeGreaterThanOrEqual(start);
    });

    it("fails for expired codes", async () => {
        await Database.AUTH_CODES.updateOne(
            {
                email: CORPORATE_USER.email,
            },
            {
                expTime: Math.floor(Date.now() / 1000) - 30,
            }
        );
        const response = await post("/auth/sponsor/verify")
            .send({
                email: CORPORATE_USER.email,
                sixDigitCode: VALID_CODE,
            })
            .expect(StatusCodes.UNAUTHORIZED);

        expect(response.body).toHaveProperty("error", "ExpiredCode");
    });

    it("fails for invalid codes", async () => {
        const response = await post("/auth/sponsor/verify")
            .send({
                email: CORPORATE_USER.email,
                sixDigitCode: "BADCOD",
            })
            .expect(StatusCodes.UNAUTHORIZED);

        expect(response.body).toHaveProperty("error", "InvalidCode");
    });

    it("fails for invalid emails", async () => {
        const response = await post("/auth/sponsor/verify")
            .send({
                email: "invalid@nonexistent.com",
                sixDigitCode: VALID_CODE,
            })
            .expect(StatusCodes.UNAUTHORIZED);

        expect(response.body).toHaveProperty("error", "InvalidCode");
    });
});
