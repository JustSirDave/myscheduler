-- Rework PlannerItemType enum: Task/Habit/TimeBlock/Goal -> Event/Alarm/Reminder/Task/Goal.
-- Hand-written so existing rows are remapped (TimeBlock->Event, Habit->Reminder) instead
-- of failing on values that no longer exist in the enum.
ALTER TYPE "PlannerItemType" RENAME TO "PlannerItemType_old";

CREATE TYPE "PlannerItemType" AS ENUM ('Event', 'Alarm', 'Reminder', 'Task', 'Goal');

ALTER TABLE "PlannerItem"
  ALTER COLUMN "type" TYPE "PlannerItemType"
  USING (
    CASE "type"::text
      WHEN 'TimeBlock' THEN 'Event'
      WHEN 'Habit' THEN 'Reminder'
      WHEN 'Task' THEN 'Task'
      WHEN 'Goal' THEN 'Goal'
      ELSE 'Task'
    END::"PlannerItemType"
  );

DROP TYPE "PlannerItemType_old";

-- Per-item lead time (minutes) for a popup notification on the pushed Google event.
ALTER TABLE "PlannerItem" ADD COLUMN "reminderMinutes" INTEGER;
