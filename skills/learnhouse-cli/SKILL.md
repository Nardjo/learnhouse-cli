---
name: learnhouse-cli
description: "Manage a self-hosted LearnHouse LMS via CLI - users, usergroups, courses, enrollments, org (feature toggles), webhooks, auth (API token, admin session, magic sign-in links). Use when user mentions 'LearnHouse', 'formation', 'training platform', 'grant course access', 'add buyer to group', 'revoke access after refund', 'magic link', 'enroll a student', 'hide a LearnHouse feature', or 'LearnHouse webhook'."
category: "other"
---

# learnhouse-cli

Agent-ready CLI for the admin API of a self-hosted [LearnHouse](https://github.com/learnhouse/learnhouse) instance (verified on community edition 1.4.0). Base URL `https://<domain>/api/v1`, auth `Authorization: Bearer lh_...` (an organization API token). Nothing about the instance is hardcoded: the URL, org slug and token come from env vars or the CLI's own config.

## When To Use This Skill

Use the `learnhouse-cli` skill when you need to:

- give a buyer access to a paid training: find or create their account, then add them to the user group linked to the private course
- revoke a member's access after a refund or cancellation
- send a member straight into the platform with a one-time sign-in URL after checkout
- check who is in a cohort, which cohorts a member belongs to, or what they are enrolled in
- show or hide platform features (library, podcasts, communities, boards, playgrounds...)
- register a public URL that receives LearnHouse events (course completed, user signed up...)

## Capabilities

- **Read**: members (list, by email), user groups and their members, a member's groups, courses, enrollments with progress, org info and resolved features, webhook events and subscriptions
- **Write**: create passwordless members, add/remove group members, enroll in a course, issue magic sign-in links, toggle org features, create/delete webhook subscriptions
- **Automation**: stable `--json` envelope and exit codes (0 ok, 1 API error, 2 usage/config error)
- **Discovery**: `--help` at CLI, resource and action level

Access model to keep in mind: a **private, published** course linked to a user group is readable only by that group's members. Enrollment alone does not open a private course; group membership does.

## Common Use Cases

- "Grant buyer@example.com access to the course group, creating the account if needed."
- "A customer was refunded: remove them from the cohort."
- "Generate a 15-minute sign-in link for user 42 that lands on the course page."
- "Who is in the January cohort? Export it as CSV."
- "Hide the podcasts and library features on the training platform."
- "Send course_completed events to our automation endpoint."

## Setup

If `learnhouse-cli` is not found, install and build it:

```bash
bun --version || curl -fsSL https://bun.sh/install | bash
npx api2cli install Nardjo/learnhouse-cli
```

Point it at an instance once (env vars win over the saved config):

```bash
learnhouse-cli config set url https://learn.example.com   # or LEARNHOUSE_URL
learnhouse-cli config set org my-org                      # or LEARNHOUSE_ORG_SLUG
learnhouse-cli config show --json
```

## Authentication

Two credentials, each for different routes:

1. **Org API token** (`lh_...`), for everything except `org toggle`. Create it in the admin UI (Organization settings, API) or with `POST /orgs/{org_id}/api-tokens` as an admin. Grant only the rights buckets you need (`users`, `usergroups`, `courses` read/create/update); in 1.4.0 do not send a complete role object as `rights`, the token is rejected. The token is shown once. `webhooks create` also requires the token's creator to be an org admin.

   ```bash
   learnhouse-cli auth set "lh_..."     # or LEARNHOUSE_API_TOKEN (wins over the file)
   learnhouse-cli auth test --json      # org_id, org_slug, token_name
   ```

2. **Admin session** (user JWT, about 8 hours), only for `org toggle`: LearnHouse refuses API tokens on org config routes. The password comes from stdin or `LEARNHOUSE_ADMIN_PASSWORD`, never from a flag.

   ```bash
   printf %s "$PASSWORD" | learnhouse-cli auth login --email admin@example.com --json
   learnhouse-cli auth logout
   ```

Files: token `~/.config/tokens/learnhouse-cli.txt`, session `~/.config/tokens/learnhouse-cli-session.txt` (both chmod 600), config `~/.config/learnhouse-cli/config.json`.

## Working Rules

- Always use `--json` for agent-driven calls.
- Read before writing: `users get <email>` before `users create`, `usergroups list` to find a `usergroup_uuid`, `courses list` for a `course_uuid`.
- `users get` exits 1 with `"code": 404` for an unknown email: that means "create it", not a failure.
- Adding an existing member answers 400 `User is already in this group`; creating an existing email answers 409. Treat both as already done when the goal is idempotent access.
- A magic link is a credential: hand it to the member immediately, never log or store it. `--ttl` is 60 to 900 seconds.
- Webhook targets must be public URLs (private and internal IPs are refused). Subscriptions made here are signed with a secret LearnHouse never returns; when the receiver must verify `X-Webhook-Signature`, create the webhook in the admin UI instead (secret shown once).

## Resources

### auth

| Command | Description |
|---------|-------------|
| `learnhouse-cli auth set <lh_token>` | Save the org API token |
| `learnhouse-cli auth show` | Show the masked token and whether an admin session is saved |
| `learnhouse-cli auth show --raw` | Show the full token |
| `learnhouse-cli auth remove` | Delete the saved token |
| `learnhouse-cli auth test --json` | Verify the token (org id, slug, token name) |
| `printf %s "$PASSWORD" \| learnhouse-cli auth login --email <admin-email> --json` | Save an admin session for `org toggle` |
| `learnhouse-cli auth logout` | Delete the admin session |
| `learnhouse-cli auth magic-link <user_id> --redirect-to /course/<id> --ttl 900 --json` | One-time sign-in URL (`url`, `token`, `expires_at`); nothing is emailed |

### config

| Command | Description |
|---------|-------------|
| `learnhouse-cli config set url https://learn.example.com --json` | Save the instance URL |
| `learnhouse-cli config set org my-org --json` | Save the organization slug |
| `learnhouse-cli config show --json` | Effective URL and slug (env vars applied) |

### users

| Command | Description |
|---------|-------------|
| `learnhouse-cli users list --limit 100 --json` | Org members (id, user_uuid, email, username, names), max 500 |
| `learnhouse-cli users get <email> --json` | Member by email; 404 when unknown |
| `learnhouse-cli users create --email <email> --first-name Ada --json` | Passwordless member (email verified, signs in by magic link); username defaults to the email's local part plus a random suffix |
| `learnhouse-cli users create --email <email> --username ada --last-name Lovelace --json` | Same with an explicit username and last name |
| `learnhouse-cli users groups <user_id> --json` | User groups the member belongs to |

### usergroups

| Command | Description |
|---------|-------------|
| `learnhouse-cli usergroups list --json` | User groups (id, usergroup_uuid, name, description) |
| `learnhouse-cli usergroups members <usergroup_uuid> --page 1 --limit 100 --json` | Members of a group, paginated (limit 1-100) |
| `learnhouse-cli usergroups add <usergroup_uuid> <user_id> --json` | Add a member: opens the group's private courses |
| `learnhouse-cli usergroups remove <usergroup_uuid> <user_id> --json` | Remove a member: closes them again |

### courses

| Command | Description |
|---------|-------------|
| `learnhouse-cli courses list --limit 100 --json` | Courses, newest first (id, course_uuid, name) |

### enrollments

| Command | Description |
|---------|-------------|
| `learnhouse-cli enrollments list <user_id> --json` | Member's trail: one run per enrolled course with status and steps |
| `learnhouse-cli enrollments add <user_id> <course_uuid> --json` | Enroll a member (progress tracking only) |

### org

| Command | Description |
|---------|-------------|
| `learnhouse-cli org get --json` | Org id, uuid, name, slug, plan (public route, no credential used) |
| `learnhouse-cli org features --json` | Resolved features: `enabled`, `available`, `required_plan`, `toggle` (can be switched here) |
| `learnhouse-cli org toggle podcasts off --json` | Disable a feature (admin session required) |
| `learnhouse-cli org toggle folders on --json` | Enable a feature |

Toggleable: `ai`, `boards`, `communities`, `courses`, `folders` (Library), `payments`, `playgrounds`, `podcasts`. Payments, SSO, audit logs and SCORM are Enterprise-only and stay unavailable on community edition.

### webhooks

| Command | Description |
|---------|-------------|
| `learnhouse-cli webhooks events --json` | Subscribable events with category and description |
| `learnhouse-cli webhooks list --json` | Subscriptions created with an API token |
| `learnhouse-cli webhooks create --url https://hooks.example.com/lh --event course_completed --name my-hook --json` | Subscribe a public URL to one event |
| `learnhouse-cli webhooks delete <id> --json` | Delete a subscription by numeric id |

Useful events: `user_signed_up`, `course_enrolled`, `course_completed`, `activity_completed`. There is no chapter-completed event.

## Workflows

Grant access after a purchase:

```bash
ID=$(learnhouse-cli users get "$EMAIL" --json | jq -r '.data.id // empty')
[ -n "$ID" ] || ID=$(learnhouse-cli users create --email "$EMAIL" --first-name "$FIRST" --json | jq -r .data.id)
learnhouse-cli usergroups add "$GROUP_UUID" "$ID" --json   # 400 "already in this group" = done
learnhouse-cli auth magic-link "$ID" --redirect-to / --ttl 900 --json | jq -r .data.url
```

Revoke after a refund:

```bash
ID=$(learnhouse-cli users get "$EMAIL" --json | jq -r '.data.id // empty')
[ -z "$ID" ] || learnhouse-cli usergroups remove "$GROUP_UUID" "$ID" --json
```

## Output Format

`--json` returns a standardized envelope:

```json
{ "ok": true, "data": { ... }, "meta": { "total": 42 } }
```

On error (printed on stderr): `{ "ok": false, "error": { "code": 404, "message": "User not found in this organization" } }`. `code` is the HTTP status for API errors, or 2 for usage/config errors (with a `suggestion`).

## Quick Reference

```bash
learnhouse-cli --help                     # List all resources and global flags
learnhouse-cli <resource> --help          # List all actions for a resource
learnhouse-cli <resource> <action> --help # Show flags for a specific action
```

## Global Flags

All commands support: `--json`, `--format <text|json|csv|yaml>`, `--verbose`, `--no-color`, `--no-header`

Exit codes: 0 = success, 1 = API error, 2 = usage or configuration error
