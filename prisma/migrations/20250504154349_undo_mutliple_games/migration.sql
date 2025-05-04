/*
  Warnings:

  - You are about to drop the `_GameToPlayers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "_GameToPlayers_B_index";

-- DropIndex
DROP INDEX "_GameToPlayers_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_GameToPlayers";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bodyColor" TEXT NOT NULL,
    "trailColor" TEXT NOT NULL,
    "selectedRocketIndex" INTEGER NOT NULL,
    "clientVersion" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "activeGameId" TEXT,
    CONSTRAINT "Player_activeGameId_fkey" FOREIGN KEY ("activeGameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("bodyColor", "clientVersion", "id", "name", "secretKey", "selectedRocketIndex", "trailColor") SELECT "bodyColor", "clientVersion", "id", "name", "secretKey", "selectedRocketIndex", "trailColor" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_secretKey_key" ON "Player"("secretKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
