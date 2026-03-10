import { INamingProvider } from "./namingProviders/INamingProvider.js";
import { ServiceEnvironmentNamingProvider } from "./namingProviders/ServiceEnvironmentNamingProvider.js";

export abstract class FactoryBase {
  private readonly namingProvider: INamingProvider;

  protected constructor(serviceName: string, namingProvider?: INamingProvider) {
    this.namingProvider =
      namingProvider ?? new ServiceEnvironmentNamingProvider(serviceName);
  }

  getResourceId(id?: string): string {
    return this.namingProvider.getResourceId(id) ?? "not set";
  }

  getResourceName(name: string): string {
    return this.namingProvider.getResourceName(name);
  }
}
