import { Command } from "commander";
import { run } from "../lib/action.js";
import { client } from "../lib/client.js";

export const coursesResource = new Command("courses").description("List courses (to find a course_uuid)");

coursesResource
  .command("list")
  .description("List courses, newest first (id, course_uuid, name)")
  .option("--limit <n>", "Max rows, 1-500", "100")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli courses list --json")
  .action(run((opts: { limit: string }) => client.get("/integrations/zapier/courses", { limit: opts.limit })));
