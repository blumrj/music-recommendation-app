-- CreateTable
CREATE TABLE "AlbumSurvey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyAlbumId" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "seasons" TEXT[],
    "emotions" TEXT[],
    "whenYouListen" TEXT[],
    "movementPreference" TEXT NOT NULL,
    "vibe" TEXT[],
    "optionalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlbumSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTasteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nature" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "introspection" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "movement" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "healing" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "melancholy" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "freedom" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "energyLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "coziness" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "dreaminess" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "dominantThemes" TEXT[],
    "userType" TEXT,
    "preferredContexts" TEXT[],
    "preferredMovements" TEXT[],
    "seasonalPreference" TEXT,
    "insights" TEXT,
    "albumsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTasteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlbumSurvey_userId_idx" ON "AlbumSurvey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AlbumSurvey_userId_spotifyAlbumId_key" ON "AlbumSurvey"("userId", "spotifyAlbumId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTasteProfile_userId_key" ON "UserTasteProfile"("userId");

-- AddForeignKey
ALTER TABLE "AlbumSurvey" ADD CONSTRAINT "AlbumSurvey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTasteProfile" ADD CONSTRAINT "UserTasteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
