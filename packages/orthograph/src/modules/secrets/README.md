# secrets

Owns `Blueprint.secret.generated()` and `Blueprint.secret.stored()`. An environment names its secrets and says how
each gets its value; the value is never written in a blueprint file (D3 #2). Test: `secrets.test.ts`.
