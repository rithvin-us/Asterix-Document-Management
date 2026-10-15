import "./setup.js";
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createUser } from "./helpers.js";

const app = createApp();

async function loginAs(username: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return res.body.token as string;
}

describe("Admin user management", () => {
  let adminToken: string;

  beforeEach(async () => {
    const { password } = await createUser({ username: "admin1", password: "pass1234", role: "ADMIN" });
    adminToken = await loginAs("admin1", password);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });

  it("refuses a non-admin caller", async () => {
    const { password } = await createUser({ username: "member1", password: "pass1234", role: "MEMBER" });
    const memberToken = await loginAs("member1", password);

    const res = await request(app).get("/api/users").set("Authorization", `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it("lists users without ever exposing password hashes", async () => {
    const res = await request(app).get("/api/users").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const user of res.body.data) {
      expect(user.passwordHash).toBeUndefined();
    }
  });

  it("creates a user and returns it without the password hash", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "NewTreasurer", password: "pass1234", displayName: "New Treasurer", role: "TREASURER" });

    expect(res.status).toBe(201);
    expect(res.body.data.username).toBe("newtreasurer");
    expect(res.body.data.passwordHash).toBeUndefined();

    const token = await loginAs("newtreasurer", "pass1234");
    expect(typeof token).toBe("string");
  });

  // Regression: these error paths used to answer { error: { message } } while every other route
  // (and the frontend's apiErrorMessage helper) expects error to be a plain string.
  it("reports a duplicate username as a string error message", async () => {
    await createUser({ username: "taken", password: "pass1234", role: "MEMBER" });

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "taken", password: "pass1234", displayName: "Dupe", role: "MEMBER" });

    expect(res.status).toBe(409);
    expect(typeof res.body.error).toBe("string");
  });

  it("rejects a username that differs only by case", async () => {
    await createUser({ username: "casey", password: "pass1234", role: "MEMBER" });

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "CASEY", password: "pass1234", displayName: "Casey Again", role: "MEMBER" });

    expect(res.status).toBe(409);
  });

  it("rejects a too-short password with a string error message", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "shorty", password: "ab", displayName: "Shorty", role: "MEMBER" });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("rejects an unknown role", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "sneaky", password: "pass1234", displayName: "Sneaky", role: "SUPERUSER" });

    expect(res.status).toBe(400);
  });

  it("resets a password and lets the user log in with the new one", async () => {
    const { user } = await createUser({ username: "resetme", password: "pass1234", role: "MEMBER" });

    const res = await request(app)
      .patch(`/api/users/${user.id}/password`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ newPassword: "brand-new-pass" });

    expect(res.status).toBe(200);

    const login = await request(app).post("/api/auth/login").send({ username: "resetme", password: "brand-new-pass" });
    expect(login.status).toBe(200);
  });

  it("rejects a too-short reset password", async () => {
    const { user } = await createUser({ username: "resetme2", password: "pass1234", role: "MEMBER" });

    const res = await request(app)
      .patch(`/api/users/${user.id}/password`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ newPassword: "ab" });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("returns 404 for a password reset on an unknown user", async () => {
    const res = await request(app)
      .patch("/api/users/000000000000000000000000/password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ newPassword: "brand-new-pass" });

    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe("string");
  });
});
