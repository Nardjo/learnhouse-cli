import { Command, Option } from "commander";
import { getToken, setToken, removeToken, hasToken, maskToken, setSession, removeSession } from "../lib/auth.js";
import { run } from "../lib/action.js";
import { client } from "../lib/client.js";
import { apiBase, orgSlug, SESSION_PATH } from "../lib/config.js";
import { CliError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { existsSync } from "fs";

export const authCommand = new Command("auth").description("API token, admin session and magic sign-in links");

authCommand
  .command("set")
  .description("Save the org API token (lh_..., created in the admin UI or POST /orgs/{id}/api-tokens)")
  .argument("<token>", "Org API token")
  .addHelpText("after", "\nExample:\n  learnhouse-cli auth set lh_xxxxxxxx\n\nLEARNHOUSE_API_TOKEN, when set, wins over the saved token.")
  .action((token: string) => {
    setToken(token);
    log.success("Token saved securely");
  });

authCommand
  .command("show")
  .description("Display the current token (masked by default) and admin session status")
  .option("--raw", "Show the full unmasked token")
  .addHelpText("after", "\nExample:\n  learnhouse-cli auth show")
  .action((opts: { raw?: boolean }) => {
    if (!hasToken()) {
      log.warn("No token configured. Run: learnhouse-cli auth set <token>");
    } else {
      const token = getToken();
      console.log(opts.raw ? token : `Token: ${maskToken(token)}`);
    }
    console.log(`Admin session: ${existsSync(SESSION_PATH) ? "saved" : "none"}`);
  });

authCommand
  .command("remove")
  .description("Delete the saved token")
  .addHelpText("after", "\nExample:\n  learnhouse-cli auth remove")
  .action(() => {
    removeToken();
    log.success("Token removed");
  });

authCommand
  .command("test")
  .description("Verify the API token: shows its org and token name")
  .addHelpText("after", "\nExample:\n  learnhouse-cli auth test --json")
  .action(run(() => client.get("/integrations/zapier/me")));

authCommand
  .command("login")
  .description("Save an admin session (~8h) for org config commands; password from LEARNHOUSE_ADMIN_PASSWORD or stdin")
  .requiredOption("--email <email>", "Admin email")
  .addHelpText(
    "after",
    "\nExamples:\n  printf %s \"$PASSWORD\" | learnhouse-cli auth login --email admin@example.com\n  LEARNHOUSE_ADMIN_PASSWORD=... learnhouse-cli auth login --email admin@example.com",
  )
  .action(run(async (opts: { email: string }) => {
    let password = process.env.LEARNHOUSE_ADMIN_PASSWORD;
    if (!password) {
      if (process.stdin.isTTY) throw new CliError(2, "No password given.", "Pipe it on stdin or set LEARNHOUSE_ADMIN_PASSWORD");
      password = (await Bun.stdin.text()).replace(/\r?\n$/, "");
    }
    // The login route is a form post that also sets cookies; we keep only the access token.
    const res = await fetch(`${apiBase()}/auth/login`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({ username: opts.email, password }),
    });
    const data = (await res.json().catch(() => null)) as { detail?: unknown; tokens?: { access_token?: string } } | null;
    if (!res.ok || !data?.tokens?.access_token) {
      throw new CliError(res.ok ? 500 : res.status, String(data?.detail ?? res.statusText));
    }
    setSession(data.tokens.access_token);
    return { logged_in: true, email: opts.email };
  }));

authCommand
  .command("logout")
  .description("Delete the saved admin session")
  .action(() => {
    removeSession();
    log.success("Admin session removed");
  });

authCommand
  .command("magic-link <user_id>")
  .description("Issue a one-time sign-in URL for a member (nothing is emailed)")
  .option("--redirect-to <path>", "Path to land on after sign-in", "/")
  .addOption(new Option("--ttl <seconds>", "Link lifetime, 60-900 (server default 300)").argParser(Number))
  .addHelpText("after", "\nExamples:\n  learnhouse-cli auth magic-link 42 --redirect-to /course/abc --ttl 900 --json")
  .action(run((userId: string, opts: { redirectTo: string; ttl?: number }) =>
    client.post(`/admin/${orgSlug()}/auth/magic-link`, {
      user_id: Number(userId),
      redirect_to: opts.redirectTo,
      ttl_seconds: opts.ttl,
    }),
  ));
