import { test, expect, vi, beforeEach, describe } from "vitest";

// Use vi.hoisted to define mock values that can be used in vi.mock
const {
  mockSign,
  mockSetProtectedHeader,
  mockSetExpirationTime,
  mockSetIssuedAt,
  MockSignJWT,
  mockJwtVerify,
  mockCookieStore,
} = vi.hoisted(() => {
  const mockSign = vi.fn().mockResolvedValue("mock-jwt-token");
  const mockSetProtectedHeader = vi.fn().mockReturnThis();
  const mockSetExpirationTime = vi.fn().mockReturnThis();
  const mockSetIssuedAt = vi.fn().mockReturnThis();

  const MockSignJWT = vi.fn().mockImplementation(() => ({
    setProtectedHeader: mockSetProtectedHeader,
    setExpirationTime: mockSetExpirationTime,
    setIssuedAt: mockSetIssuedAt,
    sign: mockSign,
  }));

  const mockJwtVerify = vi.fn();

  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  return {
    mockSign,
    mockSetProtectedHeader,
    mockSetExpirationTime,
    mockSetIssuedAt,
    MockSignJWT,
    mockJwtVerify,
    mockCookieStore,
  };
});

// Mock server-only to prevent import errors
vi.mock("server-only", () => ({}));

// Mock jose
vi.mock("jose", () => ({
  SignJWT: MockSignJWT,
  jwtVerify: mockJwtVerify,
}));

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

import type { NextRequest } from "next/server";
import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "@/lib/auth";

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReset();
    mockCookieStore.set.mockReset();
    mockCookieStore.delete.mockReset();
    mockJwtVerify.mockReset();
    MockSignJWT.mockClear();
    mockSetProtectedHeader.mockClear();
    mockSetExpirationTime.mockClear();
    mockSetIssuedAt.mockClear();
    mockSign.mockClear();
  });

  describe("createSession", () => {
    test("creates a JWT with correct payload and sets cookie", async () => {
      await createSession("user-123", "test@example.com");

      // Verify SignJWT was called with correct payload
      expect(MockSignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          email: "test@example.com",
          expiresAt: expect.any(Date),
        })
      );

      // Verify JWT configuration
      expect(mockSetProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
      expect(mockSetExpirationTime).toHaveBeenCalledWith("7d");
      expect(mockSetIssuedAt).toHaveBeenCalled();
      expect(mockSign).toHaveBeenCalled();

      // Verify cookie was set with correct options
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        "mock-jwt-token",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          expires: expect.any(Date),
        })
      );
    });

    test("session expires in 7 days", async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      await createSession("user-123", "test@example.com");

      const setCookieCall = mockCookieStore.set.mock.calls[0];
      const cookieOptions = setCookieCall[2];
      const expiresAt = cookieOptions.expires;

      // Should expire in approximately 7 days
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(expiresAt.getTime()).toBeCloseTo(now + sevenDaysMs, -3);

      vi.useRealTimers();
    });
  });

  describe("getSession", () => {
    test("returns session payload when valid token exists", async () => {
      const mockPayload = {
        userId: "user-123",
        email: "test@example.com",
        expiresAt: new Date(),
      };

      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      mockJwtVerify.mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: "HS256" },
      });

      const session = await getSession();

      expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
      expect(mockJwtVerify).toHaveBeenCalled();
      expect(mockJwtVerify.mock.calls[0][0]).toBe("valid-token");
      // Second argument is the JWT secret as Uint8Array
      expect(mockJwtVerify.mock.calls[0][1]).toBeDefined();
      expect(session).toEqual(mockPayload);
    });

    test("returns null when no token cookie exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const session = await getSession();

      expect(session).toBeNull();
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    test("returns null when token cookie has no value", async () => {
      mockCookieStore.get.mockReturnValue({ value: undefined });

      const session = await getSession();

      expect(session).toBeNull();
    });

    test("returns null when token verification fails", async () => {
      mockCookieStore.get.mockReturnValue({ value: "invalid-token" });
      mockJwtVerify.mockRejectedValue(new Error("Invalid token"));

      const session = await getSession();

      expect(session).toBeNull();
    });

    test("returns null when token is expired", async () => {
      mockCookieStore.get.mockReturnValue({ value: "expired-token" });
      mockJwtVerify.mockRejectedValue(new Error("Token expired"));

      const session = await getSession();

      expect(session).toBeNull();
    });
  });

  describe("deleteSession", () => {
    test("deletes the auth cookie", async () => {
      await deleteSession();

      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
    });
  });

  describe("verifySession", () => {
    test("returns session payload when valid token in request", async () => {
      const mockPayload = {
        userId: "user-456",
        email: "user@example.com",
        expiresAt: new Date(),
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: "HS256" },
      });

      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "request-token" }),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(mockRequest.cookies.get).toHaveBeenCalledWith("auth-token");
      expect(mockJwtVerify).toHaveBeenCalled();
      expect(mockJwtVerify.mock.calls[0][0]).toBe("request-token");
      // Second argument is the JWT secret as Uint8Array
      expect(mockJwtVerify.mock.calls[0][1]).toBeDefined();
      expect(session).toEqual(mockPayload);
    });

    test("returns null when no token in request cookies", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    test("returns null when request cookie has no value", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: undefined }),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
    });

    test("returns null when request token verification fails", async () => {
      mockJwtVerify.mockRejectedValue(new Error("Invalid signature"));

      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "bad-token" }),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
    });

    test("returns null when request token is malformed", async () => {
      mockJwtVerify.mockRejectedValue(new Error("Malformed JWT"));

      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "not-a-jwt" }),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
    });
  });
});
