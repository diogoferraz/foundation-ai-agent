import request from "supertest";
import app from "../../src/app";

describe("GET /api/v1/health-check", () => {
    it("should return 200 and health status", async () => {
        const response = await request(app).get("/api/v1/health-check");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: "Health check" });
    });
});
