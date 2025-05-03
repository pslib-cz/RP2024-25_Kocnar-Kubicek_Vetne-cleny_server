/*
  Warnings:

  - You are about to alter the column `expirationTime` on the `Game` table. The data in that column could be lost. The data in that column will be cast from `Int` to `DateTime`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "code" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "galaxy" INTEGER NOT NULL,
    "questiontypes" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "seed" TEXT,
    "expirationTime" DATETIME NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Game_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("active", "authorId", "code", "createdAt", "difficulty", "expirationTime", "galaxy", "id", "questiontypes", "seed", "version") SELECT "active", "authorId", "code", "createdAt", "difficulty", "expirationTime", "galaxy", "id", "questiontypes", "seed", "version" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_code_active_key" ON "Game"("code", "active");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
