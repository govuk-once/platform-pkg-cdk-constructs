import { INamingProvider } from "./INamingProvider.js";

export class NullNamingProvider implements INamingProvider {
  getPrefix(): string {
    return "";
  }

  getResourceId(id?: string): string | undefined {
    return id;
  }

  getResourceName(name: string): string {
    return name;
  }

  getEnvironment(): string {
    const env = process.env.ENVIRONMENT || process.env.USER;
    if (!env) {
      throw new Error(
        "Unable to determine environment: Neither ENVIRONMENT nor USER environment variables are set",
      );
    }
    return env.replace(/[^a-zA-Z0-9-]/g, "");
  }
}
