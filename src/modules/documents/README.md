# documents

Owns the documents the agent writes: `write_document`, `edit_document`, `read_document`, their versions, and reading them.

Invariants

- `saveVersion` is the only way a document changes. It adds a version; it never rewrites one.
- A workspace holds at most 200 documents, 20 versions each, 150,000 characters per version.
- Replaying a tool call after a crash returns what it saved; it does not save again.

Test: `pnpm vitest --run src/modules/documents`
