-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bodyColor" TEXT NOT NULL,
    "trailColor" TEXT NOT NULL,
    "levels" TEXT NOT NULL,
    "selectedRocketIndex" INTEGER NOT NULL,
    "clientVersion" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "activeGameId" TEXT,
    CONSTRAINT "Player_activeGameId_fkey" FOREIGN KEY ("activeGameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("activeGameId", "bodyColor", "clientVersion", "id", "levels", "name", "secretKey", "selectedRocketIndex", "trailColor") SELECT "activeGameId", "bodyColor", "clientVersion", "id", "levels", "name", "secretKey", "selectedRocketIndex", "trailColor" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_secretKey_key" ON "Player"("secretKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
