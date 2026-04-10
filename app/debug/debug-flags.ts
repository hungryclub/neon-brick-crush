export function resolveDebugBuildFlag(env?: { DEV?: boolean }) {
  return Boolean(env?.DEV);
}

export function isDebugToolsEnabled() {
  return resolveDebugBuildFlag((import.meta as { env?: { DEV?: boolean } }).env);
}
