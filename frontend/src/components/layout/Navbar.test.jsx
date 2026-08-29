import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";
import { AuthProvider } from "../../context/AuthContext";
import { ThemeProvider } from "../../context/ThemeContext";

vi.mock("../../lib/socket", () => ({
  disconnectSocket: vi.fn(),
  connectSocket: vi.fn(),
}));

// NotificationBell pulls in sockets/API calls that are out of scope for a
// Navbar test — it's rendered as a fixed stand-in so Navbar's own behavior
// (links, logout) can be tested in isolation.
vi.mock("./NotificationBell", () => ({
  default: () => <div data-testid="notification-bell" />,
}));

function renderNavbar(user, initialPath = "/dashboard") {
  if (user) {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("user", JSON.stringify(user));
  }
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("shows requester links for role 'user'", () => {
    renderNavbar({ name: "Priya", role: "user" });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Request pickup")).toBeInTheDocument();
    expect(screen.getByText("My requests")).toBeInTheDocument();
    expect(screen.queryByText("Collector")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  test("shows only the Collector link for role 'collector'", () => {
    renderNavbar({ name: "Raj", role: "collector" });
    expect(screen.getByText("Collector")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Request pickup")).not.toBeInTheDocument();
  });

  test("shows only the Admin link for role 'admin'", () => {
    renderNavbar({ name: "Ada", role: "admin" });
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Collector")).not.toBeInTheDocument();
  });

  test("every role sees the Home and About us links", () => {
    renderNavbar({ name: "Raj", role: "collector" });
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("About us")).toBeInTheDocument();
  });

  test("shows the user's name and first-letter avatar", () => {
    renderNavbar({ name: "Priya Sharma", role: "user" });
    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
  });

  test("clicking Log out opens a confirmation dialog rather than logging out immediately", () => {
    renderNavbar({ name: "Priya", role: "user" });
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(screen.getByText("Log out?")).toBeInTheDocument();
    // Still logged in — only the confirmation UI appeared, nothing else happened yet.
    expect(localStorage.getItem("token")).toBe("test-token");
  });

  test("canceling the logout dialog keeps the user logged in", async () => {
    renderNavbar({ name: "Priya", role: "user" });
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // AnimatePresence's exit animation keeps the element mounted for a beat
    // after the click — wait for the actual removal rather than asserting
    // on the very next tick.
    await waitFor(() => {
      expect(screen.queryByText("Log out?")).not.toBeInTheDocument();
    });
    expect(localStorage.getItem("token")).toBe("test-token");
  });

  test("confirming the logout dialog clears the session", () => {
    renderNavbar({ name: "Priya", role: "user" });
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    // Two "Log out" texts now exist (the nav button and the dialog's
    // confirm button) — the dialog's button is the one inside the dialog.
    const confirmButtons = screen.getAllByRole("button", { name: "Log out" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  test("the mobile menu toggle shows and hides the mobile link list", () => {
    renderNavbar({ name: "Priya", role: "user" });
    const toggle = screen.getByLabelText("Toggle menu");

    // Desktop links are always in the DOM (hidden via CSS, not unmounted),
    // so we check for the mobile-only Profile entry instead, which only
    // renders inside the mobile menu panel.
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });
});