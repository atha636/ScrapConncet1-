import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatBox from "./ChatBox";
import { AuthProvider } from "../../context/AuthContext";

vi.mock("../../lib/socket", () => ({
  disconnectSocket: vi.fn(),
  connectSocket: vi.fn(),
}));

// jsdom doesn't implement scrollIntoView — ChatBox calls it on every
// message-list update to auto-scroll to the latest message.
Element.prototype.scrollIntoView = vi.fn();

const mockUsePickupChat = vi.fn();
vi.mock("../../hooks/usePickupChat", () => ({
  default: (...args) => mockUsePickupChat(...args),
}));

function renderChatBox(props = {}, user = { _id: "me1", name: "Priya", role: "user" }) {
  if (user) {
    localStorage.setItem("token", "tok");
    localStorage.setItem("user", JSON.stringify(user));
  }
  return render(
    <AuthProvider>
      <ChatBox pickupId="pickup123456" open onClose={vi.fn()} {...props} />
    </AuthProvider>
  );
}

describe("ChatBox", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUsePickupChat.mockReset();
    mockUsePickupChat.mockReturnValue({
      messages: [],
      loading: false,
      error: "",
      sending: false,
      send: vi.fn(),
    });
  });

  test("renders nothing when open is false", () => {
    render(
      <AuthProvider>
        <ChatBox pickupId="p1" open={false} onClose={vi.fn()} />
      </AuthProvider>
    );
    expect(screen.queryByPlaceholderText("Type a message…")).not.toBeInTheDocument();
  });

  test("shows the other party's name in the header when given", () => {
    renderChatBox({ otherPartyName: "Raj" });
    expect(screen.getByText("Chat with Raj")).toBeInTheDocument();
  });

  test("falls back to a generic header when no other party name is given", () => {
    renderChatBox();
    expect(screen.getByText("Pickup chat")).toBeInTheDocument();
  });

  test("shows the last 6 characters of the pickup id, uppercased", () => {
    renderChatBox();
    expect(screen.getByText("#123456")).toBeInTheDocument();
  });

  test("shows a loading state while messages are loading", () => {
    mockUsePickupChat.mockReturnValue({ messages: [], loading: true, error: "", sending: false, send: vi.fn() });
    renderChatBox();
    expect(screen.queryByText(/No messages yet/)).not.toBeInTheDocument();
  });

  test("shows an empty-state prompt when there are no messages", () => {
    renderChatBox();
    expect(screen.getByText(/No messages yet — say hello/)).toBeInTheDocument();
  });

  test("renders an error banner when present", () => {
    mockUsePickupChat.mockReturnValue({
      messages: [],
      loading: false,
      error: "Couldn't load the conversation.",
      sending: false,
      send: vi.fn(),
    });
    renderChatBox();
    expect(screen.getByText("Couldn't load the conversation.")).toBeInTheDocument();
  });

  test("shows the sender's name on the other party's messages but not on the user's own", () => {
    mockUsePickupChat.mockReturnValue({
      messages: [
        { _id: "m1", text: "Hi there", sender: { _id: "me1", name: "Priya" }, createdAt: new Date().toISOString() },
        { _id: "m2", text: "See you soon", sender: { _id: "other1", name: "Raj" }, createdAt: new Date().toISOString() },
      ],
      loading: false,
      error: "",
      sending: false,
      send: vi.fn(),
    });
    renderChatBox();

    expect(screen.getByText("Hi there")).toBeInTheDocument();
    expect(screen.getByText("See you soon")).toBeInTheDocument();
    expect(screen.getByText("Raj")).toBeInTheDocument();
    // Priya (the logged-in user) sent m1 — her own bubble has no sender label
    expect(screen.queryByText("Priya")).not.toBeInTheDocument();
  });

  test("typing and submitting calls send with the trimmed message and clears the input", () => {
    const send = vi.fn();
    mockUsePickupChat.mockReturnValue({ messages: [], loading: false, error: "", sending: false, send });
    renderChatBox();

    const input = screen.getByPlaceholderText("Type a message…");
    fireEvent.change(input, { target: { value: "  On my way  " } });
    fireEvent.submit(input.closest("form"));

    expect(send).toHaveBeenCalledWith("  On my way  ");
    expect(input.value).toBe("");
  });

  test("does not call send for a blank or whitespace-only message", () => {
    const send = vi.fn();
    mockUsePickupChat.mockReturnValue({ messages: [], loading: false, error: "", sending: false, send });
    renderChatBox();

    const input = screen.getByPlaceholderText("Type a message…");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form"));

    expect(send).not.toHaveBeenCalled();
  });

  test("disables the send button while a message is sending", () => {
    mockUsePickupChat.mockReturnValue({ messages: [], loading: false, error: "", sending: true, send: vi.fn() });
    renderChatBox();

    const input = screen.getByPlaceholderText("Type a message…");
    fireEvent.change(input, { target: { value: "Hello" } });

    const submitButton = input.closest("form").querySelector("button[type=submit]");
    expect(submitButton).toBeDisabled();
  });

  test("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    renderChatBox({ onClose });
    fireEvent.click(screen.getByLabelText("Close chat"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clicking a quick-reply chip sends that exact phrase (requester wording)", () => {
    const send = vi.fn();
    mockUsePickupChat.mockReturnValue({ messages: [], loading: false, error: "", sending: false, send });
    renderChatBox();

    fireEvent.click(screen.getByRole("button", { name: "I'm ready" }));

    expect(send).toHaveBeenCalledWith("I'm ready");
  });

  test("a collector sees travel-status phrases instead of the requester's", () => {
    const send = vi.fn();
    mockUsePickupChat.mockReturnValue({ messages: [], loading: false, error: "", sending: false, send });
    renderChatBox({}, { _id: "c1", name: "Atharv", role: "collector" });

    fireEvent.click(screen.getByRole("button", { name: "Arrived" }));

    expect(send).toHaveBeenCalledWith("Arrived");
    expect(screen.queryByRole("button", { name: "I'm ready" })).not.toBeInTheDocument();
  });

  test("does not send a quick reply while a message is already sending", () => {
    const send = vi.fn();
    mockUsePickupChat.mockReturnValue({ messages: [], loading: false, error: "", sending: true, send });
    renderChatBox();

    expect(screen.getByRole("button", { name: "I'm ready" })).toBeDisabled();
  });

  test("renders a shared-location message as a Maps link, not raw text", () => {
    mockUsePickupChat.mockReturnValue({
      messages: [
        {
          _id: "m1",
          text: "📍 Live location: https://www.google.com/maps?q=30.7333,76.7794",
          sender: { _id: "other1", name: "Raj" },
          createdAt: new Date().toISOString(),
        },
      ],
      loading: false,
      error: "",
      sending: false,
      send: vi.fn(),
    });
    renderChatBox();

    expect(screen.getByText("Live location shared")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Live location shared/ });
    expect(link).toHaveAttribute("href", "https://www.google.com/maps?q=30.7333,76.7794");
    // The raw encoded text itself shouldn't leak through as a plain bubble
    expect(screen.queryByText(/📍 Live location:/)).not.toBeInTheDocument();
  });
});