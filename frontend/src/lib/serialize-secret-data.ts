export function serializeSecretData(data: Record<string, Uint8Array>): string {
  const decoder = new TextDecoder()
  return JSON.stringify(Object.fromEntries(
    Object.keys(data).sort().map((key) => [key, decoder.decode(data[key])]),
  ))
}
