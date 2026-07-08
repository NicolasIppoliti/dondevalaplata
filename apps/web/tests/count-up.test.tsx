import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountUp } from "@/components/CountUp";

/**
 * `<CountUp>` is rendered from Server Component pages (e.g. the home
 * hero), so its formatting option MUST be a serializable value (a plain
 * string), never a function prop -- functions cannot cross the
 * Server->Client Component boundary in React Server Components (this was
 * a latent bug from slice 1, never exercised until slice 2 actually wired
 * `<CountUp>` into a page and `next build` failed with "Functions cannot
 * be passed directly to Client Components"). `variant` selects a named,
 * built-in formatter instead of accepting an arbitrary function.
 */
describe("CountUp", () => {
  it("formats as a plain es-AR locale number by default", () => {
    render(<CountUp target={1750} />);
    expect(screen.getByText("1.750")).toBeTruthy();
  });

  it("formats as a human-rounded ARS figure with the 'arsHuman' variant", () => {
    render(<CountUp target={1750000000} variant="arsHuman" />);
    expect(screen.getByText("$ 1.750 millones")).toBeTruthy();
  });
});
