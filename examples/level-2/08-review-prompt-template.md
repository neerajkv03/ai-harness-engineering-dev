---
description: Review staged git changes
argument-hint: "[focus]"
---
Review the staged changes (`git diff --staged`). Focus on ${1:-correctness, security, and error handling}.

For each problem, give: the file and line, what is wrong, and the smallest fix.
Check specifically for:
- deleted or skipped tests
- new `any` types or widened types
- changes in files unrelated to the stated goal
- missing input validation at request boundaries

Do not edit any files. End with a one-line verdict: ship, or fix first.
