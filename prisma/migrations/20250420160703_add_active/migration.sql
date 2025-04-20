-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "active" BOOLEAN NOT NULL,
    "code" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "galaxy" INTEGER NOT NULL,
    "questiontypes" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "seeded" BOOLEAN NOT NULL,
    "expirationTime" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyColor" TEXT NOT NULL,
    "trailColor" TEXT NOT NULL,
    "selectedRocketIndex" INTEGER NOT NULL,
    CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_code_key" ON "Game"("code");
