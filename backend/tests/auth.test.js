// Mock the User model so these tests exercise controller + middleware logic
// (status codes, JWT issuing/verifying, error handling) without needing a
// live MongoDB connection. bcrypt itself runs for real via User's instance
// methods being invoked on our fake returned objects below.
jest.mock("../models/User");

process.env.JWT_SECRET = "test_secret_for_jest";
process.env.JWT_EXPIRES_IN = "1h";

const request = require("supertest");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const app = require("../app");

describe("Auth routes", () => {
  afterEach(() => jest.clearAllMocks());

  describe("POST /api/auth/register", () => {
    it("creates a user and returns a token", async () => {
      User.findOne.mockResolvedValue(null); // no existing user with this email
      User.create.mockResolvedValue({
        _id: "652f1f77bcf86cd799439011",
        name: "Alex",
        email: "alex@example.com",
      });

      const res = await request(app).post("/api/auth/register").send({
        name: "Alex",
        email: "alex@example.com",
        password: "secret123",
      });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("alex@example.com");
    });

    it("rejects a missing field with 400", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "alex@example.com",
        password: "secret123",
      });
      expect(res.status).toBe(400);
    });

    it("rejects a duplicate email with 409", async () => {
      User.findOne.mockResolvedValue({ _id: "existing-id" });

      const res = await request(app).post("/api/auth/register").send({
        name: "Alex",
        email: "alex@example.com",
        password: "secret123",
      });

      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in with correct credentials", async () => {
      const hashed = await bcrypt.hash("secret123", 10);
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: "652f1f77bcf86cd799439011",
          name: "Alex",
          email: "alex@example.com",
          password: hashed,
          comparePassword: (candidate) => bcrypt.compare(candidate, hashed),
        }),
      });

      const res = await request(app).post("/api/auth/login").send({
        email: "alex@example.com",
        password: "secret123",
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it("rejects an incorrect password with 401", async () => {
      const hashed = await bcrypt.hash("secret123", 10);
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: "652f1f77bcf86cd799439011",
          email: "alex@example.com",
          password: hashed,
          comparePassword: (candidate) => bcrypt.compare(candidate, hashed),
        }),
      });

      const res = await request(app).post("/api/auth/login").send({
        email: "alex@example.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
    });

    it("rejects a nonexistent email with 401", async () => {
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      const res = await request(app).post("/api/auth/login").send({
        email: "nobody@example.com",
        password: "whatever",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/me (protected)", () => {
    it("rejects a request with no token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("rejects a malformed/invalid token", async () => {
      const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-real-token");
      expect(res.status).toBe(401);
    });

    it("accepts a valid token and returns the user", async () => {
      const jwt = require("jsonwebtoken");
      const token = jwt.sign({ id: "652f1f77bcf86cd799439011" }, process.env.JWT_SECRET);

      User.findById.mockResolvedValue({
        _id: "652f1f77bcf86cd799439011",
        name: "Alex",
        email: "alex@example.com",
      });

      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("alex@example.com");
    });
  });
});
