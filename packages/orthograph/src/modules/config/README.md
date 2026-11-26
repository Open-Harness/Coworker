# config

Owns `Blueprint.config({ name, auth })` and `Auth.betterAuth`: the declarations
of `ortho.config.ts`, the project's one loose file. In layer two it is declared and type-checked; the compiler
does not read it into the model. Its old `outputs` field was read by nothing and was removed in M0 (D3 #112);
what a project generates is mounted as projections from M1. Telemetry is no longer here: it is a list of sinks per
environment (`modules/telemetry`, D3 #100). Test: `config.test.ts`.
