-- Which workspace claimed each installation of the GitHub App: webhooks name only the installation.
CREATE TABLE "github_installation" (
  "installationId" INTEGER PRIMARY KEY NOT NULL,
  "workspaceId" TEXT NOT NULL UNIQUE REFERENCES "organization" ("id") ON DELETE CASCADE,
  "account" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL
);
