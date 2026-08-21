import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GoogleSignInButton from "./GoogleSignInButton";
import { AuthProvider } from "../../context/AuthContext";

vi.mock("../../lib/socket", () => ({
  disconnectSocket: vi.fn(),
  connectSocket: vi.fn(),
}));

vi.mock("../../utils/googleAuthConfig", () => ({ hasGoogleAuth: true }));


globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Element.prototype.getBoundingClientRect = () => ({
  width: 400,
  height: 40,
  top: 0,
  left: 0,
  right: 400,
  bottom: 40,
  x: 0,
  y: 0,
  toJSON() {},
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// Stand-in for Google's real button — fires onSuccess with a fake
// credential the moment it's clicked, so the test drives the same
// handleSuccess logic the real button would trigger.
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: ({ onSuccess }) => (
    <button onClick={() => onSuccess({ credential: "fake-credential" })}>Continue with Google</button>
  ),
}));

const mockGoogleAuth = vi.fn();
vi.mock("../../services/authService", () => ({
  googleAuth: (...args) => mockGoogleAuth(...args),
}));

function renderButton(props = {}) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <GoogleSignInButton onError={vi.fn()} {...props} />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    mockGoogleAuth.mockReset();
  });

  test("roleChosen=true (Register) signs in immediately with the given role, no prompt", async () => {
    mockGoogleAuth.mockResolvedValue({
      data: { token: "tok", user: { _id: "u1", name: "Priya", role: "collector" } },
    });
    renderButton({ roleChosen: true, wantsToBeCollector: true });

    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() =>
      expect(mockGoogleAuth).toHaveBeenCalledWith({
        credential: "fake-credential",
        wantsToBeCollector: true,
        roleChosen: true,
      })
    );
    expect(screen.queryByText("How will you use ScrapConnect?")).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith("/collector");
  });

  test("roleChosen=false (Login), an existing account signs in immediately with no prompt", async () => {
    mockGoogleAuth.mockResolvedValue({
      data: { token: "tok", user: { _id: "u1", name: "Priya", role: "user" } },
    });
    renderButton({ roleChosen: false });

    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() =>
      expect(mockGoogleAuth).toHaveBeenCalledWith({ credential: "fake-credential", roleChosen: false })
    );
    expect(screen.queryByText("How will you use ScrapConnect?")).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  test("roleChosen=false (Login), a brand new account shows the role picker instead of signing in", async () => {
    mockGoogleAuth.mockResolvedValue({ data: { needsRole: true } });
    renderButton({ roleChosen: false });

    fireEvent.click(screen.getByText("Continue with Google"));

    expect(await screen.findByText("How will you use ScrapConnect?")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("choosing a role in the picker resubmits with roleChosen: true and completes sign-in", async () => {
    mockGoogleAuth
      .mockResolvedValueOnce({ data: { needsRole: true } })
      .mockResolvedValueOnce({
        data: { token: "tok", user: { _id: "u2", name: "Raj", role: "collector" } },
      });
    renderButton({ roleChosen: false });

    fireEvent.click(screen.getByText("Continue with Google"));
    await screen.findByText("How will you use ScrapConnect?");

    fireEvent.click(screen.getByText("I want to collect scrap"));

    await waitFor(() =>
      expect(mockGoogleAuth).toHaveBeenLastCalledWith({
        credential: "fake-credential",
        wantsToBeCollector: true,
        roleChosen: true,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/collector");
  });

  test("choosing 'requester' in the picker sends wantsToBeCollector: false", async () => {
    mockGoogleAuth
      .mockResolvedValueOnce({ data: { needsRole: true } })
      .mockResolvedValueOnce({
        data: { token: "tok", user: { _id: "u3", name: "Priya", role: "user" } },
      });
    renderButton({ roleChosen: false });

    fireEvent.click(screen.getByText("Continue with Google"));
    await screen.findByText("How will you use ScrapConnect?");

    fireEvent.click(screen.getByText("I have scrap to sell"));

    await waitFor(() =>
      expect(mockGoogleAuth).toHaveBeenLastCalledWith({
        credential: "fake-credential",
        wantsToBeCollector: false,
        roleChosen: true,
      })
    );
  });

  test("canceling the role picker does not sign the person in", async () => {
    mockGoogleAuth.mockResolvedValue({ data: { needsRole: true } });
    renderButton({ roleChosen: false });

    fireEvent.click(screen.getByText("Continue with Google"));
    await screen.findByText("How will you use ScrapConnect?");

    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByText("How will you use ScrapConnect?")).not.toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoogleAuth).toHaveBeenCalledTimes(1); // only the initial probe call
  });

  test("calls onError with the server's message when sign-in fails", async () => {
    const onError = vi.fn();
    mockGoogleAuth.mockRejectedValue({ response: { data: { message: "This account has been deactivated" } } });
    renderButton({ roleChosen: false, onError });

    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => expect(onError).toHaveBeenCalledWith("This account has been deactivated"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});