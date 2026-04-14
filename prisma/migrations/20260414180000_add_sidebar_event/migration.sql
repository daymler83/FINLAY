-- CreateTable
CREATE TABLE "SidebarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "url" TEXT,
    "source" TEXT,
    "type" TEXT NOT NULL DEFAULT 'conference',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SidebarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SidebarEvent_date_idx" ON "SidebarEvent"("date");
