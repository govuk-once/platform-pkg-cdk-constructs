export interface INamingProvider {
  getPrefix(): string;
  getResourceId(id?: string): string | undefined;
  getResourceName(name: string, maxLength: number): string;
  getEnvironment(): string;
}
