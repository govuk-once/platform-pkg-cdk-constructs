import { INamingProvider } from "./namingProviders/INamingProvider.js";
import { ServiceEnvironmentNamingProvider } from "./namingProviders/ServiceEnvironmentNamingProvider.js";
import { Construct } from "constructs";

export abstract class FactoryBase {
  private readonly namingProvider: INamingProvider;

  protected constructor(
    protected scope: Construct,
    serviceName?: string,
    namingProvider?: INamingProvider,
  ) {
    this.namingProvider =
      namingProvider ?? new ServiceEnvironmentNamingProvider(serviceName);
  }

  public getScope(): Construct {
    return this.scope;
  }

  public getResourceId(id?: string): string {
    return this.namingProvider.getResourceId(id) ?? "not set";
  }

  public getResourceName(name: string, maxLength: number = 255): string {
    return this.namingProvider.getResourceName(name, maxLength);
  }
}
