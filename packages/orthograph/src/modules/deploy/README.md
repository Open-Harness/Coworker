# deploy

Owns `Deploy.worker`, `Deploy.site` (what runs) and `Deploy.npm`, `Deploy.homebrew`, `Deploy.binaries` (what is
installed). An environment lists them under `deploy` and `publish`; the domain is only named here, used by the cloud
pass (D3 #5, #9). Test: `deploy.test.ts`.
