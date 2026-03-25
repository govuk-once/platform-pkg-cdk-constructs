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
}
