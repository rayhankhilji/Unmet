import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders a primary button by default", () => {
    render(<Button>Start investigation</Button>);
    const button = screen.getByRole("button", { name: "Start investigation" });
    expect(button).toBeEnabled();
    expect(button.className).toContain("bg-primary");
  });

  it("keeps its label and blocks clicks while loading", () => {
    render(<Button loading>Start investigation</Button>);
    const button = screen.getByRole("button", { name: "Start investigation" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("renders as its child element with asChild", () => {
    render(
      <Button asChild variant="secondary">
        <a href="/about">How it works</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "How it works" });
    expect(link).toHaveAttribute("href", "/about");
    expect(link.className).toContain("border-border-strong");
  });
});
