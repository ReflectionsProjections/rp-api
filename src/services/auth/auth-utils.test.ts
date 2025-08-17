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
import { Staff } from "../staff/staff-schema";

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

const STAFF = {
    attendances: {},
    email: "staff@illinois.edu",
    name: "Staffer",
    team: "DEV",
} satisfies Staff;

const AUTH_STAFF_USER = {
    email: STAFF.email,
    displayName: "The staff",
    userId: "4242-4242",
    authId: "42421123",
} satisfies AuthInfo;
const AUTH_STAFF_USER_ROLES = [
    {
        userId: AUTH_STAFF_USER.userId,
        role: Role.Enum.USER,
    },
] satisfies AuthRole[];
const AUTH_STAFF_PAYLOAD = {
    email: AUTH_STAFF_USER.email,
    name: AUTH_STAFF_USER.displayName,
    sub: AUTH_STAFF_USER.authId,
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
    await SupabaseDB.STAFF.insert(STAFF);
    await SupabaseDB.AUTH_INFO.insert([
        AUTH_USER,
        AUTH_STAFF_USER,
        AUTH_ADMIN_USER,
    ]).throwOnError();
    await SupabaseDB.AUTH_ROLES.insert(AUTH_USER_ROLES);
    await SupabaseDB.AUTH_ROLES.insert(AUTH_STAFF_USER_ROLES);
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
        expect(roles?.map((entry: { role: string }) => entry.role)).toEqual([]);
    });

    it("should update a outdated user", async () => {
        await SupabaseDB.AUTH_INFO.delete().eq("userId", AUTH_USER.userId);
        await SupabaseDB.AUTH_ROLES.delete().eq("userId", AUTH_USER.userId);
        await SupabaseDB.AUTH_INFO.insert({
            authId: AUTH_USER.authId,
            userId: AUTH_USER.userId,
            displayName: "old display name",
            email: "old@dinosaur.com",
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
        expect(roles?.map((entry: { role: string }) => entry.role)).toEqual([Role.Enum.STAFF]);
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
        expect(roles?.map((entry: { role: string }) => entry.role)).toEqual([Role.Enum.USER]);
    });

    it("should create a new staff user", async () => {
        await SupabaseDB.AUTH_INFO.delete().eq(
            "userId",
            AUTH_STAFF_USER.userId
        );
        await SupabaseDB.AUTH_ROLES.delete().eq(
            "userId",
            AUTH_STAFF_USER.userId
        );

        const updatedUserId =
            await updateDatabaseWithAuthPayload(AUTH_STAFF_PAYLOAD);
        expect(updatedUserId).toBe(RANDOM_UUID);

        const { data: info } = await SupabaseDB.AUTH_INFO.select()
            .eq("userId", updatedUserId)
            .single();
        expect(info).toMatchObject({
            ...AUTH_STAFF_USER,
            userId: updatedUserId,
        });
        const { data: roles } = await SupabaseDB.AUTH_ROLES.select().eq(
            "userId",
            updatedUserId
        );
        expect(roles?.map((entry: { role: string }) => entry.role)).toEqual([Role.Enum.STAFF]);
    });

    it("should update a new staff user", async () => {
        const updatedUserId =
            await updateDatabaseWithAuthPayload(AUTH_STAFF_PAYLOAD);
        expect(updatedUserId).toBe(AUTH_STAFF_USER.userId);

        const { data: info } = await SupabaseDB.AUTH_INFO.select()
            .eq("userId", AUTH_STAFF_USER.userId)
            .single();
        expect(info).toMatchObject(AUTH_STAFF_USER);
        const { data: roles } = await SupabaseDB.AUTH_ROLES.select().eq(
            "userId",
            AUTH_STAFF_USER.userId
        );
        expect(roles?.map((entry: { role: string }) => entry.role).sort()).toEqual([
            Role.Enum.STAFF,
            Role.Enum.USER,
        ]);
    });

    it("should do nothing to an existing staff user", async () => {
        await SupabaseDB.AUTH_ROLES.upsert({
            userId: AUTH_STAFF_USER.userId,
            role: Role.Enum.STAFF,
        }).throwOnError();

        const updatedUserId =
            await updateDatabaseWithAuthPayload(AUTH_STAFF_PAYLOAD);
        expect(updatedUserId).toBe(AUTH_STAFF_USER.userId);

        const { data: info } = await SupabaseDB.AUTH_INFO.select()
            .eq("userId", AUTH_STAFF_USER.userId)
            .single();
        expect(info).toMatchObject(AUTH_STAFF_USER);
        const { data: roles } = await SupabaseDB.AUTH_ROLES.select().eq(
            "userId",
            AUTH_STAFF_USER.userId
        );
        expect(roles?.map((entry: { role: string }) => entry.role).sort()).toEqual([
            Role.Enum.STAFF,
            Role.Enum.USER,
        ]);
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
        expect(roles?.map((entry: { role: string }) => entry.role)).toEqual([Role.Enum.ADMIN]);
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
        expect(roles?.map((entry: { role: string }) => entry.role).sort()).toEqual([
            Role.Enum.ADMIN,
            Role.Enum.USER,
        ]);
    });

    it("should do nothing to an existing admin user", async () => {
        await SupabaseDB.AUTH_ROLES.upsert({
            userId: AUTH_ADMIN_USER.userId,
            role: Role.Enum.ADMIN,
        }).throwOnError();

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
        expect(roles?.map((entry: { role: string }) => entry.role).sort()).toEqual([
            Role.Enum.ADMIN,
            Role.Enum.USER,
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
            });
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
                roles: expect.arrayContaining([...AUTH_USER_ROLES.map((entry) => entry.role), addRole]),
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
