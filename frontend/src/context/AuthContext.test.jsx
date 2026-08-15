import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

const mockDisconnectSocket = vi.fn();
vi.mock("../lib/socket", () => ({
  disconnectSocket: (...args) => mockDisconnectSocket(...args),
  connectSocket: vi.fn(),
}));

function TestConsumer() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="user">{user ? `${user.name}:${user.role}` : "none"}</div>
      <button onClick={() => login("tok-123", { name: "Raj", role: "collector" })}>Log in</button>
      <button onClick={logout}>Log out</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    mockDisconnectSocket.mockClear();
  });

  test("starts logged out when localStorage has nothing", () => {
    renderWithProvider();
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  test("hydrates the user synchronously from localStorage on mount", () => {
    localStorage.setItem("token", "existing-token");
    localStorage.setItem("user", JSON.stringify({ name: "Priya", role: "user" }));
    renderWithProvider();
    expect(screen.getByTestId("user")).toHaveTextContent("Priya:user");
  });

  test("treats a stored user with no token as logged out", () => {
    localStorage.setItem("user", JSON.stringify({ name: "Priya", role: "user" }));
    renderWithProvider();
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  test("clears corrupted stored user data instead of crashing", () => {
    localStorage.setItem("token", "tok");
    localStorage.setItem("user", "{not valid json");
    renderWithProvider();
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });

  test("login stores the token and user, and updates state", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Log in"));
    expect(screen.getByTestId("user")).toHaveTextContent("Raj:collector");
    expect(localStorage.getItem("token")).toBe("tok-123");
    expect(JSON.parse(localStorage.getItem("user"))).toEqual({ name: "Raj", role: "collector" });
  });

  test("logout clears storage, disconnects the socket, and resets state", () => {
    localStorage.setItem("token", "tok");
    localStorage.setItem("user", JSON.stringify({ name: "Raj", role: "collector" }));
    renderWithProvider();

    fireEvent.click(screen.getByText("Log out"));

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(mockDisconnectSocket).toHaveBeenCalledTimes(1);
  });

  test("syncs state when another tab changes the stored user", () => {
    renderWithProvider();
    expect(screen.getByTestId("user")).toHaveTextContent("none");

    // Simulate another tab logging in and firing the storage event —
    // localStorage itself doesn't trigger 'storage' in the same tab that
    // wrote it, so this mirrors what a real cross-tab update looks like.
    localStorage.setItem("token", "tok-from-other-tab");
    localStorage.setItem("user", JSON.stringify({ name: "OtherTab", role: "admin" }));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "user" }));
    });

    expect(screen.getByTestId("user")).toHaveTextContent("OtherTab:admin");
  });

  test("ignores storage events for unrelated keys", () => {
    localStorage.setItem("token", "tok");
    localStorage.setItem("user", JSON.stringify({ name: "Raj", role: "collector" }));
    renderWithProvider();

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "some-other-key" }));
    });

    expect(screen.getByTestId("user")).toHaveTextContent("Raj:collector");
  });
});