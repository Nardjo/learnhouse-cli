import { Command } from "commander";
import { run } from "../lib/action.js";
import { client } from "../lib/client.js";
import { orgSlug } from "../lib/config.js";

/** Unique, readable username: the email's local part plus a random suffix. */
export function usernameFor(email: string): string {
  const local = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30) || "member";
  return `${local}-${crypto.randomUUID().slice(0, 6)}`;
}

export const usersResource = new Command("users").description("Look up and provision organization members");

usersResource
  .command("list")
  .description("List organization members (id, email, username)")
  .option("--limit <n>", "Max rows, 1-500", "100")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli users list --limit 20\n  learnhouse-cli users list --json")
  .action(run((opts: { limit: string }) => client.get("/integrations/zapier/users", { limit: opts.limit })));

usersResource
  .command("get <email>")
  .description("Find a member by email (exit 1 with 404 when unknown)")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli users get buyer@example.com --json")
  .action(run((email: string) =>
    client.get(`/admin/${orgSlug()}/users/by-email/${encodeURIComponent(email.trim().toLowerCase())}`),
  ));

usersResource
  .command("create")
  .description("Create a passwordless member (signs in with magic links); 400 if the email is already in the org")
  .requiredOption("--email <email>", "Member email")
  .option("--username <name>", "Unique username (default: email local part + random suffix)")
  .option("--first-name <name>", "First name")
  .option("--last-name <name>", "Last name")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli users create --email buyer@example.com --first-name Ada --json")
  .action(run((opts: { email: string; username?: string; firstName?: string; lastName?: string }) => {
    const email = opts.email.trim().toLowerCase();
    return client.post(`/admin/${orgSlug()}/users`, {
      email,
      username: opts.username ?? usernameFor(email),
      first_name: opts.firstName,
      last_name: opts.lastName,
    });
  }));

usersResource
  .command("groups <user_id>")
  .description("List the user groups a member belongs to")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli users groups 42 --json")
  .action(run((userId: string) => client.get(`/admin/${orgSlug()}/users/${encodeURIComponent(userId)}/groups`)));
