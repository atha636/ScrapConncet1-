import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmModal from "./ConfirmModal";

describe("ConfirmModal", () => {
  test("renders nothing when open is false", () => {
    render(
      <ConfirmModal open={false} title="Log out?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.queryByText("Log out?")).not.toBeInTheDocument();
  });

  test("shows the title and message when open", () => {
    render(
      <ConfirmModal
        open
        title="Log out?"
        message="You'll need to sign in again."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Log out?")).toBeInTheDocument();
    expect(screen.getByText("You'll need to sign in again.")).toBeInTheDocument();
  });

  test("uses default button labels when none are given", () => {
    render(<ConfirmModal open title="Are you sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  test("uses custom button labels when given", () => {
    render(
      <ConfirmModal
        open
        title="Log out?"
        confirmLabel="Log out"
        cancelLabel="Stay logged in"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Stay logged in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  test("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal open title="Log out?" confirmLabel="Log out" onConfirm={onConfirm} onCancel={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("calls onCancel when the cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open title="Log out?" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("calls onCancel when clicking the backdrop", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmModal open title="Log out?" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    // The backdrop is the outermost animated div — clicking it (not the
    // card inside) should dismiss the same way Cancel does.
    fireEvent.click(container.firstChild);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("clicking inside the dialog card does not trigger onCancel", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open title="Log out?" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Log out?"));
    expect(onCancel).not.toHaveBeenCalled();
  });
});