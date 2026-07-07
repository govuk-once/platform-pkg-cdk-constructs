export interface INamingProvider {
  getPreFix(): string;
  getResourceId(id?: string): string | undefined;
  getResourceName(name: string, maxLength?: number): string;
}
