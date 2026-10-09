import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

describe("EmptyState", () => {
  it("shows a heading, explanation and action", () => {
    render(
      <EmptyState
        title="No published investigations yet."
        action={<button type="button">Run live</button>}
      >
        Published runs appear here.
      </EmptyState>,
    );
    expect(screen.getByRole("heading", { name: "No published investigations yet." })).toBeVisible();
    expect(screen.getByText("Published runs appear here.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Run live" })).toBeVisible();
  });
});

describe("ErrorState", () => {
  it("is announced as an alert and shows the error code", () => {
    render(
      <ErrorState title="Investigation stopped" code="TIMEOUT" message="2 findings were saved." />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Investigation stopped");
    expect(screen.getByText("TIMEOUT").tagName).toBe("CODE");
  });
});
