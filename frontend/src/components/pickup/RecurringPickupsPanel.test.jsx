import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import RecurringPickupsPanel from "./RecurringPickupsPanel";

const mockGet = vi.fn();
const mockSkip = vi.fn();
const mockPause = vi.fn();
const mockToggle = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("../../services/pickupService", () => ({
  RECURRING_FREQUENCIES: ["weekly", "biweekly", "monthly"],
  getMyRecurring: (...a) => mockGet(...a),
  skipNextRecurring: (...a) => mockSkip(...a),
  pauseRecurring: (...a) => mockPause(...a),
  toggleRecurring: (...a) => mockToggle(...a),
  updateRecurring: (...a) => mockUpdate(...a),
  deleteRecurring: (...a) => mockDelete(...a),
}));

const DAY = 24 * 60 * 60 * 1000;
const template = (overrides = {}) => ({
  _id: "r1",
  scrapType: "metal",
  estimatedWeightKg: 5,
  frequency: "weekly",
  active: true,
  nextRunAt: new Date(Date.now() + 3 * DAY).toISOString(),
  pausedUntil: null,
  skippedRunAt: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RecurringPickupsPanel", () => {
  test("renders nothing when there are no repeat pickups", async () => {
    mockGet.mockResolvedValue({ data: [] });
    const { container } = render(<RecurringPickupsPanel />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test("shows an active series with its next date and the skip control", async () => {
    mockGet.mockResolvedValue({ data: [template()] });
    render(<RecurringPickupsPanel />);

    expect(await screen.findByText("Metal")).toBeInTheDocument();
    expect(screen.getByText(/Next:/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip next" })).toBeInTheDocument();
  });

  test("'Skip next' calls the API and shows the schedule it returns, including what was skipped", async () => {
    const original = template();
    const skipped = template({
      nextRunAt: new Date(Date.now() + 10 * DAY).toISOString(),
      skippedRunAt: original.nextRunAt,
    });
    mockGet.mockResolvedValue({ data: [original] });
    mockSkip.mockResolvedValue({ data: skipped });
    render(<RecurringPickupsPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Skip next" }));

    await waitFor(() => expect(mockSkip).toHaveBeenCalledWith("r1"));
    expect(await screen.findByText(/^Skipped /)).toBeInTheDocument();
  });

  test("a preset pause sends a future ISO date", async () => {
    mockGet.mockResolvedValue({ data: [template()] });
    mockPause.mockResolvedValue({ data: template() });
    render(<RecurringPickupsPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Pause…" }));
    fireEvent.click(screen.getByRole("button", { name: "2 weeks" }));

    await waitFor(() => expect(mockPause).toHaveBeenCalledTimes(1));
    const [id, until] = mockPause.mock.calls[0];
    expect(id).toBe("r1");
    const days = (new Date(until).getTime() - Date.now()) / DAY;
    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThan(14.1);
  });

  test("a series on a dated pause shows 'Away' with its resume date and a 'Resume now' control", async () => {
    mockGet.mockResolvedValue({
      data: [
        template({
          pausedUntil: new Date(Date.now() + 10 * DAY).toISOString(),
          nextRunAt: new Date(Date.now() + 12 * DAY).toISOString(),
        }),
      ],
    });
    render(<RecurringPickupsPanel />);

    expect(await screen.findByText("Away")).toBeInTheDocument();
    expect(screen.getByText(/Paused until .* resumes /)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip next" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume now" })).toBeInTheDocument();
  });

  test("'Resume now' clears a dated pause by sending until: null", async () => {
    mockGet.mockResolvedValue({
      data: [template({ pausedUntil: new Date(Date.now() + 10 * DAY).toISOString() })],
    });
    mockPause.mockResolvedValue({ data: template() });
    render(<RecurringPickupsPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Resume now" }));
    await waitFor(() => expect(mockPause).toHaveBeenCalledWith("r1", null));
  });

  test("an open-ended pause shows Paused and offers plain Resume", async () => {
    mockGet.mockResolvedValue({ data: [template({ active: false })] });
    mockToggle.mockResolvedValue({ data: template({ active: true }) });
    render(<RecurringPickupsPanel />);

    expect(await screen.findByText("Paused until you resume")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await waitFor(() => expect(mockToggle).toHaveBeenCalledWith("r1"));
    expect(await screen.findByText(/Next:/)).toBeInTheDocument();
  });

  test("editing sends only the fields that changed", async () => {
    mockGet.mockResolvedValue({ data: [template()] });
    mockUpdate.mockResolvedValue({ data: template({ frequency: "monthly" }) });
    render(<RecurringPickupsPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("How often"), { target: { value: "monthly" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("r1", { frequency: "monthly" }));
  });

  test("saving an edit with nothing changed makes no request", async () => {
    mockGet.mockResolvedValue({ data: [template()] });
    render(<RecurringPickupsPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("a failed action shows the server's message instead of failing silently", async () => {
    mockGet.mockResolvedValue({ data: [template()] });
    mockSkip.mockRejectedValue({ response: { data: { message: "This repeat pickup is paused" } } });
    render(<RecurringPickupsPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Skip next" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("This repeat pickup is paused")).toBeInTheDocument();
  });

  test("a failed pause keeps the pause menu open so the user can retry", async () => {
    mockGet.mockResolvedValue({ data: [template()] });
    mockPause.mockRejectedValue({ response: { data: { details: [{ message: "Pick a date in the future" }] } } });
    render(<RecurringPickupsPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Pause…" }));
    fireEvent.click(screen.getByRole("button", { name: "1 week" }));

    expect(await screen.findByText("Pick a date in the future")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 month" })).toBeInTheDocument();
  });

  test("a malformed (empty) response shows an error rather than crashing the panel", async () => {
    mockGet.mockResolvedValue({ data: [template()] });
    mockSkip.mockResolvedValue({});
    render(<RecurringPickupsPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Skip next" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Metal")).toBeInTheDocument();
  });
});