-- Remove the Alarm planner type. Any existing Alarm rows become a General Reminder.
UPDATE "PlannerItem" SET "reminderKind" = 'General' WHERE "type" = 'Alarm' AND "reminderKind" IS NULL;

ALTER TYPE "PlannerItemType" RENAME TO "PlannerItemType_old";
CREATE TYPE "PlannerItemType" AS ENUM ('Reminder', 'Task', 'Goal');
ALTER TABLE "PlannerItem"
  ALTER COLUMN "type" TYPE "PlannerItemType"
  USING (
    CASE "type"::text
      WHEN 'Alarm' THEN 'Reminder'
      WHEN 'Reminder' THEN 'Reminder'
      WHEN 'Task' THEN 'Task'
      WHEN 'Goal' THEN 'Goal'
      ELSE 'Reminder'
    END::"PlannerItemType"
  );
DROP TYPE "PlannerItemType_old";
