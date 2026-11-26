# web

Owns `web_fetch`. The server sits inside a tailnet, so a model that can be talked into fetching any URL could read
internal services. This module lets it reach the public internet only.

Invariants

- http/https on ports 80 and 443, no credentials, no private, tailnet (100.64/10), link-local or special addresses.
- Every host name is resolved first and refused when any address is not public. Every redirect is checked again.
- 20 seconds, 2 MB, 30,000 characters.

What this cannot do: the fetch resolves the name a second time, so a hostile name server can answer differently
(DNS rebinding). `ops/pi-exp.service` closes that gap with `IPAddressDeny`.

Test: `pnpm vitest --run src/modules/web`
