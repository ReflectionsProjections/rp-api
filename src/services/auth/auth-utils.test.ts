import {
    generateJWT,
    getJwtPayloadFromDatabase,
    TokenPayloadWithProperScopes,
    updateDatabaseWithAuthPayload,
} from "./auth-utils";
import { AuthInfo, AuthRole } from "./auth-schema";
import { Role } from "./auth-models";
import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import Config from "../../config";
import { SupabaseDB } from "../../supabase";

const AUTH_USER = {
    displayName: "The Tester",
    email: "test@test.com",
    userId: "abcd-efgh",
    authId: "12345678",
} satisfies AuthInfo;
const AUTH_USER_ROLES = [
    {
        userId: AUTH_USER.userId,
        role: Role.Enum.USER,
    },
] satisfies AuthRole[];

const AUTH_PAYLOAD = {
    email: AUTH_USER.email,
    name: AUTH_USER.displayName,
    sub: AUTH_USER.authId,
} satisfies Partial<TokenPayloadWithProperScopes> as TokenPayloadWithProperScopes;

const AUTH_ADMIN_USER = {
    email: "ronita2@illinois.edu",
    displayName: "The admin",
    userId: "294r-23rn",
    authId: "592493",
} satisfies AuthInfo;
const AUTH_ADMIN_USER_ROLES = [
    {
        userId: AUTH_ADMIN_USER.userId,
        role: Role.Enum.USER,
    },
] satisfies AuthRole[];

const AUTH_ADMIN_PAYLOAD = {
    email: AUTH_ADMIN_USER.email,
    name: AUTH_ADMIN_USER.displayName,
    sub: AUTH_ADMIN_USER.authId,
} satisfies Partial<TokenPayloadWithProperScopes> as TokenPayloadWithProperScopes;

const RANDOM_UUID = "totally-random-but-set-for-tests";
jest.mock("crypto", () => {
    const realCrypto = jest.requireActual("crypto");
    return {
        ...realCrypto,
        randomUUID: () => RANDOM_UUID,
    };
});

beforeEach(async () => {
    await SupabaseDB.AUTH_INFO.insert([
        AUTH_USER,
        AUTH_ADMIN_USER,
    ]).throwOnError();
    await SupabaseDB.AUTH_ROLES.insert(AUTH_USER_ROLES);
    await SupabaseDB.AUTH_ROLES.insert(AUTH_ADMIN_USER_ROLES);
});

describe("updateDatabaseWithAuthPayload", () => {
    it("should create a new user", async () => {
        await SupabaseDB.AUTH_INFO.delete().eq("userId", AUTH_USER.userId);
        await SupabaseDB.AUTH_ROLES.delete().eq("userId", AUTH_USER.userId);

        const updatedUserId = await updateDatabaseWithAuthPayload(AUTH_PAYLOAD);
        expect(updatedUserId).toBe(RANDOM_UUID);

        const { data: info } = await SupabaseDB.AUTH_INFO.select()
            .eq("userId", updatedUserId)
            .single();
        expect(info).toMatchObject({
            ...AUTH_USER,
            userId: updatedUserId,
        });
        const { data: roles } = await SupabaseDB.AUTH_ROLES.select().eq(
            "userId",
            updatedUserId
        );
        expect(roles?.map((entry) => entry.role)).toEqual([]);
    });

    it("should update a partial user", async () => {
        await SupabaseDB.AUTH_INFO.delete().eq("userId", AUTH_USER.userId);
        await SupabaseDB.AUTH_ROLES.delete().eq("userId", AUTH_USER.userId);
        await SupabaseDB.AUTH_INFO.insert({
            userId: AUTH_USER.userId,
            displayName: AUTH_USER.displayName,
            email: AUTH_USER.email,
        });
        await SupabaseDB.AUTH_ROLES.insert({
            userId: AUTH_USER.userId,
            role: Role.Enum.STAFF,
        });

        const updatedUserId = await updateDatabaseWithAuthPayload(AUTH_PAYLOAD);
        expect(updatedUserId).toBe(AUTH_USER.userId);

        const { data: info } = await SupabaseDB.AUTH_INFO.select()
            .eq("userId", AUTH_USER.userId)
            .single();
        expect(info).toMatchObject(AUTH_USER);
        const { data: roles } = await SupabaseDB.AUTH_ROLES.select().eq(
            "userId",
            AUTH_USER.userId
        );
        expect(roles?.map((entry) => entry.role)).toEqual([Role.Enum.STAFF]);
    });

    it("should do nothing to an existing user", async () => {
        const updatedUserId = await updateDatabaseWithAuthPayload(AUTH_PAYLOAD);
        expect(updatedUserId).toBe(AUTH_USER.userId);

        const { data: info } = await SupabaseDB.AUTH_INFO.select()
            .eq("userId", AUTH_USER.userId)
            .single();
        expect(info).toMatchObject(AUTH_USER);
        const { data: roles } = await SupabaseDB.AUTH_ROLES.select().eq(
            "userId",
            AUTH_USER.userId
        );
        expect(roles?.map((entry) => entry.role)).toEqual([Role.Enum.USER]);
    });

    it("should create a new admin user", async () => {
        await SupabaseDB.AUTH_INFO.delete().eq(
            "userId",
            AUTH_ADMIN_USER.userId
        );
        await SupabaseDB.AUTH_ROLES.delete().eq(
            "userId",
            AUTH_ADMIN_USER.userId
        );

        const updatedUserId =
            await updateDatabaseWithAuthPayload(AUTH_ADMIN_PAYLOAD);
        expect(updatedUserId).toBe(RANDOM_UUID);

        const { data: info } = await SupabaseDB.AUTH_INFO.select()
            .eq("userId", updatedUserId)
            .single();
        expect(info).toMatchObject({
            ...AUTH_ADMIN_USER,
            userId: updatedUserId,
        });
        const { data: roles } = await SupabaseDB.AUTH_ROLES.select().eq(
            "userId",
            updatedUserId
        );
        expect(roles?.map((entry) => entry.role)).toEqual([Role.Enum.ADMIN]);
    });

    it("should update a new admin user", async () => {
        const updatedUserId =
            await updateDatabaseWithAuthPayload(AUTH_ADMIN_PAYLOAD);
        expect(updatedUserId).toBe(AUTH_ADMIN_USER.userId);

        const { data: info } = await SupabaseDB.AUTH_INFO.select()
            .eq("userId", AUTH_ADMIN_USER.userId)
            .single();
        expect(info).toMatchObject(AUTH_ADMIN_USER);
        const { data: roles } = await SupabaseDB.AUTH_ROLES.select().eq(
            "userId",
            AUTH_ADMIN_USER.userId
        );
        expect(roles?.map((entry) => entry.role)).toEqual([
            Role.Enum.USER,
            Role.Enum.ADMIN,
        ]);
    });
});

describe("getJwtPayloadFromDatabase", () => {
    it("should get a payload", async () => {
        const payload = await getJwtPayloadFromDatabase(AUTH_USER.userId);
        expect(payload).toEqual({
            displayName: AUTH_USER.displayName,
            userId: AUTH_USER.userId,
            email: AUTH_USER.email,
            roles: AUTH_USER_ROLES.map((entry) => entry.role),
        });
    });

    it("fails to get a nonexistent payload", async () => {
        expect(getJwtPayloadFromDatabase("nonexistent")).rejects.toThrow(
            "NoUserFound"
        );
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
            await SupabaseDB.AUTH_ROLES.upsert({
                role: addRole,
                userId: AUTH_USER.userId,
            }).eq("userId", AUTH_USER.userId);
        }

        const start = Math.floor(Date.now() / 1000);
        const jwt = await generateJWT(AUTH_USER.userId);
        const payload = jsonwebtoken.verify(
            jwt,
            Config.JWT_SIGNING_SECRET
        ) as JwtPayload;
        expect(payload).toMatchObject({
            userId: AUTH_USER.userId,
            email: AUTH_USER.email,
            displayName: AUTH_USER.displayName,
            ...(addRole && {
                roles: [...AUTH_USER_ROLES.map((entry) => entry.role), addRole],
            }),
        });
        expect(payload.iat).toBeGreaterThanOrEqual(start);
        // ms is what jsonwebtoken uses to parse expiration times, so we use it here as well
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const ms = require("ms");
        const time = Math.floor((ms(exp) as number) / 1000);
        expect(payload.exp).toBeGreaterThanOrEqual(start + time);
        expect(payload.exp).toBeLessThan(start + time + 30);
    });
});
