-- When a workspace that an Owner deleted is removed for good: thirty days after its name was typed. Null: it is not being deleted.
ALTER TABLE "workspace_directory" ADD COLUMN "deleteAt" INTEGER;
