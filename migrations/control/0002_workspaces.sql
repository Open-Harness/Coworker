-- Which object holds each workspace, and where. One row per organization; deleting the organization deletes it.
CREATE TABLE "workspace_directory" (
  "workspaceId" TEXT PRIMARY KEY NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  "objectId" TEXT NOT NULL UNIQUE,
  "address" TEXT NOT NULL UNIQUE,
  "region" TEXT NOT NULL CHECK ("region" IN ('eu', 'us')),
  "createdAt" INTEGER NOT NULL
);
