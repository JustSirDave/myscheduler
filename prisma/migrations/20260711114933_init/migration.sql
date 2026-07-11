-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlannerItemType" AS ENUM ('Task', 'Habit', 'TimeBlock', 'Goal');

-- CreateEnum
CREATE TYPE "Horizon" AS ENUM ('Daily', 'Weekly', 'Monthly');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('NotStarted', 'InProgress', 'Done');

-- CreateEnum
CREATE TYPE "Origin" AS ENUM ('Local', 'GoogleCalendar');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('Expense', 'Income');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('Business', 'Food', 'Transport', 'Subscriptions', 'Personal', 'Housing', 'Other');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'BankTransfer', 'Card', 'POS');

-- CreateTable
CREATE TABLE "PlannerItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlannerItemType" NOT NULL,
    "project" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "horizon" "Horizon",
    "priority" "Priority",
    "status" "Status" NOT NULL DEFAULT 'NotStarted',
    "notes" TEXT,
    "linkedGoalId" TEXT,
    "googleEventId" TEXT,
    "origin" "Origin" NOT NULL DEFAULT 'Local',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "project" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlannerItem_googleEventId_key" ON "PlannerItem"("googleEventId");

-- CreateIndex
CREATE INDEX "PlannerItem_type_idx" ON "PlannerItem"("type");

-- CreateIndex
CREATE INDEX "PlannerItem_status_idx" ON "PlannerItem"("status");

-- CreateIndex
CREATE INDEX "PlannerItem_startAt_idx" ON "PlannerItem"("startAt");

-- CreateIndex
CREATE INDEX "Expense_type_idx" ON "Expense"("type");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- AddForeignKey
ALTER TABLE "PlannerItem" ADD CONSTRAINT "PlannerItem_linkedGoalId_fkey" FOREIGN KEY ("linkedGoalId") REFERENCES "PlannerItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

