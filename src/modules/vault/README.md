# vault

A workspace's secrets: model keys, endpoint keys, OAuth tokens, bot tokens, signing secrets. Envelope encryption, in
the Workspace object's own storage (`vault_key`, `vault_secret`).

**Invariants**

- Each workspace has one data key (32 random bytes), stored only wrapped by the master key, with the master key's id.
- Each secret is AES-256-GCM under the data key, with a fresh IV and the secret's name as associated data, so a
  ciphertext moved to another name does not open.
- A value is decrypted only inside `use(name, fn)`, for that call. Nothing keeps it: no cache, no log, and the audit
  line carries the name only.
- Replacing the master key (`masterKeys.current`, with the old one in `retired`) and calling `rewrap` rewraps the data
  key only; the secrets are untouched.
- Destroying the Workspace object destroys the data key, so any ciphertext left anywhere can no longer be read.

**The master key** is a Secrets Store secret (`VAULT_MASTER_KEY`): 32 random bytes in base64, read on first use by
`secretsStoreMasterKey`. The fast tier uses `testMasterKey` from `testing.ts`.

**Testing:** `vault.test.ts` runs against a real Workspace object's SQLite storage.
