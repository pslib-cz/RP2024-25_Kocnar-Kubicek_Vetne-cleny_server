/*
  Warnings:

  - Added the required column `secretKey` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bodyColor" TEXT NOT NULL,
    "trailColor" TEXT NOT NULL,
    "selectedRocketIndex" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "clientVersion" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("bodyColor", "clientVersion", "gameId", "id", "name", "selectedRocketIndex", "trailColor") SELECT "bodyColor", "clientVersion", "gameId", "id", "name", "selectedRocketIndex", "trailColor" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_secretKey_key" ON "Player"("secretKey");
CREATE INDEX "Player_gameId_idx" ON "Player"("gameId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
