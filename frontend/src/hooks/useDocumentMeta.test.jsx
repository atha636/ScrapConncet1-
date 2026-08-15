import { describe, test, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import useDocumentMeta from "./useDocumentMeta";

function TestComponent({ title, description, noindex }) {
  useDocumentMeta({ title, description, noindex });
  return null;
}

function getMeta(name, attr = "name") {
  return document.querySelector(`meta[${attr}="${name}"]`);
}

describe("useDocumentMeta", () => {
  beforeEach(() => {
    document.title = "";
    document.querySelectorAll("meta").forEach((el) => el.remove());
  });

  test("sets the document title with the ScrapConnect suffix", () => {
    render(<TestComponent title="About Us" />);
    expect(document.title).toBe("About Us · ScrapConnect");
  });

  test("falls back to the default title when none is given", () => {
    render(<TestComponent />);
    expect(document.title).toBe("ScrapConnect — Sell Your Scrap, Get Picked Up Fast");
  });

  test("sets robots to index, follow by default (public page)", () => {
    render(<TestComponent title="Home" />);
    expect(getMeta("robots").content).toBe("index, follow");
  });

  test("sets robots to noindex, nofollow when noindex is true (private page)", () => {
    render(<TestComponent title="Dashboard" noindex />);
    expect(getMeta("robots").content).toBe("noindex, nofollow");
  });

  test("sets meta description and Open Graph/Twitter tags when description is given", () => {
    render(<TestComponent title="About Us" description="Learn about ScrapConnect." />);
    expect(getMeta("description").content).toBe("Learn about ScrapConnect.");
    expect(getMeta("og:title", "property").content).toBe("About Us");
    expect(getMeta("og:description", "property").content).toBe("Learn about ScrapConnect.");
    expect(getMeta("twitter:title").content).toBe("About Us");
    expect(getMeta("twitter:description").content).toBe("Learn about ScrapConnect.");
  });

  test("does not create description/OG tags when no description is given", () => {
    render(<TestComponent title="About Us" />);
    expect(getMeta("description")).toBeNull();
    expect(getMeta("og:title", "property")).toBeNull();
  });

  test("reuses an existing meta tag instead of creating a duplicate", () => {
    render(<TestComponent title="First" description="First description" />);
    render(<TestComponent title="Second" description="Second description" />);
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(getMeta("description").content).toBe("Second description");
  });
});