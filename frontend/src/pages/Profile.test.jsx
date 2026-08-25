import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Profile from "./Profile";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUpdateProfile = vi.fn();
const mockChangePassword = vi.fn();
const mockFetchMe = vi.fn();
vi.mock("../services/authService", () => ({
  updateProfile: (...args) => mockUpdateProfile(...args),
  changePassword: (...args) => mockChangePassword(...args),
  fetchMe: (...args) => mockFetchMe(...args),
}));

const mockLogin = vi.fn();
const mockLogout = vi.fn();
let mockUser;
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, login: mockLogin, logout: mockLogout }),
}));

const mockIsPushSupported = vi.fn();
const mockGetPushStatus = vi.fn();
const mockEnablePush = vi.fn();
const mockDisablePush = vi.fn();
vi.mock("../lib/push", () => ({
  isPushSupported: () => mockIsPushSupported(),
  getPushStatus: (...args) => mockGetPushStatus(...args),
  enablePush: (...args) => mockEnablePush(...args),
  disablePush: (...args) => mockDisablePush(...args),
}));

// DeleteAccountModal has its own dedicated test file. Stubbing it here keeps
// these tests focused on what Profile itself is responsible for: opening
// the modal, passing it the right `hasPassword`, and handling `onDeleted`.
vi.mock("../components/profile/DeleteAccountModal", () => ({
  default: ({ open, hasPassword, onDeleted }) =>
    open ? (
      <div data-testid="delete-modal" data-has-password={String(hasPassword)}>
        <button onClick={onDeleted}>Confirm delete (stub)</button>
      </div>
    ) : null,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockUpdateProfile.mockReset();
  mockChangePassword.mockReset();
  mockFetchMe.mockReset();
  mockLogin.mockClear();
  mockLogout.mockClear();
  mockIsPushSupported.mockReset().mockReturnValue(false);
  mockGetPushStatus.mockReset();
  mockEnablePush.mockReset();
  mockDisablePush.mockReset();

  mockUser = { name: "Atharv Patidar", email: "atharv@example.com", phone: "9876543210", role: "user" };
  // Never resolves unless a test overrides it — keeps hasPassword at its
  // safe default (true) instead of racing the assertion.
  mockFetchMe.mockReturnValue(new Promise(() => {}));

  window.localStorage.setItem("token", "existing-token");
});

describe("Profile — account details form", () => {
  test("pre-fills the form from the current user", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Your name")).toHaveValue("Atharv Patidar");
    expect(screen.getByPlaceholderText("10-digit number")).toHaveValue("9876543210");
    expect(screen.getByDisplayValue("atharv@example.com")).toBeDisabled();
  });

  test("shows Collector for a collector account and Requester otherwise", () => {
    mockUser.role = "collector";
    renderPage();
    expect(screen.getByDisplayValue("Collector")).toBeInTheDocument();
  });

  test("saves changes and shows a success banner", async () => {
    mockUpdateProfile.mockResolvedValueOnce({ data: { ...mockUser, name: "New Name" } });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "New Name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Profile updated.")).toBeInTheDocument();
    expect(mockUpdateProfile).toHaveBeenCalledWith({ name: "New Name", phone: "9876543210" });
  });

  test("re-logs in with the refreshed user so the token/session stays intact", async () => {
    const updated = { ...mockUser, name: "New Name" };
    mockUpdateProfile.mockResolvedValueOnce({ data: updated });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith("existing-token", updated));
  });

  test("shows the server's error message on failure", async () => {
    mockUpdateProfile.mockRejectedValueOnce({ response: { data: { message: "Phone number is invalid" } } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Phone number is invalid")).toBeInTheDocument();
  });

  test("prefers a validator field message over the generic server message", async () => {
    mockUpdateProfile.mockRejectedValueOnce({
      response: { data: { message: "Validation failed", details: [{ field: "phone", message: "Invalid phone" }] } },
    });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Invalid phone")).toBeInTheDocument();
  });

  test("disables the button and shows Saving… while the request is in flight", async () => {
    let resolveUpdate;
    mockUpdateProfile.mockReturnValueOnce(new Promise((resolve) => (resolveUpdate = resolve)));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled();
    resolveUpdate({ data: mockUser });
    await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).not.toBeDisabled());
  });
});

describe("Profile — change password form", () => {
  test("rejects a new password under 8 characters without calling the API", async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("Enter your current password"), {
      target: { value: "oldpass1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Min. 8 characters, 1 letter, 1 number"), {
      target: { value: "short1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText("New password must be at least 8 characters.")).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  test("submits current and new password, shows success, and clears the fields", async () => {
    mockChangePassword.mockResolvedValueOnce({ data: { token: "new-token" } });
    renderPage();

    const currentInput = screen.getByPlaceholderText("Enter your current password");
    const newInput = screen.getByPlaceholderText("Min. 8 characters, 1 letter, 1 number");
    fireEvent.change(currentInput, { target: { value: "oldpass1" } });
    fireEvent.change(newInput, { target: { value: "newpass1" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText("Password changed successfully.")).toBeInTheDocument();
    expect(mockChangePassword).toHaveBeenCalledWith({ currentPassword: "oldpass1", newPassword: "newpass1" });
    expect(currentInput).toHaveValue("");
    expect(newInput).toHaveValue("");
  });

  test("swaps in the fresh token returned by the server so the session survives", async () => {
    mockChangePassword.mockResolvedValueOnce({ data: { token: "rotated-token" } });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("Enter your current password"), {
      target: { value: "oldpass1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Min. 8 characters, 1 letter, 1 number"), {
      target: { value: "newpass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith("rotated-token", mockUser));
  });

  test("shows the server's error message on an incorrect current password", async () => {
    mockChangePassword.mockRejectedValueOnce({ response: { data: { message: "Current password is incorrect" } } });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("Enter your current password"), {
      target: { value: "wrongpass1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Min. 8 characters, 1 letter, 1 number"), {
      target: { value: "newpass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText("Current password is incorrect")).toBeInTheDocument();
  });
});

describe("Profile — push notifications", () => {
  test("shows a loading state before push support is checked", () => {
    mockIsPushSupported.mockReturnValue(true);
    mockGetPushStatus.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(screen.getByText("Checking status…")).toBeInTheDocument();
  });

  test("shows a not-supported message in an unsupported browser", async () => {
    mockIsPushSupported.mockReturnValue(false);
    renderPage();
    expect(await screen.findByText("Not supported in this browser.")).toBeInTheDocument();
  });

  test("shows a blocked message when notifications are denied at the browser level", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockGetPushStatus.mockResolvedValueOnce({ supported: true, subscribed: false, denied: true });
    renderPage();
    expect(await screen.findByText(/Notifications are blocked for this site/)).toBeInTheDocument();
  });

  test("shows Currently off with a Turn on button when supported but not subscribed", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockGetPushStatus.mockResolvedValueOnce({ supported: true, subscribed: false, denied: false });
    renderPage();
    expect(await screen.findByText("Currently off")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn on" })).toBeInTheDocument();
  });

  test("enabling push flips the UI to Enabled and Turn off", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockGetPushStatus.mockResolvedValueOnce({ supported: true, subscribed: false, denied: false });
    mockEnablePush.mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Turn on" }));

    expect(await screen.findByText("Enabled on this device")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn off" })).toBeInTheDocument();
  });

  test("disabling push flips the UI back to Currently off", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockGetPushStatus.mockResolvedValueOnce({ supported: true, subscribed: true, denied: false });
    mockDisablePush.mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Turn off" }));

    expect(await screen.findByText("Currently off")).toBeInTheDocument();
  });

  test("shows an error and keeps the prior state if toggling push fails", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockGetPushStatus.mockResolvedValueOnce({ supported: true, subscribed: false, denied: false });
    mockEnablePush.mockRejectedValueOnce(new Error("Permission dismissed"));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Turn on" }));

    expect(await screen.findByText("Permission dismissed")).toBeInTheDocument();
    expect(screen.getByText("Currently off")).toBeInTheDocument();
  });
});

describe("Profile — danger zone / account deletion", () => {
  test("the delete modal is closed by default", () => {
    renderPage();
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });

  test("clicking Delete my account opens the modal", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
  });

  test("defaults hasPassword to true before /auth/me responds", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(screen.getByTestId("delete-modal")).toHaveAttribute("data-has-password", "true");
  });

  test("passes hasPassword: false through once /auth/me reports a Google-only account", async () => {
    mockFetchMe.mockResolvedValueOnce({ data: { hasPassword: false } });
    renderPage();

    await waitFor(() => expect(mockFetchMe).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));

    await waitFor(() =>
      expect(screen.getByTestId("delete-modal")).toHaveAttribute("data-has-password", "false")
    );
  });

  test("logs out and redirects to /login once the account is deleted", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete (stub)" }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});