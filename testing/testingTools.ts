import request from "supertest";
import { z } from "zod";
import jsonwebtoken from "jsonwebtoken";
import { Config } from "../src/config";
import { JwtPayloadType, Role } from "../src/services/auth/auth-models";
import { SupabaseClient } from "@supabase/supabase-js";

type RoleType = z.infer<typeof Role>;

export const TESTER = {
    userId: "test-er-user-id",
    roles: [],
    displayName: "Loid Forger",
    email: "loid.forger@testing.com",
};

function app() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appExports = require("../src/app");
    return appExports.default;
}

function setRole(request: request.Test, role?: RoleType) {
    if (!role) {
        return request;
    }

    const payload = {
        userId: TESTER.userId,
        roles: [role],
        displayName: TESTER.displayName,
        email: TESTER.email,
    } satisfies JwtPayloadType;

    const jwt = jsonwebtoken.sign(payload, Config.JWT_SIGNING_SECRET, {
        expiresIn: Config.JWT_EXPIRATION_TIME,
    });

    return request.set("Authorization", jwt as string);
}

export function get(url: string, role?: RoleType): request.Test {
    return setRole(request(app()).get(url), role);
}

export function getAsUser(url: string): request.Test {
    return get(url, Role.enum.USER);
}

export function getAsStaff(url: string): request.Test {
    return get(url, Role.enum.STAFF);
}

export function getAsAdmin(url: string): request.Test {
    return get(url, Role.enum.ADMIN);
}

export function post(url: string, role?: RoleType): request.Test {
    return setRole(request(app()).post(url), role);
}

export function postAsUser(url: string): request.Test {
    return post(url, Role.enum.USER);
}

export function postAsStaff(url: string): request.Test {
    return post(url, Role.enum.STAFF);
}

export function postAsAdmin(url: string): request.Test {
    return post(url, Role.enum.ADMIN);
}

export function put(url: string, role?: RoleType): request.Test {
    return setRole(request(app()).put(url), role);
}

export function putAsUser(url: string): request.Test {
    return put(url, Role.enum.USER);
}

export function putAsStaff(url: string): request.Test {
    return put(url, Role.enum.STAFF);
}

export function putAsAdmin(url: string): request.Test {
    return put(url, Role.enum.ADMIN);
}

export function patch(url: string, role?: RoleType): request.Test {
    return setRole(request(app()).patch(url), role);
}

export function patchAsUser(url: string): request.Test {
    return patch(url, Role.enum.USER);
}

export function patchAsStaff(url: string): request.Test {
    return patch(url, Role.enum.STAFF);
}

export function patchAsAdmin(url: string): request.Test {
    return patch(url, Role.enum.ADMIN);
}

export function del(url: string, role?: RoleType): request.Test {
    return setRole(request(app()).delete(url), role);
}

export function delAsUser(url: string): request.Test {
    return del(url, Role.enum.USER);
}

export function delAsStaff(url: string): request.Test {
    return del(url, Role.enum.STAFF);
}

export function delAsAdmin(url: string): request.Test {
    return del(url, Role.enum.ADMIN);
}

export async function clearSupabaseTables(supabase: SupabaseClient) {
    const tables = [
        "eventAttendances",
        "attendeeAttendances",
        "attendees",
        "notifications",
        "registrations",
        "authInfo",
        "authRoles",
        "authCodes",
        "events",
        "corporate",
        "meetings",
        "speakers",
        "staff",
        "subscriptions",
    ]; // TODO: Get this from the database

    for (const table of tables!) {
        const { error } = await supabase.from(table).delete();
        if (error) {
            console.warn(`⚠️ Could not clear ${table}:`, error.message);
        }
    }
}
