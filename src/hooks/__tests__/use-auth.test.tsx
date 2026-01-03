import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Define mocks using vi.hoisted
const {
  mockPush,
  mockSignInAction,
  mockSignUpAction,
  mockGetAnonWorkData,
  mockClearAnonWork,
  mockGetProjects,
  mockCreateProject,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSignInAction: vi.fn(),
  mockSignUpAction: vi.fn(),
  mockGetAnonWorkData: vi.fn(),
  mockClearAnonWork: vi.fn(),
  mockGetProjects: vi.fn(),
  mockCreateProject: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth actions
vi.mock("@/actions", () => ({
  signIn: mockSignInAction,
  signUp: mockSignUpAction,
}));

// Mock anon-work-tracker
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: mockGetAnonWorkData,
  clearAnonWork: mockClearAnonWork,
}));

// Mock get-projects action
vi.mock("@/actions/get-projects", () => ({
  getProjects: mockGetProjects,
}));

// Mock create-project action
vi.mock("@/actions/create-project", () => ({
  createProject: mockCreateProject,
}));

import { useAuth } from "@/hooks/use-auth";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-project-123" });
  });

  describe("initial state", () => {
    test("returns signIn, signUp functions and isLoading state", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.signIn).toBeInstanceOf(Function);
      expect(result.current.signUp).toBeInstanceOf(Function);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signIn", () => {
    test("calls signInAction with email and password", async () => {
      mockSignInAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockSignInAction).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
    });

    test("sets isLoading to true during sign in", async () => {
      let resolveSignIn: (value: { success: boolean }) => void;
      mockSignInAction.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignIn = resolve;
          })
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signInPromise: Promise<unknown>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "password123");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolveSignIn!({ success: false });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns result from signInAction", async () => {
      const expectedResult = { success: true };
      mockSignInAction.mockResolvedValue(expectedResult);

      const { result } = renderHook(() => useAuth());

      let signInResult: unknown;
      await act(async () => {
        signInResult = await result.current.signIn(
          "test@example.com",
          "password123"
        );
      });

      expect(signInResult).toEqual(expectedResult);
    });

    test("returns error result when signIn fails", async () => {
      const expectedResult = { success: false, error: "Invalid credentials" };
      mockSignInAction.mockResolvedValue(expectedResult);

      const { result } = renderHook(() => useAuth());

      let signInResult: unknown;
      await act(async () => {
        signInResult = await result.current.signIn(
          "test@example.com",
          "wrongpassword"
        );
      });

      expect(signInResult).toEqual(expectedResult);
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to false even when signIn throws", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password123");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("calls signUpAction with email and password", async () => {
      mockSignUpAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(mockSignUpAction).toHaveBeenCalledWith(
        "newuser@example.com",
        "password123"
      );
    });

    test("sets isLoading to true during sign up", async () => {
      let resolveSignUp: (value: { success: boolean }) => void;
      mockSignUpAction.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignUp = resolve;
          })
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signUpPromise: Promise<unknown>;
      act(() => {
        signUpPromise = result.current.signUp(
          "newuser@example.com",
          "password123"
        );
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolveSignUp!({ success: false });
        await signUpPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns result from signUpAction", async () => {
      const expectedResult = { success: true };
      mockSignUpAction.mockResolvedValue(expectedResult);

      const { result } = renderHook(() => useAuth());

      let signUpResult: unknown;
      await act(async () => {
        signUpResult = await result.current.signUp(
          "newuser@example.com",
          "password123"
        );
      });

      expect(signUpResult).toEqual(expectedResult);
    });

    test("returns error result when signUp fails", async () => {
      const expectedResult = { success: false, error: "Email already exists" };
      mockSignUpAction.mockResolvedValue(expectedResult);

      const { result } = renderHook(() => useAuth());

      let signUpResult: unknown;
      await act(async () => {
        signUpResult = await result.current.signUp(
          "existing@example.com",
          "password123"
        );
      });

      expect(signUpResult).toEqual(expectedResult);
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to false even when signUp throws", async () => {
      mockSignUpAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("newuser@example.com", "password123");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("handlePostSignIn behavior", () => {
    describe("when anonymous work exists", () => {
      test("creates project with anonymous work data and redirects", async () => {
        const anonWork = {
          messages: [{ role: "user", content: "Hello" }],
          fileSystemData: { "/App.tsx": "code" },
        };
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockCreateProject.mockResolvedValue({ id: "anon-project-456" });
        mockSignInAction.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^Design from /),
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        });
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/anon-project-456");
      });

      test("does not fetch existing projects when anonymous work exists", async () => {
        const anonWork = {
          messages: [{ role: "user", content: "Hello" }],
          fileSystemData: {},
        };
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockSignInAction.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockGetProjects).not.toHaveBeenCalled();
      });

      test("ignores anonymous work with empty messages", async () => {
        const anonWork = {
          messages: [],
          fileSystemData: {},
        };
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockGetProjects.mockResolvedValue([{ id: "existing-project" }]);
        mockSignInAction.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockGetProjects).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/existing-project");
      });
    });

    describe("when user has existing projects", () => {
      test("redirects to most recent project", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([
          { id: "recent-project" },
          { id: "older-project" },
        ]);
        mockSignInAction.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/recent-project");
        expect(mockCreateProject).not.toHaveBeenCalled();
      });
    });

    describe("when user has no projects", () => {
      test("creates a new project and redirects", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "brand-new-project" });
        mockSignInAction.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^New Design #\d+$/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
      });
    });

    describe("post sign-in behavior for signUp", () => {
      test("handles post sign-up flow the same as sign-in", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([{ id: "first-project" }]);
        mockSignUpAction.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("newuser@example.com", "password123");
        });

        expect(mockGetProjects).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/first-project");
      });

      test("creates new project for new user with no projects", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "new-user-project" });
        mockSignUpAction.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("newuser@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/new-user-project");
      });
    });
  });

  describe("edge cases", () => {
    test("handles null anonymous work data", async () => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-project" });
      mockSignInAction.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalled();
    });

    test("does not redirect when sign in fails", async () => {
      mockSignInAction.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("does not redirect when sign up fails", async () => {
      mockSignUpAction.mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("existing@example.com", "password123");
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});