import { Argument, Command } from "commander";
import { run } from "../lib/action.js";
import { CONFIG_PATH, readConfig, writeConfig, type InstanceConfig } from "../lib/config.js";

export const configCommand = new Command("config").description(
  "Instance URL and org slug, saved in ~/.config/learnhouse-cli/config.json (LEARNHOUSE_URL and LEARNHOUSE_ORG_SLUG win)",
);

configCommand
  .command("set")
  .description("Save the instance URL or the organization slug")
  .addArgument(new Argument("<key>", "Setting").choices(["url", "org"]))
  .argument("<value>", "e.g. https://learn.example.com or my-org")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli config set url https://learn.example.com\n  learnhouse-cli config set org my-org")
  .action(run((key: keyof InstanceConfig, value: string) => {
    const cfg = { ...readConfig(), [key]: value.trim() };
    writeConfig(cfg);
    return cfg;
  }));

configCommand
  .command("show")
  .description("Show the effective instance URL and organization slug")
  .action(run(() => {
    const cfg = readConfig();
    return {
      url: process.env.LEARNHOUSE_URL || cfg.url || null,
      org: process.env.LEARNHOUSE_ORG_SLUG || cfg.org || null,
      file: CONFIG_PATH,
    };
  }));
