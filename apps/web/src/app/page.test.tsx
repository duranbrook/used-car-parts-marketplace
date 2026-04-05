import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the hero heading", () => {
    render(<HomePage />);
    expect(screen.getByText("Find the right used part.")).toBeInTheDocument();
  });

  it("renders the PartFinder brand", () => {
    render(<HomePage />);
    const brandElements = screen.getAllByText("PartFinder");
    expect(brandElements.length).toBeGreaterThan(0);
  });

  it("has Find a Part CTAs", () => {
    render(<HomePage />);
    const links = screen.getAllByText("Find a Part");
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("has Start Selling CTAs", () => {
    render(<HomePage />);
    const links = screen.getAllByText("Start Selling");
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the How It Works section", () => {
    render(<HomePage />);
    const headings = screen.getAllByText("How It Works");
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Snap a Photo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Search by Vehicle").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Fair Pricing").length).toBeGreaterThanOrEqual(1);
  });
});
