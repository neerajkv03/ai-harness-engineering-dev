---
name: fix-failing-test
description: Fix code so a failing test passes, without weakening the test. Use when asked to make a test pass, fix a failing test, or implement a function that a test file already specifies.
---

# Fix a failing test

1. Run the test first (`node --test <file>`) and read the failure. Do not edit anything before you have seen it fail.
2. Read the test file. The test is the specification: list every case it checks, including the edge cases.
3. Read the code under test. Find the smallest change that makes every listed case pass.
4. Make that change with `edit` (or `write` for a new file). Never change the test file to make it pass.
5. Run the test again. If it still fails, read the new output and go back to step 3. Stop after three attempts and report what you tried.
6. Reply with what you changed and the final test output.
