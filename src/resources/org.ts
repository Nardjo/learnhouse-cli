import { Argument, Command } from "commander";
import { run } from "../lib/action.js";
import { request } from "../lib/client.js";
import { orgSlug } from "../lib/config.js";

type Feature = { enabled: boolean; available: boolean; required_plan: string | null };
type Org = {
  id: number;
  org_uuid: string;
  name: string;
  slug: string;
  config: { config: { plan?: string; resolved_features?: Record<string, Feature> } };
};

/** Features with a `PUT /orgs/{id}/config/<feature>?<feature>_enabled=` toggle in LearnHouse 1.4 */
const TOGGLES = ["ai", "boards", "communities", "courses", "folders", "payments", "playgrounds", "podcasts"];

// Public route that refuses API tokens: read it anonymously.
const getOrg = () => request("GET", `/orgs/slug/${orgSlug()}`, { auth: "none" }) as Promise<Org>;

export const orgResource = new Command("org").description("Organization info and feature toggles");

orgResource
  .command("get")
  .description("Show the organization (id, uuid, name, slug, plan)")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli org get --json")
  .action(run(async () => {
    const org = await getOrg();
    return { id: org.id, org_uuid: org.org_uuid, name: org.name, slug: org.slug, plan: org.config?.config?.plan };
  }));

orgResource
  .command("features")
  .description("List resolved features (enabled, available, required plan)")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli org features\n  learnhouse-cli org features --json")
  .action(run(async () => {
    const features = (await getOrg()).config?.config?.resolved_features ?? {};
    return Object.entries(features).map(([feature, f]) => ({
      feature,
      enabled: f.enabled,
      available: f.available,
      required_plan: f.required_plan,
      toggle: TOGGLES.includes(feature),
    }));
  }));

orgResource
  .command("toggle")
  .description("Enable or disable a feature (needs an admin session: auth login; API tokens are refused)")
  .addArgument(new Argument("<feature>", "Feature to toggle").choices(TOGGLES))
  .addArgument(new Argument("<state>", "New state").choices(["on", "off"]))
  .addHelpText("after", "\nExamples:\n  learnhouse-cli org toggle podcasts off\n  learnhouse-cli org toggle folders on --json")
  .action(run(async (feature: string, state: string) => {
    const { id } = await getOrg();
    return request("PUT", `/orgs/${id}/config/${feature}`, {
      params: { [`${feature}_enabled`]: String(state === "on") },
      auth: "session",
    });
  }));
