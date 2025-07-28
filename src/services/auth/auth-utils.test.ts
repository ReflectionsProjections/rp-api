import { TokenPayload } from "google-auth-library";
import {
    generateJWT,
    getJwtPayloadFromDatabase,
    updateDatabaseWithAuthPayload,
} from "./auth-utils";
import { Database } from "../../database";
import { Roles } from "./auth-schema";
import { Role } from "./auth-models";
import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import Config from "../../config";

const AUTH_USER = {
    displayName: "The Tester",
    email: "test@test.com",
    roles: [Role.Enum.USER],
    userId: "user1234987",
} satisfies Roles;

const AUTH_PAYLOAD = {
    email: AUTH_USER.email,
    name: AUTH_USER.displayName,
    sub: AUTH_USER.userId.replace("user", ""),
} satisfies Partial<TokenPayload> as TokenPayload;

const AUTH_ADMIN_USER = {
    email: "ronita2@illinois.edu",
    displayName: "The admin",
    roles: [Role.Enum.USER],
    userId: "user42424269",
} satisfies Roles;

const AUTH_ADMIN_PAYLOAD = {
    email: AUTH_ADMIN_USER.email,
    name: AUTH_ADMIN_USER.displayName,
    sub: AUTH_ADMIN_USER.userId.replace("user", ""),
} satisfies Partial<TokenPayload> as TokenPayload;

beforeEach(async () => {
    await Database.ROLES.create(AUTH_USER, AUTH_ADMIN_USER);
});

describe("updateDatabaseWithAuthPayload", () => {
    it("should create a new user", async () => {
        await Database.ROLES.deleteOne({ userId: AUTH_USER.userId });

        await updateDatabaseWithAuthPayload(AUTH_PAYLOAD);

        const stored = await Database.ROLES.findOne({
            userId: AUTH_USER.userId,
        });
        expect(stored?.toObject()).toMatchObject({
            ...AUTH_USER,
            roles: [],
        });
    });

    it("should update a partial user", async () => {
        await Database.ROLES.deleteOne({ userId: AUTH_USER.userId });
        await Database.ROLES.create({
            displayName: AUTH_USER.displayName,
            email: AUTH_USER.email,
            roles: [Role.Enum.STAFF],
        });

        await updateDatabaseWithAuthPayload(AUTH_PAYLOAD);

        const stored = await Database.ROLES.findOne({
            userId: AUTH_USER.userId,
        });
        expect(stored?.toObject()).toMatchObject({
            ...AUTH_USER,
            roles: [Role.Enum.STAFF],
        });
    });

    it("should create a new admin user", async () => {
        await Database.ROLES.deleteOne({ userId: AUTH_ADMIN_USER.userId });

        await updateDatabaseWithAuthPayload(AUTH_ADMIN_PAYLOAD);

        const stored = await Database.ROLES.findOne({
            userId: AUTH_ADMIN_USER.userId,
        });
        expect(stored?.toObject()).toMatchObject({
            ...AUTH_ADMIN_USER,
            roles: [Role.Enum.ADMIN],
        });
    });

    it("should update a new admin user", async () => {
        await updateDatabaseWithAuthPayload(AUTH_ADMIN_PAYLOAD);

        const stored = await Database.ROLES.findOne({
            userId: AUTH_ADMIN_USER.userId,
        });
        expect(stored?.toObject()).toMatchObject({
            ...AUTH_ADMIN_USER,
            roles: [...AUTH_ADMIN_USER.roles, Role.Enum.ADMIN],
        });
    });
});

describe("getJwtPayloadFromDatabase", () => {
    it("should get a payload", async () => {
        const payload = await getJwtPayloadFromDatabase(AUTH_USER.userId);
        expect(payload.toObject()).toEqual(AUTH_USER);
    });

    it("fails to get a nonexistent payload", async () => {
        expect(getJwtPayloadFromDatabase("nonexistent")).rejects.toThrow();
    });
});

describe("generateJWT", () => {
    it.each([
        ["for normal users", Config.JWT_EXPIRATION_TIME, null],
        [
            "for puzzlebang users",
            Config.PB_JWT_EXPIRATION_TIME,
            Role.Enum.PUZZLEBANG,
        ],
    ])("should generate a valid jwt %s", async (_, exp, addRole) => {
        if (addRole) {
            await Database.ROLES.updateOne(
                { userId: AUTH_USER.userId },
                {
                    $addToSet: { roles: addRole },
                }
            );
        }

        const start = Math.floor(Date.now() / 1000);
        const jwt = await generateJWT(AUTH_USER.userId);
        const payload = jsonwebtoken.verify(
            jwt,
            Config.JWT_SIGNING_SECRET
        ) as JwtPayload;
        expect(payload).toMatchObject({
            ...AUTH_USER,
            ...(addRole && { roles: [...AUTH_USER.roles, addRole] }),
        });
        expect(payload.iat).toBeGreaterThanOrEqual(start);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const ms = require("ms");
        const time = Math.floor((ms(exp) as number) / 1000);
        expect(payload.exp).toBeGreaterThanOrEqual(start + time);
        expect(payload.exp).toBeLessThan(start + time + 30);
    });
});
