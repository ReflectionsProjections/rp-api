import { describe, expect, it } from "@jest/globals";
import { StatusCodes } from "http-status-codes";
import { get } from "../testing/testingTools";

describe("general app test", () => {
    it("app should be running", async () => {
        const response = await get("/status", undefined).expect(StatusCodes.OK);
        expect(response.body).toMatchObject({
            ok: true,
            message: "API is alive!",
        });
    });
});
