import { PrismaClient } from '@prisma/client';
import type { Game } from '@prisma/client';
import type { Request, Response, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const createGame: RequestHandler = async (req, res): Promise<any> => {
  const { difficulty, galaxy, questiontypes, version } = req.body;

  console.log('Received request to create game:', req.body);

  if (typeof difficulty !== 'number' || difficulty < 0 || difficulty > 100) {
    return res.status(400).json({ error: 'Invalid difficulty value' });
  }

  if (typeof galaxy !== 'number' || galaxy < 0 || galaxy > 4) {
    return res.status(400).json({ error: 'Invalid galaxy value' });
  }

  if (typeof questiontypes !== 'number' || questiontypes < 0) {
    return res.status(400).json({ error: 'Invalid questiontypes value' });
  }

  if (typeof version !== 'string') {
    return res.status(400).json({ error: 'Invalid version value' });
  }

  const gameId = uuidv4();
  const code = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit code
  const seed = crypto.randomBytes(16).toString('hex'); // Generate random seed
  const expirationTime = Date.now() + 60 * 60 * 1000; // 1 hour

  await prisma.game.create({
    data: {
      id: gameId,
      code,
      difficulty,
      galaxy,
      questiontypes, // Convert to string
      version,
      seed,
      seeded: true, // Default to true
      active: true,
      expirationTime,
    },
  });

  res.json({ gameId, code });
};

export const joinGame: RequestHandler = async (req, res): Promise<void> => {
  const { code, version, user } = req.body;

  const game = await prisma.game.findFirst({
    where: { code: parseInt(code, 10) }, // Ensure code is treated as an integer
  });

  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  if (Date.now() > game.expirationTime) {
    await prisma.game.delete({
      where: { id: game.id },
    });
    res.status(410).json({ error: 'Game has expired' });
    return;
  }

  if (game.version !== version) {
    res.status(400).json({ error: 'Version mismatch' });
    return;
  }

  if (!user || typeof user.name !== 'string' || typeof user.bodyColor !== 'string' || typeof user.trailColor !== 'string' || typeof user.selectedRocketIndex !== 'number') {
    res.status(400).json({ error: 'Invalid user data' });
    return;
  }

  const playerId = uuidv4();
  await prisma.player.create({
    data: {
      id: playerId,
      gameId: game.id,
      name: user.name,
      bodyColor: user.bodyColor,
      trailColor: user.trailColor,
      selectedRocketIndex: user.selectedRocketIndex,
    },
  });

  res.json({
    message: 'Joined game successfully',
    game: {
      difficulty: game.difficulty,
      galaxy: game.galaxy,
      questiontypes: game.questiontypes, // Use as a number directly
      version: game.version,
      seed: game.seed,
      seeded: game.seeded,
    },
  });
};