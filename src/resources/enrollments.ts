import { Command } from "commander";
import { run } from "../lib/action.js";
import { client } from "../lib/client.js";
import { orgSlug } from "../lib/config.js";

export const enrollmentsResource = new Command("enrollments").description(
  "Course enrollments (progress tracking; enrollment alone does not open a private course)",
);

enrollmentsResource
  .command("list <user_id>")
  .description("Show a member's enrollments with trail runs and steps")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli enrollments list 42 --json")
  .action(run((userId: string) => client.get(`/admin/${orgSlug()}/enrollments/${encodeURIComponent(userId)}`)));

enrollmentsResource
  .command("add <user_id> <course_uuid>")
  .description("Enroll a member in a course on their behalf")
  .addHelpText("after", "\nExamples:\n  learnhouse-cli enrollments add 42 course_abc --json")
  .action(run((userId: string, courseUuid: string) =>
    client.post(`/admin/${orgSlug()}/enrollments/${encodeURIComponent(userId)}/${encodeURIComponent(courseUuid)}`),
  ));
