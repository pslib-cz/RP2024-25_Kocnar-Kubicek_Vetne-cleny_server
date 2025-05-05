import { PrismaClient } from '@prisma/client';
import type { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Helper function to verify secret key
async function verifySecretKey(playerId: string, secretKey: string): Promise<boolean> {
  const player = await prisma.player.findUnique({
    where: { id: playerId }
  });
  return player?.secretKey === secretKey;
}

// Player Management
export const createPlayer: RequestHandler = async (req, res): Promise<void> => {
  const { id, name, bodyColor, trailColor, levels, selectedRocketIndex, clientVersion, secretKey } = req.body;

  if (!validatePlayerInput({ id, name, bodyColor, trailColor, levels, selectedRocketIndex, clientVersion, secretKey })) {
    res.status(400).json({ error: 'Invalid input parameters' });
    return;
  }

  // Check if player ID already exists
  const existingPlayer = await prisma.player.findUnique({
    where: { id }
  });

  if (existingPlayer) {
    res.status(409).json({ error: 'Player ID already exists' });
    return;
  }

  // Check if secret key already exists
  const existingSecretKey = await prisma.player.findUnique({
    where: { secretKey }
  });

  if (existingSecretKey) {
    res.status(409).json({ error: 'Secret key already exists' });
    return;
  }

  const player = await prisma.player.create({
    data: {
      id,
      name,
      bodyColor,
      trailColor,
      levels: levels.join(','),
      selectedRocketIndex,
      clientVersion,
      secretKey,
    }
  });

  res.json({
    id: player.id,
    name: player.name
  });
};

// Game Management
export const createGame: RequestHandler = async (req, res): Promise<void> => {
  const { difficulty, galaxy, questiontypes, version, expiration } = req.body;
  const secretKey = req.headers['x-user-secret'] as string;
  const authorId = req.headers['x-user-id'] as string;

  if (!secretKey) {
    res.status(401).json({ error: 'Missing secret key' });
    return;
  }

  if (!authorId) {
    res.status(401).json({ error: 'Missing user ID' });
    return;
  }

  if (!await verifySecretKey(authorId, secretKey)) {
    res.status(401).json({ error: 'Invalid secret key' });
    return;
  }

  // Validate input
  if (!validateGameInput(difficulty, galaxy, questiontypes, version)) {
    res.status(400).json({ error: 'Invalid input parameters' });
    return;
  }

  // Check if author exists
  const author = await prisma.player.findUnique({
    where: { id: authorId }
  });

  if (!author) {
    res.status(404).json({ error: 'Author not found' });
    return;
  }

  const gameId = uuidv4();
  const seed = crypto.randomBytes(16).toString('hex');
  const expirationTime = new Date(Date.now() + expiration * 1000);

  // Try to create a game with a unique code
  let attempts = 0;
  const maxAttempts = 5;
  let game;

  while (attempts < maxAttempts) {
    const code = Math.floor(1000 + Math.random() * 9000);
    
    // Check if there's an active game with this code
    const existingGame = await prisma.game.findFirst({
      where: { 
        code,
        active: true 
      }
    });

    if (!existingGame) {
      // No active game with this code, create the game
      game = await prisma.game.create({
        data: {
          id: gameId,
          code,
          difficulty,
          galaxy,
          questiontypes,
          version,
          seed,
          active: true,
          expirationTime,
          authorId,
        },
        include: {
          author: true
        }
      });
      break;
    }

    attempts++;
  }

  if (!game) {
    res.status(500).json({ error: 'Failed to generate unique game code' });
    return;
  }

  res.json({ 
    gameId, 
    code: game.code,
    author: {
      id: game.author.id,
      name: game.author.name
    }
  });
};

export const joinGame: RequestHandler = async (req, res): Promise<void> => {
  const { code, version } = req.body;
  const secretKey = req.headers['x-user-secret'] as string;
  const playerId = req.headers['x-user-id'] as string;

  if (!secretKey) {
    res.status(401).json({ error: 'Missing secret key' });
    return;
  }

  if (!playerId) {
    res.status(401).json({ error: 'Missing user ID' });
    return;
  }

  if (!await verifySecretKey(playerId, secretKey)) {
    res.status(401).json({ error: 'Invalid secret key' });
    return;
  }

  const game = await prisma.game.findFirst({
    where: { code: parseInt(code, 10) },
  });

  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  if (new Date() > game.expirationTime) {
    await prisma.game.update({
      where: { id: game.id },
      data: { active: false }
    });
    res.status(410).json({ error: 'Game has expired' });
    return;
  }

  if (game.version !== version) {
    res.status(400).json({ error: 'Version mismatch' });
    return;
  }

  // Find existing player
  const player = await prisma.player.findUnique({
    where: { id: playerId }
  });

  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  // Update player's game
  await prisma.player.update({
    where: { id: playerId },
    data: { 
      activeGameId: game.id,
      clientVersion: version
    }
  });

  res.json({
    playerId: player.id,
    game: {
      difficulty: game.difficulty,
      galaxy: game.galaxy,
      questiontypes: game.questiontypes,
      version: game.version,
      seed: game.seed,
    },
  });
};

// Session Management
export const startSession: RequestHandler = async (req, res): Promise<void> => {
  const { gameId } = req.body;
  const secretKey = req.headers['x-user-secret'] as string;
  const playerId = req.headers['x-user-id'] as string;

  if (!secretKey) {
    res.status(401).json({ error: 'Missing secret key' });
    return;
  }

  if (!playerId) {
    res.status(401).json({ error: 'Missing user ID' });
    return;
  }

  if (!await verifySecretKey(playerId, secretKey)) {
    res.status(401).json({ error: 'Invalid secret key' });
    return;
  }

  if (!gameId) {
    res.status(400).json({ error: 'Missing game ID' });
    return;
  }

  const [player, game] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId } }),
    prisma.game.findUnique({ where: { id: gameId } })
  ]);

  if (!player || !game) {
    res.status(404).json({ error: 'Player or game not found' });
    return;
  }

  const session = await prisma.gameSession.create({
    data: {
      playerId,
      gameId,
      startedAt: new Date(),
    }
  });

  res.json({ sessionId: session.id });
};

export const updateSession: RequestHandler = async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  const { score, correctAnswers, completed } = req.body;
  const secretKey = req.headers['x-user-secret'] as string;
  const playerId = req.headers['x-user-id'] as string;

  if (!secretKey) {
    res.status(401).json({ error: 'Missing secret key' });
    return;
  }

  if (!playerId) {
    res.status(401).json({ error: 'Missing user ID' });
    return;
  }

  if (!await verifySecretKey(playerId, secretKey)) {
    res.status(401).json({ error: 'Invalid secret key' });
    return;
  }

  if (!sessionId) {
    res.status(400).json({ error: 'Missing session ID' });
    return;
  }

  // Verify the session belongs to the player
  const session = await prisma.gameSession.findFirst({
    where: {
      id: sessionId,
      playerId: playerId
    }
  });

  if (!session) {
    res.status(404).json({ error: 'Session not found or unauthorized' });
    return;
  }

  const updateData: any = {};
  if (typeof score === 'number') updateData.score = score;
  if (typeof correctAnswers === 'number') updateData.correctAnswers = correctAnswers;
  if (typeof completed === 'boolean') {
    updateData.completed = completed;
    if (completed) updateData.endedAt = new Date();
  }

  const updatedSession = await prisma.gameSession.update({
    where: { id: sessionId },
    data: updateData
  });

  res.json(updatedSession);
};

export const getPlayerSessions: RequestHandler = async (req, res): Promise<void> => {
  const { playerId } = req.params;

  if (!playerId) {
    res.status(400).json({ error: 'Missing player ID' });
    return;
  }

  const sessions = await prisma.gameSession.findMany({
    where: { playerId },
    include: {
      game: true
    },
    orderBy: {
      startedAt: 'desc'
    }
  });

  res.json(sessions);
};

export const getGameSessions: RequestHandler = async (req, res): Promise<void> => {
  const { gameId } = req.params;

  if (!gameId) {
    res.status(400).json({ error: 'Missing game ID' });
    return;
  }

  const sessions = await prisma.gameSession.findMany({
    where: { gameId },
    include: {
      player: true
    },
    orderBy: {
      startedAt: 'desc'
    }
  });

  res.json(sessions);
};

export const getPlayerInfo: RequestHandler = async (req, res): Promise<void> => {
  const { playerId } = req.params;

  if (!playerId) {
    res.status(400).json({ error: 'Missing player ID' });
    return;
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      name: true,
      bodyColor: true,
      trailColor: true,
      levels: true,
      selectedRocketIndex: true,
      clientVersion: true,
      activeGame: true,
      sessions: true,
    },
  });

  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  // Convert levels string back to array
  const playerWithParsedLevels = {
    ...player,
    levels: player.levels.split(',').map(Number)
  };

  res.json(playerWithParsedLevels);
};

export const syncPlayerConfig: RequestHandler = async (req, res): Promise<void> => {
  const { name, bodyColor, trailColor, levels, selectedRocketIndex, clientVersion } = req.body;
  const secretKey = req.headers['x-user-secret'] as string;
  const playerId = req.headers['x-user-id'] as string;

  if (!secretKey) {
    res.status(401).json({ error: 'Missing secret key' });
    return;
  }

  if (!playerId) {
    res.status(401).json({ error: 'Missing user ID' });
    return;
  }

  if (!await verifySecretKey(playerId, secretKey)) {
    res.status(401).json({ error: 'Invalid secret key' });
    return;
  }

  // Get current player data
  const player = await prisma.player.findUnique({
    where: { id: playerId }
  });

  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  // Update player configuration
  const updatedPlayer = await prisma.player.update({
    where: { id: playerId },
    data: {
      name: name || player.name,
      bodyColor: bodyColor || player.bodyColor,
      trailColor: trailColor || player.trailColor,
      levels: levels ? levels.join(',') : player.levels,
      selectedRocketIndex: selectedRocketIndex ?? player.selectedRocketIndex,
      clientVersion: clientVersion || player.clientVersion,
    }
  });

  // Convert levels string back to array for response
  const playerWithParsedLevels = {
    ...updatedPlayer,
    levels: updatedPlayer.levels.split(',').map(Number)
  };

  res.json(playerWithParsedLevels);
};

// Helper functions
function validateGameInput(difficulty: number, galaxy: number, questiontypes: number, version: string): boolean {
  return (
    typeof difficulty === 'number' && difficulty >= 0 && difficulty <= 100 &&
    typeof galaxy === 'number' && galaxy >= 0 && galaxy <= 4 &&
    typeof questiontypes === 'number' && questiontypes >= 0 &&
    typeof version === 'string'
  );
}

function validatePlayerInput(player: any): boolean {
  return (
    player &&
    typeof player.id === 'string' &&
    typeof player.name === 'string' &&
    typeof player.bodyColor === 'string' &&
    typeof player.trailColor === 'string' &&
    Array.isArray(player.levels) && player.levels.length === 5 && player.levels.every((level: any) => typeof level === 'number') &&
    typeof player.selectedRocketIndex === 'number' &&
    typeof player.clientVersion === 'string' &&
    typeof player.secretKey === 'string'
  );
}