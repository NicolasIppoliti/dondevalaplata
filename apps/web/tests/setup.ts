import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// testing-library's auto-cleanup only self-registers when `test.globals` is
// enabled (it looks for a global `afterEach`). This project keeps explicit
// vitest imports instead of globals, so unmount the DOM between tests here.
afterEach(() => {
  cleanup();
});
