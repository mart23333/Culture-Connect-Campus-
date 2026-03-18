const request = require("supertest");
const app = require("../server");

describe("CultureConnect Campus", () => {

  test("Home page should load", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
  });

  test("Signup page should load", async () => {
    const res = await request(app).get("/signup");
    expect(res.statusCode).toBe(200);
  });

  test("Login page should load", async () => {
    const res = await request(app).get("/login");
    expect(res.statusCode).toBe(200);
  });

  test("Events route should redirect if not logged in", async () => {
    const res = await request(app).get("/events");
    expect(res.statusCode).toBe(302);
  });

});