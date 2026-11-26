# telemetry

Owns `Telemetry.sink.local()` and `Telemetry.sink.axiom({ group })`: the destinations an environment names, as a list,
in `telemetry: [...]` of `blueprint/environments/<env>.ts` (O1, D3 #100). The declaration holds no secret, no token
name and no address: those are read by name when the environment starts. Replaces the first draft's
`Telemetry.otlp({ sink, dataset })` in `ortho.config.ts`. Test: `telemetry.test.ts`.
