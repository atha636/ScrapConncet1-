import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminPanel from "./AdminPanel";

vi.mock("../components/admin/AdminCharts", () => ({
  default: () => <div data-testid="admin-charts" />,
}));


vi.mock("../hooks/useCountUp", () => ({
  default: (target) => target,
}));

const mockDownloadBlob = vi.fn();
vi.mock("../utils/downloadBlob", () => ({
  downloadBlob: (...args) => mockDownloadBlob(...args),
}));

const adminService = vi.hoisted(() => ({
  getAdminStats: vi.fn(),
  getAdminAnalytics: vi.fn(),
  getAdminUsers: vi.fn(),
  deactivateUser: vi.fn(),
  activateUser: vi.fn(),
  reinstateCollector: vi.fn(),
  getPayoutRequests: vi.fn(),
  approvePayout: vi.fn(),
  rejectPayout: vi.fn(),
  getAllPickups: vi.fn(),
  exportUsersCsv: vi.fn(),
  exportPickupsCsv: vi.fn(),
}));
vi.mock("../services/adminService", () => adminService);

const STATS = {
  totalUsers: 12,
  totalCollectors: 5,
  totalPickups: 40,
  pendingCount: 3,
  activeCount: 2,
  completedCount: 30,
  cancelledCount: 4,
  totalValueMoved: 15000,
};

const USERS = [
  { _id: "u1", name: "Priya Sharma", email: "priya@example.com", role: "user", isActive: true },
  {
    _id: "u2",
    name: "Raj Patidar",
    email: "raj@example.com",
    role: "collector",
    isActive: true,
    collectorSuspended: true,
  },
];

const PAYOUTS = [
  {
    _id: "p1",
    amount: 500,
    status: "pending",
    createdAt: new Date().toISOString(),
    collector: { name: "Raj Patidar", email: "raj@example.com" },
  },
];

const PICKUPS = [
  {
    _id: "pk1",
    scrapType: "metal",
    price: 500,
    status: "completed",
    user: { name: "Priya" },
    collector: { name: "Raj" },
  },
];

function setDefaults() {
  adminService.getAdminStats.mockResolvedValue({ data: STATS });
  adminService.getAdminAnalytics.mockResolvedValue({ data: { series: [] } });
  adminService.getAdminUsers.mockResolvedValue({ data: { data: USERS } });
  adminService.getPayoutRequests.mockResolvedValue({ data: { data: PAYOUTS } });
  adminService.getAllPickups.mockResolvedValue({ data: { data: PICKUPS } });
}

describe("AdminPanel", () => {
  beforeEach(() => {
    Object.values(adminService).forEach((fn) => fn.mockReset());
    mockDownloadBlob.mockClear();
    setDefaults();
  });

  test("loads and renders overview stats on mount", async () => {
    render(<AdminPanel />);
    expect(await screen.findByText("Requesters")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Collectors")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("shows an error banner when a tab fails to load", async () => {
    adminService.getAdminStats.mockRejectedValue(new Error("network error"));
    render(<AdminPanel />);
    expect(await screen.findByText("Couldn't load this section. Try refreshing.")).toBeInTheDocument();
  });

  test("switching to the Users tab loads and renders users", async () => {
    render(<AdminPanel />);
    await screen.findByText("Requesters");

    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Raj Patidar")).toBeInTheDocument();
    expect(screen.getByText("Rating-suspended")).toBeInTheDocument();
  });

  test("searching users calls the API with the search term", async () => {
    render(<AdminPanel />);
    await screen.findByText("Requesters");
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    await screen.findByText("Priya Sharma");

    adminService.getAdminUsers.mockClear();
    fireEvent.change(screen.getByPlaceholderText("Search by name or email…"), {
      target: { value: "raj" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(adminService.getAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: "raj" })
      )
    );
  });

  test("shows an empty state when no users match the search", async () => {
    render(<AdminPanel />);
    await screen.findByText("Requesters");
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    await screen.findByText("Priya Sharma");

    adminService.getAdminUsers.mockResolvedValueOnce({ data: { data: [] } });
    fireEvent.change(screen.getByPlaceholderText("Search by name or email…"), {
      target: { value: "nobody" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("No users match your search.")).toBeInTheDocument();
  });

  test("deactivating an active user calls deactivateUser and updates the row", async () => {
    adminService.deactivateUser.mockResolvedValue({ data: { ...USERS[0], isActive: false } });
    render(<AdminPanel />);
    await screen.findByText("Requesters");
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    await screen.findByText("Priya Sharma");

    // Both users in this fixture are active and non-admin, so each row has
    // its own "Deactivate" button — scope to Priya's specific card.
    const priyaCard = screen.getByText("Priya Sharma").closest(".ticket");
    fireEvent.click(within(priyaCard).getByRole("button", { name: "Deactivate" }));

    await waitFor(() => expect(adminService.deactivateUser).toHaveBeenCalledWith("u1"));
    expect(await screen.findByText("Deactivated")).toBeInTheDocument();
  });

  test("a suspended collector shows a Reinstate button that calls reinstateCollector", async () => {
    adminService.reinstateCollector.mockResolvedValue({
      data: { ...USERS[1], collectorSuspended: false },
    });
    render(<AdminPanel />);
    await screen.findByText("Requesters");
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    await screen.findByText("Raj Patidar");

    fireEvent.click(screen.getByRole("button", { name: "Reinstate" }));

    await waitFor(() => expect(adminService.reinstateCollector).toHaveBeenCalledWith("u2"));
  });

  test("switching to the Payouts tab loads and renders payout requests", async () => {
    render(<AdminPanel />);
    await screen.findByText("Requesters");
    fireEvent.click(screen.getByRole("button", { name: "Payouts" }));

    expect(await screen.findByText("₹500")).toBeInTheDocument();
    expect(screen.getByText(/Raj Patidar/)).toBeInTheDocument();
    // "Pending review" also appears as a <select> option in the status
    // filter — scope to the status stamp specifically.
    expect(document.querySelector(".stamp-pending")).toHaveTextContent("Pending review");
  });

  test("approving a payout calls approvePayout", async () => {
    adminService.approvePayout.mockResolvedValue({ data: { ...PAYOUTS[0], status: "approved" } });
    render(<AdminPanel />);
    await screen.findByText("Requesters");
    fireEvent.click(screen.getByRole("button", { name: "Payouts" }));
    await screen.findByText("₹500");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(adminService.approvePayout).toHaveBeenCalledWith("p1"));
  });

  test("rejecting a payout asks for confirmation and does nothing if declined", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminPanel />);
    await screen.findByText("Requesters");
    fireEvent.click(screen.getByRole("button", { name: "Payouts" }));
    await screen.findByText("₹500");

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(window.confirm).toHaveBeenCalled();
    expect(adminService.rejectPayout).not.toHaveBeenCalled();
  });

  test("rejecting a payout calls rejectPayout once confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    adminService.rejectPayout.mockResolvedValue({ data: { ...PAYOUTS[0], status: "rejected" } });
    render(<AdminPanel />);
    await screen.findByText("Requesters");
    fireEvent.click(screen.getByRole("button", { name: "Payouts" }));
    await screen.findByText("₹500");

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(adminService.rejectPayout).toHaveBeenCalledWith("p1"));
  });

  test("switching to the All pickups tab loads and renders pickups", async () => {
    render(<AdminPanel />);
    await screen.findByText("Requesters");
    fireEvent.click(screen.getByRole("button", { name: "All pickups" }));

    expect(await screen.findByText("metal")).toBeInTheDocument();
    expect(screen.getByText(/Priya.*Raj/)).toBeInTheDocument();
  });

  test("exporting pickups CSV calls the export endpoint and triggers a download", async () => {
    const fakeBlob = new Blob(["csv"]);
    adminService.exportPickupsCsv.mockResolvedValue({ data: fakeBlob });
    render(<AdminPanel />);
    await screen.findByText("Requesters");
    fireEvent.click(screen.getByRole("button", { name: "All pickups" }));
    await screen.findByText("metal");

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    await waitFor(() => expect(mockDownloadBlob).toHaveBeenCalledWith(fakeBlob, expect.stringContaining("scrapconnect-pickups-")));
  });

  test("switching to the Analytics tab renders the charts component", async () => {
    render(<AdminPanel />);
    await screen.findByText("Requesters");
    fireEvent.click(screen.getByRole("button", { name: "Analytics" }));

    expect(await screen.findByTestId("admin-charts")).toBeInTheDocument();
  });
});