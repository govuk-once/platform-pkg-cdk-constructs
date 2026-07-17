import { ServiceEnvironmentNamingProvider } from "./ServiceEnvironmentNamingProvider.js";
import { describe, test, expect } from "vitest";

describe("Environment Naming Provider", () => {
  test("naming provider adds environment and service name the id", () => {
    const env = (
      process.env.ENVIRONMENT ??
      process.env.USER ??
      "unknown"
    ).replace(/[^a-zA-Z0-9-]/g, "");

    const serviceName = "FishMaker";

    const namingProvider = new ServiceEnvironmentNamingProvider(serviceName);
    expect(namingProvider.getResourceId("fred")).toBe(
      `${env}-${serviceName.toLowerCase()}-fred`,
    );
  });

  test("naming provider doesn't double prefix", () => {
    const env = (
      process.env.ENVIRONMENT ??
      process.env.USER ??
      "unknown"
    ).replace(/[^a-zA-Z0-9-]/g, "");

    const serviceName = "FishMaker";

    const namingProvider = new ServiceEnvironmentNamingProvider(serviceName);
    expect(
      namingProvider.getResourceName(
        `${env}-${serviceName.toLowerCase()}-fred`,
      ),
    ).toBe(`${env}-${serviceName.toLowerCase()}-fred`);
  });

  test('naming provider adds enviroment and service name the id truncates to 255 characters max', () => {
    const env = (
      process.env.ENVIRONMENT ??
      process.env.USER ??
      "unknown"
    ).replace(/[^a-zA-Z0-9-]/g, "");

    const serviceName = "FishMaker";
    const resourceId =
      `${env}-${serviceName.toLowerCase()}-fred-this-is-the-most-amazing-web-site-ever-fdgdfg-fdgfd-gfdg-fdg-fdg-fdg-fgfd-gdf-gfd-g-fdg-fdg-df-gf-dg-df-gdf-g-dfg-d-gd`.substring(
        0,
        255,
      );

    const namingProvider = new ServiceEnvironmentNamingProvider(serviceName);
    expect(
      namingProvider.getResourceId(
        'fred-this-is-the-most-amazing-web-site-ever-fdgdfg-fdgfd-gfdg-fdg-fdg-fdg-fgfd-gdf-gfd-g-fdg-fdg-df-gf-dg-df-gdf-g-dfg-d-gd',
      ),
    ).toBe(resourceId);
  });

  test("naming provider adds environment and service name the name", () => {
    const env = (
      process.env.ENVIRONMENT ??
      process.env.USER ??
      "unknown"
    ).replace(/[^a-zA-Z0-9-]/g, "");

    const serviceName = "FishMaker";

    const namingProvider = new ServiceEnvironmentNamingProvider(serviceName);
    expect(namingProvider.getResourceName("Clair")).toBe(
      `${env}-${serviceName.toLowerCase()}-Clair`,
    );
  });

  test("naming provider adds environment and service name the name doesn't truncate", () => {
    const env = (
      process.env.ENVIRONMENT ??
      process.env.USER ??
      "unknown"
    ).replace(/[^a-zA-Z0-9-]/g, "");

    const serviceName = "FishMaker";

    const namingProvider = new ServiceEnvironmentNamingProvider(serviceName);
    expect(
      namingProvider.getResourceName(
        "Clair-this-is-the-most-amazing-web-site-ever",
      ),
    ).toBe(
      `${env}-${serviceName.toLowerCase()}-Clair-this-is-the-most-amazing-web-site-ever`,
    );
  });
});
