import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RequestPickup from "./RequestPickup";
import { AuthProvider } from "../../context/AuthContext";
import { ToastProvider } from "../../context/ToastContext";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockCreatePickup = vi.fn();
const mockCreateRecurring = vi.fn();
vi.mock("../../services/pickupService", () => ({
  SCRAP_TYPES: ["metal", "plastic", "paper", "e-waste", "glass", "other"],
  MAX_ITEMS_PER_PICKUP: 8,
  RECURRING_FREQUENCIES: ["weekly", "biweekly", "monthly"],
  createPickup: (...args) => mockCreatePickup(...args),
  createRecurring: (...args) => mockCreateRecurring(...args),
  // Real implementation (not a stub) — same table as
  // Backend/src/utils/pricing.js's BASE_RATE_PER_KG, so the live-estimate
  // card renders a real, checkable number rather than undefined/NaN in
  // every test that mounts the form, whether or not that test cares
  // about pricing specifically.
  estimateItemsPrice: (items) =>
    items.reduce((total, item) => {
      const rates = { metal: 50, plastic: 20, paper: 10, "e-waste": 80, glass: 8, other: 5 };
      const rate = rates[item.scrapType] ?? rates.other;
      const weight = Number(item.weight) > 0 ? Number(item.weight) : 1;
      return total + Math.max(5, Math.round(rate * weight));
    }, 0),
}));

const mockCompressImage = vi.fn();
vi.mock("../../utils/compressImage", () => ({
  compressImage: (...args) => mockCompressImage(...args),
}));

function mockGeolocationSuccess(lat = 12.34, lng = 56.78) {
  globalThis.navigator.geolocation = {
    getCurrentPosition: vi.fn((success) => success({ coords: { latitude: lat, longitude: lng } })),
  };
}

function mockGeolocationDenied() {
  globalThis.navigator.geolocation = {
    getCurrentPosition: vi.fn((_success, error) => error({ code: 1, PERMISSION_DENIED: 1 })),
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <RequestPickup />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

function itemRowSelects() {
  return screen.getAllByRole("combobox");
}

function itemRowWeightInputs() {
  return screen.getAllByPlaceholderText("kg (optional)");
}

describe("RequestPickup", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCreatePickup.mockReset();
    mockCreateRecurring.mockReset();
    mockCompressImage.mockReset().mockImplementation((f) => Promise.resolve(f)); // passthrough by default
    delete globalThis.navigator.geolocation;
    localStorage.clear();
    // Contact fields pre-fill from the logged-in account — seeding one
    // with both name and phone here means every pre-existing submit test
    // below "just works" without individually filling those fields in,
    // since the account already supplies valid values.
    localStorage.setItem("token", "tok");
    localStorage.setItem("user", JSON.stringify({ _id: "u1", name: "Priya", phone: "9876500000", role: "user" }));
  });

  test("starts with a single item row defaulted to Metal", () => {
    renderPage();
    const selects = itemRowSelects();
    expect(selects).toHaveLength(1);
    expect(selects[0]).toHaveValue("metal");
  });

  test("changing the scrap type dropdown updates that item's selection", () => {
    renderPage();
    fireEvent.change(itemRowSelects()[0], { target: { value: "plastic" } });
    expect(itemRowSelects()[0]).toHaveValue("plastic");
  });

  test("'Add another item' appends a new row, and the remove button drops one", () => {
    renderPage();
    expect(itemRowSelects()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "+ Add another item" }));
    expect(itemRowSelects()).toHaveLength(2);

    // The remove ("×") button is disabled while only one row remains — the
    // first click above should have re-enabled both rows' remove buttons.
    const removeButtons = screen.getAllByRole("button", { name: "Remove item" });
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0]).not.toBeDisabled();

    fireEvent.click(removeButtons[1]);
    expect(itemRowSelects()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Remove item" })).toBeDisabled();
  });

  test("blocks submission and shows an error when no location has been captured", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("Share your pickup location before submitting.")).toBeInTheDocument();
    expect(mockCreatePickup).not.toHaveBeenCalled();
  });

  test("capturing location replaces the prompt with the captured coordinates", async () => {
    mockGeolocationSuccess(12.3456, 56.7891);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /share my location/i }));

    expect(await screen.findByText(/Location captured \(12\.3456, 56\.7891\)/)).toBeInTheDocument();
  });

  test("shows a friendly message when location access is denied", async () => {
    mockGeolocationDenied();
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /share my location/i }));

    expect(
      await screen.findByText("Location access was denied. Enable it in your browser settings.")
    ).toBeInTheDocument();
  });

  test("submits the form with items (scrap type + weight), coordinates, and contact, then navigates to My Requests", async () => {
    mockGeolocationSuccess(12.34, 56.78);
    mockCreatePickup.mockResolvedValue({ data: { _id: "p1" } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /share my location/i }));
    await screen.findByText(/Location captured/);

    fireEvent.change(itemRowSelects()[0], { target: { value: "plastic" } });
    fireEvent.change(itemRowWeightInputs()[0], { target: { value: "3.5" } });

    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(mockCreatePickup).toHaveBeenCalledTimes(1));

    const submittedForm = mockCreatePickup.mock.calls[0][0];
    expect(JSON.parse(submittedForm.get("items"))).toEqual([{ scrapType: "plastic", estimatedWeightKg: "3.5" }]);
    expect(submittedForm.get("contactName")).toBe("Priya");
    expect(submittedForm.get("contactPhone")).toBe("9876500000");
    expect(submittedForm.get("lat")).toBe("12.34");
    expect(submittedForm.get("lng")).toBe("56.78");

    expect(mockNavigate).toHaveBeenCalledWith("/my-requests");
  });

  test("submits every row when multiple items are added", async () => {
    mockGeolocationSuccess(12.34, 56.78);
    mockCreatePickup.mockResolvedValue({ data: { _id: "p1" } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /share my location/i }));
    await screen.findByText(/Location captured/);

    fireEvent.click(screen.getByRole("button", { name: "+ Add another item" }));
    fireEvent.change(itemRowSelects()[0], { target: { value: "metal" } });
    fireEvent.change(itemRowWeightInputs()[0], { target: { value: "10" } });
    fireEvent.change(itemRowSelects()[1], { target: { value: "paper" } });
    fireEvent.change(itemRowWeightInputs()[1], { target: { value: "5" } });

    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(mockCreatePickup).toHaveBeenCalledTimes(1));
    const items = JSON.parse(mockCreatePickup.mock.calls[0][0].get("items"));
    expect(items).toEqual([
      { scrapType: "metal", estimatedWeightKg: "10" },
      { scrapType: "paper", estimatedWeightKg: "5" },
    ]);
  });

  test("checking 'Repeat this pickup' also calls createRecurring with the same details and chosen frequency", async () => {
    mockGeolocationSuccess(12.34, 56.78);
    mockCreatePickup.mockResolvedValue({ data: { _id: "p1" } });
    mockCreateRecurring.mockResolvedValue({ data: { _id: "r1" } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /share my location/i }));
    await screen.findByText(/Location captured/);

    fireEvent.change(itemRowSelects()[0], { target: { value: "plastic" } });
    fireEvent.click(screen.getByLabelText("Repeat this pickup"));
    fireEvent.click(screen.getByRole("button", { name: "monthly" }));

    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(mockCreateRecurring).toHaveBeenCalledTimes(1));
    expect(mockCreateRecurring).toHaveBeenCalledWith(
      expect.objectContaining({
        scrapType: "plastic",
        contactName: "Priya",
        contactPhone: "9876500000",
        lat: 12.34,
        lng: 56.78,
        frequency: "monthly",
      })
    );
    // The one-time pickup is still the primary action and must go through
    // regardless of the repeat toggle being on.
    expect(mockCreatePickup).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/my-requests");
  });

  test("leaving 'Repeat this pickup' unchecked never calls createRecurring", async () => {
    mockGeolocationSuccess();
    mockCreatePickup.mockResolvedValue({ data: { _id: "p1" } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /share my location/i }));
    await screen.findByText(/Location captured/);
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(mockCreatePickup).toHaveBeenCalledTimes(1));
    expect(mockCreateRecurring).not.toHaveBeenCalled();
  });

  test("a failed createRecurring doesn't block navigation, since the one-time pickup already succeeded", async () => {
    mockGeolocationSuccess();
    mockCreatePickup.mockResolvedValue({ data: { _id: "p1" } });
    mockCreateRecurring.mockRejectedValue(new Error("network error"));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /share my location/i }));
    await screen.findByText(/Location captured/);
    fireEvent.click(screen.getByLabelText("Repeat this pickup"));
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(mockCreateRecurring).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/my-requests"));
  });

  test("blocks submission and shows an error when contact name or phone is cleared", async () => {
    mockGeolocationSuccess();
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /share my location/i }));
    await screen.findByText(/Location captured/);

    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(
      await screen.findByText("Add a contact name and phone number so the collector can reach you.")
    ).toBeInTheDocument();
    expect(mockCreatePickup).not.toHaveBeenCalled();
  });

  test("shows the server's error message when submission fails", async () => {
    mockGeolocationSuccess();
    mockCreatePickup.mockRejectedValue({ response: { data: { message: "Pickup limit reached" } } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /share my location/i }));
    await screen.findByText(/Location captured/);
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("Pickup limit reached")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("omits estimatedWeightKg from an item when its weight is left blank", async () => {
    mockGeolocationSuccess();
    mockCreatePickup.mockResolvedValue({ data: { _id: "p1" } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /share my location/i }));
    await screen.findByText(/Location captured/);
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(mockCreatePickup).toHaveBeenCalledTimes(1));
    const items = JSON.parse(mockCreatePickup.mock.calls[0][0].get("items"));
    expect(items).toEqual([{ scrapType: "metal" }]);
  });

  describe("photo picker", () => {
    function pickFile(name) {
      const file = new File(["fake-bytes"], name, { type: "image/jpeg" });
      const input = document.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [file] } });
      return file;
    }

    test("submits the compressed file the API returned, not the raw original", async () => {
      mockGeolocationSuccess();
      const compressed = new File(["compressed-bytes"], "compressed.jpg", { type: "image/jpeg" });
      mockCompressImage.mockResolvedValueOnce(compressed);
      mockCreatePickup.mockResolvedValue({ data: { _id: "p1" } });
      renderPage();

      pickFile("original.jpg");
      await waitFor(() => expect(mockCompressImage).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole("button", { name: /share my location/i }));
      await screen.findByText(/Location captured/);
      fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

      await waitFor(() => expect(mockCreatePickup).toHaveBeenCalledTimes(1));
      const submittedForm = mockCreatePickup.mock.calls[0][0];
      expect(submittedForm.get("image").name).toBe("compressed.jpg");
    });

    // Regression test: picking photo A, then quickly picking photo B before
    // A's compression finishes, used to be able to submit A's compressed
    // result if A's promise happened to resolve after B's — silently
    // submitting a different photo than the one shown in the preview.
    test("a slow-to-compress earlier selection can't overwrite a newer one", async () => {
      mockGeolocationSuccess();

      let resolveFirst;
      const firstCompressed = new File(["first"], "first-compressed.jpg", { type: "image/jpeg" });
      const secondCompressed = new File(["second"], "second-compressed.jpg", { type: "image/jpeg" });

      mockCompressImage
        .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = () => resolve(firstCompressed))))
        .mockResolvedValueOnce(secondCompressed);

      mockCreatePickup.mockResolvedValue({ data: { _id: "p1" } });
      renderPage();

      pickFile("first.jpg"); // starts compressing, does not resolve yet
      pickFile("second.jpg"); // starts compressing, resolves quickly
      await waitFor(() => expect(mockCompressImage).toHaveBeenCalledTimes(2));

      // The first (stale) selection finally finishes, after the second one
      // already completed — this is the exact ordering that used to lose.
      resolveFirst();

      fireEvent.click(screen.getByRole("button", { name: /share my location/i }));
      await screen.findByText(/Location captured/);
      fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

      await waitFor(() => expect(mockCreatePickup).toHaveBeenCalledTimes(1));
      const submittedForm = mockCreatePickup.mock.calls[0][0];
      expect(submittedForm.get("image").name).toBe("second-compressed.jpg");
    });

    test("revokes the previous preview's object URL when a new photo is picked", async () => {
      const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
      renderPage();

      pickFile("first.jpg");
      await waitFor(() => expect(mockCompressImage).toHaveBeenCalledTimes(1));

      pickFile("second.jpg");
      await waitFor(() => expect(revokeSpy).toHaveBeenCalled());

      revokeSpy.mockRestore();
    });
  });
});