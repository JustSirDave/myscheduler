-- Reminder categories + Goal target date + phone-push tracking + push subscriptions.
-- Hand-written because the PlannerItemType enum drops the 'Event' value and existing
-- rows must be remapped (Event -> Reminder with reminderKind = Event).

-- New enum for what a Reminder is about.
CREATE TYPE "ReminderKind" AS ENUM ('Event', 'Habit', 'StartGoal', 'ContinueGoal', 'General');

-- New columns.
ALTER TABLE "PlannerItem" ADD COLUMN "reminderKind" "ReminderKind";
ALTER TABLE "PlannerItem" ADD COLUMN "targetDate" TIMESTAMP(3);
ALTER TABLE "PlannerItem" ADD COLUMN "notifiedAt" TIMESTAMP(3);

-- Backfill reminderKind before the 'Event' type value disappears.
UPDATE "PlannerItem" SET "reminderKind" = 'Event' WHERE "type" = 'Event';
UPDATE "PlannerItem" SET "reminderKind" = 'General' WHERE "type" = 'Reminder' AND "reminderKind" IS NULL;

-- Swap PlannerItemType to remove 'Event'.
ALTER TYPE "PlannerItemType" RENAME TO "PlannerItemType_old";
CREATE TYPE "PlannerItemType" AS ENUM ('Reminder', 'Alarm', 'Task', 'Goal');
ALTER TABLE "PlannerItem"
  ALTER COLUMN "type" TYPE "PlannerItemType"
  USING (
    CASE "type"::text
      WHEN 'Event' THEN 'Reminder'
      WHEN 'Alarm' THEN 'Alarm'
      WHEN 'Reminder' THEN 'Reminder'
      WHEN 'Task' THEN 'Task'
      WHEN 'Goal' THEN 'Goal'
      ELSE 'Reminder'
    END::"PlannerItemType"
  );
DROP TYPE "PlannerItemType_old";

-- Web Push subscriptions.
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
