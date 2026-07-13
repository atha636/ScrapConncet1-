import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";
import { AuthProvider } from "../context/AuthContext";

vi.mock("../lib/socket", () => ({
  disconnectSocket: vi.fn(),
  connectSocket: vi.fn(),
}));

function renderNotFound() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <NotFound />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("NotFound page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("shows a 404 message", () => {
    renderNotFound();
    expect(screen.getByText(/error 404/i)).toBeInTheDocument();
  });

  test("links back to the public home page for a logged-out visitor", () => {
    renderNotFound();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });

  test("links back to the correct dashboard for a logged-in requester", () => {
    localStorage.setItem("token", "tok");
    localStorage.setItem("user", JSON.stringify({ name: "Raj", role: "user" }));
    renderNotFound();
    expect(screen.getByRole("link", { name: /back to your dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard"
    );
  });

  test("links back to the collector dashboard for a logged-in collector", () => {
    localStorage.setItem("token", "tok");
    localStorage.setItem("user", JSON.stringify({ name: "Pappu", role: "collector" }));
    renderNotFound();
    expect(screen.getByRole("link", { name: /back to your dashboard/i })).toHaveAttribute(
      "href",
      "/collector"
    );
  });
});