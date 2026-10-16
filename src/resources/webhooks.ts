import { Command } from "commander";
import { run } from "../lib/action.js";
import { client } from "../lib/client.js";

type EventInfo = { category: string; description: string };

export const webhooksResource = new Command("webhooks").description(
  "Outgoing webhook subscriptions through the API-token (Zapier REST Hooks) endpoints",
);

webhooksResource
  .command("events")
  .description("List subscribable event names")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli webhooks events")
  .action(run(async () => {
    const { events } = (await client.get("/integrations/zapier/events")) as { events: Record<string, EventInfo> };
    return Object.entries(events).map(([event, e]) => ({ event, category: e.category, description: e.description }));
  }));

webhooksResource
  .command("list")
  .description("List subscriptions created with an API token")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli webhooks list --json")
  .action(run(() => client.get("/integrations/zapier/subscriptions")));

webhooksResource
  .command("create")
  .description("Subscribe a public HTTPS URL to one event (the token's creator must be an org admin)")
  .requiredOption("--url <target_url>", "Public receiver URL (private IPs are refused)")
  .requiredOption("--event <event>", "Event name, see: webhooks events")
  .option("--name <name>", "Label shown in the admin UI")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli webhooks create --url https://hooks.example.com/lh --event course_completed --json")
  .action(run((opts: { url: string; event: string; name?: string }) =>
    client.post("/integrations/zapier/subscriptions", { target_url: opts.url, event: opts.event, zap_name: opts.name }),
  ));

webhooksResource
  .command("delete <id>")
  .description("Delete a subscription by its numeric id")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli webhooks delete 3 --json")
  .action(run((id: string) => client.delete(`/integrations/zapier/subscriptions/${encodeURIComponent(id)}`)));
