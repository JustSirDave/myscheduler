-- CreateTable
CREATE TABLE "GoogleAccount" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "syncToken" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id")
);

