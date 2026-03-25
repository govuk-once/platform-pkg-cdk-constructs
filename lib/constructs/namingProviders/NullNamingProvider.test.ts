import { NullNamingProvider } from "./NullNamingProvider.js";
import { describe, test, expect } from "vitest";

describe("Null Naming Provider", () => {
  test("naming provider doesn't amend the id", () => {
    const env = (
      process.env.ENVIRONMENT ??
      process.env.USER ??
      "unknown"
    ).replace(/[^a-zA-Z0-9-]/g, "");

    const namingProvider = new NullNamingProvider();
    expect(namingProvider.getResourceId("fred")).toBe("fred");
    expect(namingProvider.getResourceId("fred")).not.toContain(env);
  });

  test("naming provider doesn't amend the name", () => {
    const env = (
      process.env.ENVIRONMENT ??
      process.env.USER ??
      "unknown"
    ).replace(/[^a-zA-Z0-9-]/g, "");

    const namingProvider = new NullNamingProvider();
    expect(namingProvider.getResourceName("fred")).toBe("fred");
    expect(namingProvider.getResourceName("fred")).not.toContain(env);
  });
});
