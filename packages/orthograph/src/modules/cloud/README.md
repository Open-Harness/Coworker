# cloud

Owns `Cloud.cloudflare({ database })`, `Cloud.d1()` and `Cloud.d1.local()`. An environment with a cloud is one the cloud
pass can deploy; locally every environment runs on workerd and D1's emulation (D3 #4, #5). Test: `cloud.test.ts`.
