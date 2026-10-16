#!/usr/bin/env bun
import { Command } from "commander";
import { globalFlags } from "./lib/config.js";
import { authCommand } from "./commands/auth.js";
import { configCommand } from "./commands/config.js";
import { coursesResource } from "./resources/courses.js";
import { enrollmentsResource } from "./resources/enrollments.js";
import { orgResource } from "./resources/org.js";
import { usergroupsResource } from "./resources/usergroups.js";
import { usersResource } from "./resources/users.js";
import { webhooksResource } from "./resources/webhooks.js";

const program = new Command();

program
  .name("learnhouse-cli")
  .description("CLI for a self-hosted LearnHouse instance (admin API, org API token)")
  .version("0.1.0")
  .option("--json", "Output as JSON", false)
  .option("--format <fmt>", "Output format: text, json, csv, yaml", "text")
  .option("--verbose", "Enable debug logging", false)
  .option("--no-color", "Disable colored output")
  .option("--no-header", "Omit table/csv headers (for piping)")
  .hook("preAction", (_thisCmd, actionCmd) => {
    const root = actionCmd.optsWithGlobals();
    globalFlags.json = root.json ?? false;
    globalFlags.format = root.format ?? "text";
    globalFlags.verbose = root.verbose ?? false;
    globalFlags.noColor = root.color === false;
    globalFlags.noHeader = root.header === false;
  });

// Built-in commands
program.addCommand(authCommand);
program.addCommand(configCommand);

// Resources
program.addCommand(usersResource);
program.addCommand(usergroupsResource);
program.addCommand(coursesResource);
program.addCommand(enrollmentsResource);
program.addCommand(orgResource);
program.addCommand(webhooksResource);

program.parse();
