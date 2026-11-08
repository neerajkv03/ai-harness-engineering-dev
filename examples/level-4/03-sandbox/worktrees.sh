#!/usr/bin/env bash
# One git worktree per agent: each gets its own folder and branch, so two agents never edit the same checkout.
set -euo pipefail

# From inside your repository:
git worktree add ../myapp-feature-x -b feature-x   # new folder ../myapp-feature-x on a new branch feature-x
git worktree add ../myapp-bugfix-y  -b bugfix-y    # a second one, in parallel

git worktree list                                  # shows the main checkout plus both worktrees

# Start one agent per worktree, each in its own terminal:
#   (cd ../myapp-feature-x && pi)
#   (cd ../myapp-bugfix-y  && pi)

# When an agent's work is merged or abandoned:
git worktree remove ../myapp-feature-x             # refuses if there are uncommitted changes (add --force to override)
git branch -d feature-x                            # delete the branch once merged (-D to delete unmerged work)
