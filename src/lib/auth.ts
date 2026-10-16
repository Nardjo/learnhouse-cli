import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, chmodSync } from "fs";
import { dirname } from "path";
import { TOKEN_PATH, SESSION_PATH, AUTH_HEADER, APP_CLI } from "./config.js";
import { CliError } from "./errors.js";

/** Check if a token is configured (LEARNHOUSE_API_TOKEN or token file) */
export function hasToken(): boolean {
  return Boolean(process.env.LEARNHOUSE_API_TOKEN?.trim()) || existsSync(TOKEN_PATH);
}

/** Read the org API token. LEARNHOUSE_API_TOKEN wins over the token file. */
export function getToken(): string {
  const env = process.env.LEARNHOUSE_API_TOKEN?.trim();
  if (env) return env;
  if (!existsSync(TOKEN_PATH)) {
    throw new CliError(2, "No API token configured.", `Run: ${APP_CLI} auth set <lh_token> (or set LEARNHOUSE_API_TOKEN)`);
  }
  return readFileSync(TOKEN_PATH, "utf-8").trim();
}

function writeSecret(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value.trim(), { mode: 0o600 });
  // Ensure permissions even if file existed
  chmodSync(path, 0o600);
}

/** Save a token to disk with restricted permissions (chmod 600). */
export function setToken(token: string): void {
  writeSecret(TOKEN_PATH, token);
}

/** Delete the stored token. */
export function removeToken(): void {
  if (existsSync(TOKEN_PATH)) unlinkSync(TOKEN_PATH);
}

/** Admin session JWT, for routes that refuse API tokens (org config). */
export function getSession(): string {
  if (!existsSync(SESSION_PATH)) {
    throw new CliError(2, "No admin session.", `Run: ${APP_CLI} auth login --email <admin-email>`);
  }
  return readFileSync(SESSION_PATH, "utf-8").trim();
}

export function setSession(jwt: string): void {
  writeSecret(SESSION_PATH, jwt);
}

export function removeSession(): void {
  if (existsSync(SESSION_PATH)) unlinkSync(SESSION_PATH);
}

/** Mask a token for display: "lh_a...wxyz" */
export function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/** Bearer header: the org API token, or the admin session when asked. */
export function buildAuthHeaders(session = false): Record<string, string> {
  return { [AUTH_HEADER]: `Bearer ${session ? getSession() : getToken()}` };
}
