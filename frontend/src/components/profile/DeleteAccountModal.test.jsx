import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DeleteAccountModal from "./DeleteAccountModal";

const mockDeleteAccount = vi.fn();
vi.mock("../../services/authService", () => ({
  deleteAccount: (...args) => mockDeleteAccount(...args),
}));

function renderModal(props = {}) {
  const defaults = {
    open: true,
    hasPassword: true,
    onClose: vi.fn(),
    onDeleted: vi.fn(),
  };
  return render(<DeleteAccountModal {...defaults} {...props} />);
}

describe("DeleteAccountModal", () => {
  beforeEach(() => {
    mockDeleteAccount.mockReset();
  });

  test("renders nothing when open is false", () => {
    renderModal({ open: false });
    expect(screen.queryByText("Delete your account")).not.toBeInTheDocument();
  });

  test("shows a password field when hasPassword is true", () => {
    renderModal({ hasPassword: true });
    expect(screen.getByText("Confirm your password")).toBeInTheDocument();
  });

  test("hides the password field for a Google-only account", () => {
    renderModal({ hasPassword: false });
    expect(screen.queryByText("Confirm your password")).not.toBeInTheDocument();
  });

  test("the delete button starts disabled", () => {
    renderModal();
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
  });

  test("stays disabled after only typing the password, without DELETE typed", () => {
    renderModal({ hasPassword: true });
    fireEvent.change(screen.getByPlaceholderText("Your current password"), {
      target: { value: "hunter2" },
    });
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
  });

  test("stays disabled after typing DELETE if a password is required but empty", () => {
    renderModal({ hasPassword: true });
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
  });

  test("stays disabled for a near-miss confirm word (case/whitespace sensitive)", () => {
    renderModal({ hasPassword: false });
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "delete" } });
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
  });

  test("enables once DELETE is typed for a Google-only account (no password needed)", () => {
    renderModal({ hasPassword: false });
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    expect(screen.getByRole("button", { name: "Delete my account" })).not.toBeDisabled();
  });

  test("enables once both password and DELETE are filled in for a password account", () => {
    renderModal({ hasPassword: true });
    fireEvent.change(screen.getByPlaceholderText("Your current password"), {
      target: { value: "hunter2" },
    });
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    expect(screen.getByRole("button", { name: "Delete my account" })).not.toBeDisabled();
  });

  test("submits password and confirm, then calls onDeleted on success", async () => {
    mockDeleteAccount.mockResolvedValueOnce({});
    const onDeleted = vi.fn();
    renderModal({ hasPassword: true, onDeleted });

    fireEvent.change(screen.getByPlaceholderText("Your current password"), {
      target: { value: "hunter2" },
    });
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(mockDeleteAccount).toHaveBeenCalledWith({ password: "hunter2", confirm: "DELETE" });
  });

  test("omits the password field from the request for a Google-only account", async () => {
    mockDeleteAccount.mockResolvedValueOnce({});
    renderModal({ hasPassword: false, onDeleted: vi.fn() });

    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalled());
    expect(mockDeleteAccount).toHaveBeenCalledWith({ password: undefined, confirm: "DELETE" });
  });

  test("shows the server's error message and does not call onDeleted on failure", async () => {
    mockDeleteAccount.mockRejectedValueOnce({ response: { data: { message: "Incorrect password" } } });
    const onDeleted = vi.fn();
    renderModal({ hasPassword: true, onDeleted });

    fireEvent.change(screen.getByPlaceholderText("Your current password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));

    expect(await screen.findByText("Incorrect password")).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  test("prefers a validator field message over the generic server message", async () => {
    mockDeleteAccount.mockRejectedValueOnce({
      response: {
        data: {
          message: "Validation failed",
          details: [{ field: "confirm", message: 'Type "DELETE" to confirm.' }],
        },
      },
    });
    renderModal({ hasPassword: false });

    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));

    expect(await screen.findByText('Type "DELETE" to confirm.')).toBeInTheDocument();
  });

  test("falls back to a generic message when the error has no response body", async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error("Network Error"));
    renderModal({ hasPassword: false });

    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));

    expect(await screen.findByText("Couldn't delete your account.")).toBeInTheDocument();
  });

  test("re-enables the form after a failed attempt so the person can retry", async () => {
    mockDeleteAccount.mockRejectedValueOnce({ response: { data: { message: "Incorrect password" } } });
    renderModal({ hasPassword: true });

    fireEvent.change(screen.getByPlaceholderText("Your current password"), {
      target: { value: "wrong" },
    });
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));

    await screen.findByText("Incorrect password");
    expect(screen.getByRole("button", { name: "Delete my account" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).not.toBeDisabled();
  });

  test("clicking Cancel resets the form and calls onClose", () => {
    const onClose = vi.fn();
    renderModal({ hasPassword: true, onClose });

    fireEvent.change(screen.getByPlaceholderText("Your current password"), {
      target: { value: "hunter2" },
    });
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clicking the backdrop closes the modal the same as Cancel", () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });
    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clicking inside the dialog card does not trigger onClose", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("Delete your account"));
    expect(onClose).not.toHaveBeenCalled();
  });

  test("shows a loading state and disables Cancel while the request is in flight", async () => {
    let resolveDelete;
    mockDeleteAccount.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDelete = resolve;
      })
    );
    renderModal({ hasPassword: false });

    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));

    expect(await screen.findByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    // Resolve and let the resulting state update flush before the test
    // (and its render tree) tears down, so React doesn't warn about a
    // state update happening outside of act().
    resolveDelete({});
    await waitFor(() => {});
  });
});