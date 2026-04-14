-- CreateTable
CREATE TABLE "Medicamento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "principioActivo" TEXT NOT NULL,
    "familia" TEXT NOT NULL,
    "presentacion" TEXT NOT NULL,
    "laboratorio" TEXT NOT NULL,
    "precioReferencia" DOUBLE PRECISION,
    "vidaMedia" TEXT,
    "nivelInteracciones" TEXT,
    "efectosAdversos" TEXT[],
    "contraindicaciones" TEXT[],
    "indicaciones" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "nombre" TEXT,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "proPlan" TEXT,
    "proSubscriptionId" TEXT,
    "proSubscriptionStatus" TEXT,
    "proExpiresAt" TIMESTAMP(3),
    "stripeId" TEXT,
    "passwordResetTokenHash" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorito" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialBusqueda" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialBusqueda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "type" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparisonInsightCache" (
    "id" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "medicationIds" JSONB NOT NULL,
    "patientProfile" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "sourceModel" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComparisonInsightCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Medicamento_nombre_key" ON "Medicamento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_passwordResetTokenHash_idx" ON "Usuario"("passwordResetTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Favorito_usuarioId_medicamentoId_key" ON "Favorito"("usuarioId", "medicamentoId");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ComparisonInsightCache_requestHash_key" ON "ComparisonInsightCache"("requestHash");

-- CreateIndex
CREATE INDEX "ComparisonInsightCache_createdAt_idx" ON "ComparisonInsightCache"("createdAt");

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "Medicamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialBusqueda" ADD CONSTRAINT "HistorialBusqueda_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

