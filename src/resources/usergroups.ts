import { Command } from "commander";
import { run } from "../lib/action.js";
import { client } from "../lib/client.js";
import { orgSlug } from "../lib/config.js";

const membersPath = (uuid: string, userId: string) =>
  `/admin/${orgSlug()}/usergroups/${encodeURIComponent(uuid)}/members/${encodeURIComponent(userId)}`;

export const usergroupsResource = new Command("usergroups").description(
  "Manage user group membership (a private course linked to a group is readable only by its members)",
);

usergroupsResource
  .command("list")
  .description("List user groups (id, usergroup_uuid, name)")
  .option("--limit <n>", "Max rows, 1-500", "100")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli usergroups list --json")
  .action(run((opts: { limit: string }) => client.get("/integrations/zapier/usergroups", { limit: opts.limit })));

usergroupsResource
  .command("members <usergroup_uuid>")
  .description("List the members of a user group")
  .option("--page <n>", "Page number", "1")
  .option("--limit <n>", "Rows per page, 1-100", "25")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli usergroups members usergroup_abc --limit 100 --json")
  .action(run((uuid: string, opts: { page: string; limit: string }) =>
    client.get(`/admin/${orgSlug()}/usergroups/${encodeURIComponent(uuid)}/members`, { page: opts.page, limit: opts.limit }),
  ));

usergroupsResource
  .command("add <usergroup_uuid> <user_id>")
  .description("Add a member to a user group (grants its courses); 400 if already a member")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli usergroups add usergroup_abc 42 --json")
  .action(run((uuid: string, userId: string) => client.post(membersPath(uuid, userId))));

usergroupsResource
  .command("remove <usergroup_uuid> <user_id>")
  .description("Remove a member from a user group (revokes its courses)")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli usergroups remove usergroup_abc 42 --json")
  .action(run((uuid: string, userId: string) => client.delete(membersPath(uuid, userId))));
