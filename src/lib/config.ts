import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { CliError } from "./errors.js";

/** Application name (replaced during api2cli create) */
export const APP_NAME = "learnhouse";

/** CLI binary name (replaced during api2cli create) */
export const APP_CLI = "learnhouse-cli";

/** Auth header name (e.g. Authorization, X-Api-Key) */
export const AUTH_HEADER = "Authorization";

/** Path to the org API token file for this CLI */
export const TOKEN_PATH = join(homedir(), ".config", "tokens", `${APP_NAME}-cli.txt`);

/** Path to the admin session (user JWT, ~8h) used by org config commands */
export const SESSION_PATH = join(homedir(), ".config", "tokens", `${APP_NAME}-cli-session.txt`);

/** Instance settings (url, org); env vars win over this file */
export const CONFIG_PATH = join(homedir(), ".config", APP_CLI, "config.json");

export type InstanceConfig = { url?: string; org?: string };

export function readConfig(): InstanceConfig {
  if (!existsSync(CONFIG_PATH)) return {};
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as InstanceConfig;
}

export function writeConfig(cfg: InstanceConfig): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(cfg, null, 2)}\n`);
}

/** Instance root, e.g. https://learn.example.com (LEARNHOUSE_URL, else config url) */
export function instanceUrl(): string {
  const url = (process.env.LEARNHOUSE_URL || readConfig().url || "").trim().replace(/\/+$/, "");
  if (!url) {
    throw new CliError(2, "No LearnHouse instance configured.", `Run: ${APP_CLI} config set url https://<domain> (or set LEARNHOUSE_URL)`);
  }
  return url;
}

/** API base URL: <instance>/api/v1 */
export function apiBase(): string {
  return `${instanceUrl()}/api/v1`;
}

/** URL-safe organization slug (LEARNHOUSE_ORG_SLUG, else config org) */
export function orgSlug(): string {
  const slug = (process.env.LEARNHOUSE_ORG_SLUG || readConfig().org || "").trim();
  if (!slug) {
    throw new CliError(2, "No organization slug configured.", `Run: ${APP_CLI} config set org <slug> (or set LEARNHOUSE_ORG_SLUG)`);
  }
  return encodeURIComponent(slug);
}

/** Global state for output flags (set by root command) */
export const globalFlags = {
  json: false,
  format: "text" as "text" | "json" | "csv" | "yaml",
  verbose: false,
  noColor: false,
  noHeader: false,
};
