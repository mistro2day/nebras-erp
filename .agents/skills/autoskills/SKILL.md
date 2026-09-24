---
name: autoskills
description: Auto-detects project tech stacks and installs curated AI agent skills automatically using midudev/autoskills CLI (npx autoskills). Use when setting up new projects, adding domain-specific agent skills, auditing existing skills, or synchronizing AI assistant capabilities with the project's dependencies.
---

# Autoskills — AI Agent Skills Auto-Installer

`autoskills` is an automated tool developed by Miguel Ángel Durán (midudev) that analyzes a codebase, detects the active tech stacks (languages, frameworks, configurations), and installs verified, curated AI agent skills into the appropriate local agent directories (such as `.agents/skills/`, `.claude/skills/`, etc.).

## Key Capabilities

1. **Stack Detection**: Inspects files like `package.json`, Gradle, requirements, and configuration manifests to detect tech frameworks (Angular, React, Vue, Next.js, Django, Bash, Tailwind, etc.).
2. **Curated Registry**: Downloads audited agent skills vetted against prompt-injection and security risks.
3. **Agent Integration**: Installs skills directly compatible with Antigravity, Claude Code, Cursor, and universal agent standards (`SKILL.md`).

## Command Reference

Run the command inside the target project root:

```bash
# Preview skills to be installed without making any changes
npx autoskills --dry-run

# Automatically detect and install skills (with interactive prompts)
npx autoskills

# Automatically detect and install skills without confirmation
npx autoskills -y

# Install skills for specific agents/IDEs only
npx autoskills -a universal claude-code

# Clear the local downloaded skills cache
npx autoskills --clear-cache

# Run with verbose output for debugging
npx autoskills -v
```

## Workflow Guide for Agents

When a user requests to enhance agent capabilities for a repository:
1. Run `npx autoskills --dry-run` to inspect what skills match the project stack.
2. Present the suggested skills to the user or install them directly using `npx autoskills -y`.
3. Check the resulting `.agents/skills` directory and verify the newly installed `SKILL.md` files.
4. Adhere to any project-specific constraints (e.g. formatting rules, RTL requirements) when utilizing the newly acquired skills.
