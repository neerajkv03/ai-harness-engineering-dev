---
name: release-notes
description: Draft release notes from git history. Use when asked for release notes, a changelog entry, or "what changed since vX".
---

# Release notes

1. Find the range. If the user named a tag, use it. Otherwise run `git describe --tags --abbrev=0` to get the latest tag. If that fails because the repo has no tags, ask the user for a starting commit or date; if they have none, use the whole history (`git log --no-merges`).
2. List the commits: `git log <tag>..HEAD --no-merges --pretty=format:"%h %s"`.
3. Read `references/changelog-format.md` for the output format, then group the commits under its headings.
4. Skip commits that only change tests, CI or formatting, unless the user asks for them.
5. Show the draft. Do not edit `CHANGELOG.md` until the user approves it.
