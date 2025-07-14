import {
    delAsAdmin,
    delAsStaff,
    getAsAdmin,
    getAsStaff,
    getAsUser,
    post,
    postAsAdmin,
    postAsStaff,
    putAsAdmin,
    putAsStaff,
    TESTER,
} from "../../../testing/testingTools";
import { Roles } from "./auth-schema";
import { Platform, Role } from "./auth-models";
import { Database } from "../../database";
import { StatusCodes } from "http-status-codes";
import * as googleAuthLibrary from "google-auth-library";
import Config from "../../config";
import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import { Corporate } from "./corporate-schema";

const TESTER_USER = {
    userId: TESTER.userId,
    displayName: TESTER.displayName,
    email: TESTER.email,
    roles: [Role.Enum.USER],
} satisfies Roles;

const OTHER_USER = {
    userId: "other-user-123",
    displayName: "Other User",
    email: "other@user.com",
    roles: [Role.Enum.USER, Role.Enum.STAFF],
} satisfies Roles;

const CORPORATE_USER = {
    email: "sponsor@big.corp",
    name: "Big Corporate Guy",
} satisfies Corporate;
const CORPORATE_OTHER_USER = {
    email: "sponsor@other-big.corp",
    name: "Ronit Smith",
} satisfies Corporate;

beforeEach(async () => {
    await Database.ROLES.create(TESTER_USER, OTHER_USER);
    await Database.CORPORATE.create(CORPORATE_USER, CORPORATE_OTHER_USER);
});

describe("DELETE /auth/", () => {
    it("should remove the requested role", async () => {
        const res = await delAsAdmin("/auth/")
            .send({
                email: OTHER_USER.email,
                role: Role.Enum.STAFF,
            })
            .expect(StatusCodes.OK);

        const expected = {
            ...OTHER_USER,
            roles: [Role.Enum.USER],
        };
        expect(res.body).toMatchObject(expected);
        const stored = await Database.ROLES.findOne({
            userId: OTHER_USER.userId,
        });
        expect(stored?.toObject()).toMatchObject(expected);
    });

    it("should give the not found error when the user doesn't exist", async () => {
        const res = await delAsAdmin("/auth/")
            .send({
                email: "nonexistent@fake.com",
                role: Role.Enum.STAFF,
            })
            .expect(StatusCodes.NOT_FOUND);

        expect(res.body).toHaveProperty("error", "UserNotFound");
    });

    it("should require admin permissions", async () => {
        const res = await delAsStaff("/auth/")
            .send({
                email: "nonexistent@fake.com",
                role: Role.Enum.STAFF,
            })
            .expect(StatusCodes.FORBIDDEN);

        expect(res.body).toHaveProperty("error", "Forbidden");
    });
});

describe("PUT /auth/", () => {
    it("should add the requested role", async () => {
        const res = await putAsAdmin("/auth/")
            .send({
                email: OTHER_USER.email,
                role: Role.Enum.PUZZLEBANG,
            })
            .expect(StatusCodes.OK);

        const expected = {
            ...OTHER_USER,
            roles: [...OTHER_USER.roles, Role.Enum.PUZZLEBANG],
        };
        expect(res.body).toMatchObject(expected);
        const stored = await Database.ROLES.findOne({
            userId: OTHER_USER.userId,
        });
        expect(stored?.toObject()).toMatchObject(expected);
    });

    it("should create the new roles entry if the user doesn't exist", async () => {
        const newEmail = "nonexistent@fake.com";
        const res = await putAsAdmin("/auth/")
            .send({
                email: newEmail,
                role: Role.Enum.PUZZLEBANG,
            })
            .expect(StatusCodes.OK);

        const expected = {
            email: newEmail,
            roles: [Role.Enum.PUZZLEBANG],
        };
        expect(res.body).toMatchObject(expected);
        const stored = await Database.ROLES.findOne({ email: newEmail });
        expect(stored?.toObject()).toMatchObject(expected);
    });

    it("should require admin permissions", async () => {
        const res = await putAsStaff("/auth/")
            .send({
                email: "nonexistent@fake.com",
                role: Role.Enum.STAFF,
            })
            .expect(StatusCodes.FORBIDDEN);

        expect(res.body).toHaveProperty("error", "Forbidden");
    });
});

describe("POST /auth/login/:PLATFORM", () => {
    const ID_TOKEN = "IdToken";
    const AUTH_PAYLOAD = {
        email: TESTER.email,
        sub: TESTER.userId.replace("user", ""),
        name: TESTER.displayName,
    } satisfies Partial<googleAuthLibrary.TokenPayload>;

    const mockGetToken: jest.SpiedFunction<
        googleAuthLibrary.OAuth2Client["getToken"]
    > = jest.fn();
    const mockVerifyIdToken: jest.SpiedFunction<
        googleAuthLibrary.OAuth2Client["verifyIdToken"]
    > = jest.fn();

    const mockOAuth2Client = jest
        .spyOn(googleAuthLibrary, "OAuth2Client")
        .mockImplementation(
            () =>
                ({
                    getToken: mockGetToken,
                    verifyIdToken: mockVerifyIdToken,
                }) as unknown as googleAuthLibrary.OAuth2Client
        );

    beforeEach(async () => {
        await Database.ROLES.deleteOne({ userId: TESTER.userId });
        mockGetToken.mockClear().mockImplementation(() => {
            return {
                tokens: {
                    id_token: ID_TOKEN,
                },
            };
        });
        mockVerifyIdToken.mockClear().mockImplementation(() => ({
            getPayload: () => AUTH_PAYLOAD,
        }));
    });

    // Generic tests
    it("should fail to login with an invalid platform (case sensitive)", async () => {
        const res = await post("/auth/login/web")
            .send({
                code: "loginCode",
                redirectUri: "http://localhost/redirect",
            })
            .expect(StatusCodes.BAD_REQUEST);
        expect(res.body).toHaveProperty("error", "InvalidRequest");
    });

    it("should fail to login with invalid platform in URL parameter", async () => {
        const res = await post("/auth/login/INVALID_PLATFORM")
            .send({
                code: "loginCode",
                redirectUri: "http://localhost/redirect",
            })
            .expect(StatusCodes.BAD_REQUEST);
        expect(res.body).toHaveProperty("error", "InvalidRequest");
    });

    it("should fail to login with missing platform in URL parameter", async () => {
        const res = await post("/auth/login/")
            .send({
                code: "loginCode",
                redirectUri: "http://localhost/redirect",
            })
            .expect(StatusCodes.NOT_FOUND);
        expect(res.body).toHaveProperty("error", "EndpointNotFound");
    });

    // Platform-specific tests
    describe.each([
        {
            platform: Platform.WEB,
            loginRequest: {
                code: "loginCode",
                redirectUri: "http://localhost/redirect",
            },
            expectedOAuthConfig: {
                clientId: Config.CLIENT_ID,
                clientSecret: Config.CLIENT_SECRET,
            },
            expectedGetTokenParams: {
                code: "loginCode",
                redirect_uri: "http://localhost/redirect",
            },
        },
        {
            platform: Platform.IOS,
            loginRequest: {
                code: "loginCode",
                redirectUri: "http://localhost/redirect",
                codeVerifier: "codeVerifier123",
            },
            expectedOAuthConfig: {
                clientId: Config.IOS_CLIENT_ID,
            },
            expectedGetTokenParams: {
                code: "loginCode",
                redirect_uri: "http://localhost/redirect",
                codeVerifier: "codeVerifier123",
            },
        },
        {
            platform: Platform.ANDROID,
            loginRequest: {
                code: "loginCode",
                redirectUri: "http://localhost/redirect",
                codeVerifier: "codeVerifier123",
            },
            expectedOAuthConfig: {
                clientId: Config.ANDROID_CLIENT_ID,
            },
            expectedGetTokenParams: {
                code: "loginCode",
                redirect_uri: "http://localhost/redirect",
                codeVerifier: "codeVerifier123",
            },
        },
    ])(
        "for $platform platform",
        ({
            platform,
            loginRequest,
            expectedOAuthConfig,
            expectedGetTokenParams,
        }) => {
            it("should login with a valid code", async () => {
                const start = Math.floor(Date.now() / 1000);
                const res = await post(`/auth/login/${platform}`)
                    .send(loginRequest)
                    .expect(StatusCodes.OK);

                expect(mockOAuth2Client).toHaveBeenCalledWith(
                    expectedOAuthConfig
                );
                expect(mockGetToken).toHaveBeenCalledWith(
                    expectedGetTokenParams
                );
                expect(mockVerifyIdToken).toHaveBeenCalledWith({
                    idToken: ID_TOKEN,
                });

                expect(res.body).toHaveProperty("token");
                const jwtPayload = jsonwebtoken.verify(
                    res.body.token,
                    Config.JWT_SIGNING_SECRET
                ) as JwtPayload;

                const expected = {
                    email: TESTER.email,
                    displayName: TESTER.displayName,
                    roles: [],
                    userId: TESTER.userId,
                };
                expect(jwtPayload).toMatchObject(expected);
                expect(jwtPayload.iat).toBeGreaterThanOrEqual(start);

                const stored = await Database.ROLES.findOne({
                    userId: TESTER.userId,
                });
                expect(stored?.toObject()).toMatchObject(expected);
            });

            it("fails to login with an invalid code", async () => {
                mockGetToken.mockImplementation(() => {
                    throw new Error("Test invalid code");
                });
                const res = await post(`/auth/login/${platform}`)
                    .send(loginRequest)
                    .expect(StatusCodes.BAD_REQUEST);

                expect(mockOAuth2Client).toHaveBeenCalledWith(
                    expectedOAuthConfig
                );
                expect(mockGetToken).toHaveBeenCalledWith(
                    expectedGetTokenParams
                );
                expect(mockVerifyIdToken).not.toHaveBeenCalled();

                expect(res.body).toHaveProperty("error", "InvalidToken");

                const stored = await Database.ROLES.findOne({
                    userId: TESTER.userId,
                });
                expect(stored).toBeNull();
            });

            it("fails to login with no id token", async () => {
                mockGetToken.mockImplementation(() => ({ tokens: {} }));
                const res = await post(`/auth/login/${platform}`)
                    .send(loginRequest)
                    .expect(StatusCodes.BAD_REQUEST);

                expect(mockOAuth2Client).toHaveBeenCalledWith(
                    expectedOAuthConfig
                );
                expect(mockGetToken).toHaveBeenCalledWith(
                    expectedGetTokenParams
                );
                expect(mockVerifyIdToken).not.toHaveBeenCalled();

                expect(res.body).toHaveProperty("error", "InvalidToken");

                const stored = await Database.ROLES.findOne({
                    userId: TESTER.userId,
                });
                expect(stored).toBeNull();
            });

            it("fails to login when ticket has no payload", async () => {
                mockVerifyIdToken.mockImplementation(() => ({
                    getPayload: () => undefined,
                }));
                const res = await post(`/auth/login/${platform}`)
                    .send(loginRequest)
                    .expect(StatusCodes.BAD_REQUEST);

                expect(mockOAuth2Client).toHaveBeenCalledWith(
                    expectedOAuthConfig
                );
                expect(mockGetToken).toHaveBeenCalledWith(
                    expectedGetTokenParams
                );
                expect(mockVerifyIdToken).toHaveBeenCalledWith({
                    idToken: ID_TOKEN,
                });

                expect(res.body).toHaveProperty("error", "InvalidToken");

                const stored = await Database.ROLES.findOne({
                    userId: TESTER.userId,
                });
                expect(stored).toBeNull();
            });

            it.each(["email", "sub", "name"])(
                "fails to login when missing scopes (missing payload.%s)",
                async (payloadProp) => {
                    mockVerifyIdToken.mockImplementation(() => ({
                        getPayload: () => {
                            const payload = {
                                ...AUTH_PAYLOAD,
                            };
                            delete payload[payloadProp as keyof typeof payload];
                            return payload;
                        },
                    }));
                    const res = await post(`/auth/login/${platform}`)
                        .send(loginRequest)
                        .expect(StatusCodes.BAD_REQUEST);

                    expect(mockOAuth2Client).toHaveBeenCalledWith(
                        expectedOAuthConfig
                    );
                    expect(mockGetToken).toHaveBeenCalledWith(
                        expectedGetTokenParams
                    );
                    expect(mockVerifyIdToken).toHaveBeenCalledWith({
                        idToken: ID_TOKEN,
                    });

                    expect(res.body).toHaveProperty("error", "InvalidScopes");

                    const stored = await Database.ROLES.findOne({
                        userId: TESTER.userId,
                    });
                    expect(stored).toBeNull();
                }
            );
        }
    );

    // Mobile platform-specific test for missing codeVerifier
    it.each([Platform.IOS, Platform.ANDROID])(
        "fails to login for %s when codeVerifier is missing",
        async (platform) => {
            const invalidRequest = {
                code: "loginCode",
                redirectUri: "http://localhost/redirect",
            };
            const res = await post(`/auth/login/${platform}`)
                .send(invalidRequest)
                .expect(StatusCodes.BAD_REQUEST);

            expect(res.body).toHaveProperty("error", "InvalidRequest");
        }
    );
});

describe("GET /auth/corporate", () => {
    it("should get all corporate users", async () => {
        const res = await getAsAdmin("/auth/corporate").expect(StatusCodes.OK);
        expect(res.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining(CORPORATE_USER),
                expect.objectContaining(CORPORATE_OTHER_USER),
            ])
        );
    });

    it("should require admin permissions", async () => {
        const res = await getAsStaff("/auth/corporate").expect(
            StatusCodes.FORBIDDEN
        );
        expect(res.body).toHaveProperty("error", "Forbidden");
    });
});

describe("POST /auth/corporate", () => {
    const NEW_CORPORATE = {
        email: "new@corp.corp",
        name: "The New Guy",
    } satisfies Corporate;

    it("should create a corporate user", async () => {
        const res = await postAsAdmin("/auth/corporate")
            .send(NEW_CORPORATE)
            .expect(StatusCodes.CREATED);
        expect(res.body).toMatchObject(NEW_CORPORATE);
        const stored = await Database.CORPORATE.findOne({
            email: NEW_CORPORATE.email,
        });
        expect(stored?.toObject()).toMatchObject(NEW_CORPORATE);
    });

    it("should not overwrite existing", async () => {
        const res = await postAsAdmin("/auth/corporate")
            .send({
                ...NEW_CORPORATE,
                email: CORPORATE_USER.email,
            })
            .expect(StatusCodes.BAD_REQUEST);
        expect(res.body).toHaveProperty("error", "AlreadyExists");

        const stored = await Database.CORPORATE.findOne({
            email: CORPORATE_USER.email,
        });
        expect(stored?.toObject()).toMatchObject(CORPORATE_USER);
    });

    it("should require admin permissions", async () => {
        const res = await postAsStaff("/auth/corporate")
            .send(NEW_CORPORATE)
            .expect(StatusCodes.FORBIDDEN);
        expect(res.body).toHaveProperty("error", "Forbidden");
        const stored = await Database.CORPORATE.findOne({
            email: NEW_CORPORATE.email,
        });
        expect(stored?.toObject()).toBeUndefined();
    });
});

describe("DELETE /auth/corporate", () => {
    it("should delete a corporate user", async () => {
        await delAsAdmin("/auth/corporate")
            .send({ email: CORPORATE_USER.email })
            .expect(StatusCodes.NO_CONTENT);
        const stored = await Database.CORPORATE.findOne({
            email: CORPORATE_USER.email,
        });
        expect(stored?.toObject()).toBeUndefined();
    });

    it("fails to delete a nonexistent user", async () => {
        const res = await delAsAdmin("/auth/corporate")
            .send({ email: "nonexistent@fake.com" })
            .expect(StatusCodes.BAD_REQUEST);
        expect(res.body).toHaveProperty("error", "NotFound");
    });

    it("should require admin permissions", async () => {
        const res = await delAsStaff("/auth/corporate")
            .send({ email: CORPORATE_USER.email })
            .expect(StatusCodes.FORBIDDEN);
        expect(res.body).toHaveProperty("error", "Forbidden");
        const stored = await Database.CORPORATE.findOne({
            email: CORPORATE_USER.email,
        });
        expect(stored?.toObject()).toMatchObject(CORPORATE_USER);
    });
});

describe("GET /auth/info", () => {
    it("should get user info", async () => {
        const res = await getAsUser("/auth/info").expect(StatusCodes.OK);
        expect(res.body).toEqual(TESTER_USER);
    });
});

describe("GET /auth/:ROLE", () => {
    it("should get users with user role", async () => {
        const res = await getAsStaff("/auth/USER").expect(StatusCodes.OK);
        expect(res.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining(TESTER_USER),
                expect.objectContaining(OTHER_USER),
            ])
        );
    });

    it("should get users with staff role", async () => {
        const res = await getAsStaff("/auth/USER").expect(StatusCodes.OK);
        expect(res.body).toEqual(
            expect.arrayContaining([expect.objectContaining(OTHER_USER)])
        );
    });

    it("should require staff permissions", async () => {
        const res = await getAsUser("/auth/STAFF").expect(
            StatusCodes.FORBIDDEN
        );
        expect(res.body).toHaveProperty("error", "Forbidden");
    });
});
