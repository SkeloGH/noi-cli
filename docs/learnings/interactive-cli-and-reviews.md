# Learnings — interactive CLIs and review hygiene

Principles for future work on this repo. Keep them in mind when changing terminal tools, shutdown paths, or project layout.

---

## Async cleanup and exit

When tearing down native or streaming resources, treat failures as real outcomes. A rejected cleanup must not leave the process hanging or exit silently with success. Surface the failure, set a non-zero exit status, and still terminate in a controlled way.

## Reading local metadata

Files on disk may be missing, unreadable, or malformed. Parse defensively, validate types and required fields, and define a safe fallback. Do not trust unchecked casts for values that affect behavior or output.

## Where side effects run

Parsing arguments, printing help or version, and exiting should happen from the entry path, not while the module loads. That keeps imports pure enough to test and avoids surprises when code is evaluated in unexpected orders.

## Terminal status lines

Pick one model and stick to it: either a live updating line with explicit cursor control so the cursor always ends on a normal row for unrelated output, or a one-shot message without in-place refresh. Padding with blank lines does not fix a stranded cursor.

## Configuration honesty

If a numeric or named option suggests multiple modes but only one is implemented, document that fact next to the setting. Future readers should not assume flexibility that does not exist.

## Dead guards in hot paths

Do not add clamps or bounds checks that the mathematics or types already prevent. A guard that can never fire misleads readers into believing an overflow or underflow is possible when it is not. If a guard is present, it must reflect a real reachable case — otherwise remove it and document why the value is safe.

## Teardown and layout

When the UI layer already ends each paint with a full line break, avoid adding another line break on shutdown unless there is a separate reason. Duplicate newlines often show up as an extra blank gap before the shell prompt.
