# learnhouse-cli

CLI for the admin API of a self-hosted [LearnHouse](https://github.com/learnhouse/learnhouse) instance: provision members, grant and revoke course access through user groups, enroll, issue magic sign-in links, toggle org features and manage webhook subscriptions. Verified on LearnHouse community edition 1.4.0. Made with [api2cli.dev](https://api2cli.dev).

## Install

```bash
npx api2cli install Nardjo/learnhouse-cli
```

This clones the repo, builds the CLI, links it to your PATH, and installs the AgentSkill to your coding agents. Requires [Bun](https://bun.sh).

## Install AgentSkill only

```bash
npx skills add Nardjo/learnhouse-cli
```

## Configure

Nothing is hardcoded. Env vars win over the saved settings.

| Setting | Env var | Saved with |
|---------|---------|------------|
| Instance URL (`https://<domain>`) | `LEARNHOUSE_URL` | `learnhouse-cli config set url <url>` |
| Organization slug | `LEARNHOUSE_ORG_SLUG` | `learnhouse-cli config set org <slug>` |
| Org API token (`lh_...`) | `LEARNHOUSE_API_TOKEN` | `learnhouse-cli auth set <token>` |
| Admin session (only for `org toggle`) | `LEARNHOUSE_ADMIN_PASSWORD` or stdin | `learnhouse-cli auth login --email <admin>` |

Create the API token as an org admin (admin UI, or `POST /api/v1/orgs/{org_id}/api-tokens`) with only the rights buckets you need, e.g. `users`, `usergroups`, `courses`. LearnHouse 1.4.0 rejects a token whose `rights` is a complete role object. Org config routes refuse API tokens, hence the separate admin session (about 8 hours).

```bash
learnhouse-cli config set url https://learn.example.com
learnhouse-cli config set org my-org
learnhouse-cli auth set "lh_..."
learnhouse-cli auth test
```

## Resources

| Resource | Actions |
|----------|---------|
| `auth` | `set`, `show`, `remove`, `test`, `login`, `logout`, `magic-link <user_id>` |
| `config` | `set url\|org <value>`, `show` |
| `users` | `list`, `get <email>`, `create --email`, `groups <user_id>` |
| `usergroups` | `list`, `members <uuid>`, `add <uuid> <user_id>`, `remove <uuid> <user_id>` |
| `courses` | `list` |
| `enrollments` | `list <user_id>`, `add <user_id> <course_uuid>` |
| `org` | `get`, `features`, `toggle <feature> on\|off` |
| `webhooks` | `events`, `list`, `create --url --event`, `delete <id>` |

Every action documents its flags with `--help`. Full guide with examples: [skills/learnhouse-cli/SKILL.md](skills/learnhouse-cli/SKILL.md).

```bash
# Grant access to a private course: membership of its linked user group opens it
ID=$(learnhouse-cli users create --email buyer@example.com --first-name Ada --json | jq -r .data.id)
learnhouse-cli usergroups add usergroup_xxx "$ID"
learnhouse-cli auth magic-link "$ID" --ttl 900 --json | jq -r .data.url
```

## Global Flags

All commands support: `--json`, `--format <text|json|csv|yaml>`, `--verbose`, `--no-color`, `--no-header`

Exit codes: 0 = success, 1 = API error, 2 = usage or configuration error.

## License

MIT
