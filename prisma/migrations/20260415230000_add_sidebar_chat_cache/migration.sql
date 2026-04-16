CREATE TABLE "SidebarChatCache" (
    "id" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "normalizedMessage" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "medicationIds" JSONB NOT NULL,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "sourceModel" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SidebarChatCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SidebarChatCache_requestHash_key" ON "SidebarChatCache"("requestHash");
CREATE INDEX "SidebarChatCache_createdAt_idx" ON "SidebarChatCache"("createdAt");
CREATE INDEX "SidebarChatCache_normalizedMessage_idx" ON "SidebarChatCache"("normalizedMessage");
