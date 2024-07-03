import request from "supertest";
import jsonwebtoken from "jsonwebtoken";
import { Config } from "../src/config";
// import { Role } from "../src/services/auth/auth-models";

export const TESTER = {
    userId: "lforger132",
    roles: [],
    displayName: "Loid Forger",
};

function app() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const appExports = require("../src/app");
    return appExports.default;
}

//fix this later
//https://github.com/colinhacks/zod/discussions/2125
function setRole(request: request.Test, role?: string) {
    if (!role) {
        return request;
    }

    const jwt = jsonwebtoken.sign(
        {
            userId: TESTER.userId,
            roles: [role],
            displayName: TESTER.displayName,
        },
        Config.JWT_SIGNING_SECRET,
        {
            expiresIn: Config.JWT_EXPIRATION_TIME,
        }
    );

    return request.set("Authorization", jwt as string);
}

export function get(url: string, role?: string): request.Test {
    return setRole(request(app()).get(url), role);
}

export function post(url: string, role?: string): request.Test {
    return setRole(request(app()).post(url), role);
}

export function put(url: string, role?: string): request.Test {
    return setRole(request(app()).put(url), role);
}

export function patch(url: string, role?: string): request.Test {
    return setRole(request(app()).patch(url), role);
}

export function del(url: string, role?: string): request.Test {
    return setRole(request(app()).delete(url), role);
}
