import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "../../i18n/LanguageContext";
import LanguageToggle from "./LanguageToggle";
import StatusStamp from "../ui/StatusStamp";

function renderApp() {
  return render(
    <LanguageProvider>
      <LanguageToggle />
      <StatusStamp status="completed" />
    </LanguageProvider>
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("LanguageToggle", () => {
  test("switches text to Hindi, persists it, and sets <html lang>", async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.getByText("Completed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Language/i }));
    await user.click(screen.getByRole("button", { name: /हिन्दी/ }));

    expect(screen.getByText("पूरा हुआ")).toBeInTheDocument();
    expect(localStorage.getItem("scrapconnect.lang")).toBe("hi");
    expect(document.documentElement.lang).toBe("hi");
  });

  test("switches to Punjabi and back to English", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /Language/i }));
    await user.click(screen.getByRole("button", { name: /ਪੰਜਾਬੀ/ }));
    expect(screen.getByText("ਪੂਰਾ ਹੋਇਆ")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ਭਾਸ਼ਾ/ }));
    await user.click(screen.getByRole("button", { name: /English/ }));
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  test("restores the saved language on load", () => {
    localStorage.setItem("scrapconnect.lang", "pa");
    renderApp();
    expect(screen.getByText("ਪੂਰਾ ਹੋਇਆ")).toBeInTheDocument();
  });
});