import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

function Bomb() {
  throw new Error("Deliberate test crash");
}

function Fine() {
  return <div>Everything is fine</div>;
}

describe("ErrorBoundary", () => {
  // React logs the caught error to console.error by default during tests —
  // silence it so test output isn't noisy, without hiding a genuine failure.
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    consoleSpy.mockClear();
  });

  test("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Fine />
      </ErrorBoundary>
    );
    expect(screen.getByText("Everything is fine")).toBeInTheDocument();
  });

  test("catches a render-time crash and shows the fallback instead of a blank screen", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Everything is fine")).not.toBeInTheDocument();
  });

  test("the fallback offers a way back (reload and homepage link), not a dead end", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to homepage/i })).toHaveAttribute("href", "/");
  });

  test("logs the caught error for debugging rather than swallowing it silently", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalled();
  });
});