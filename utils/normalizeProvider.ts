/**
 * Normalize a provider string.
 *
 * This function converts the provider string to lowercase.
 * If the input is "azure-ad", it returns "azure".
 */
export function normalizeProvider(provider: string): string {
  const lower = provider.toLowerCase();
  if (lower === "azure-ad") {
    return "azure";
  }
  return lower;
}
