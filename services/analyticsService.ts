import express from 'express';
import { PrismaClient } from '@prisma/client';
import { basicAuth } from './adminAuth';

const router = express.Router();
const prisma = new PrismaClient();

// Every admin route requires valid Basic Auth.
router.use(basicAuth);

// --- Login check -----------------------------------------------------------
// The admin client calls this with the entered password. A 200 means the
// password is correct; anything else (basicAuth returns 401) means it isn't.
router.get('/verify', (_req, res) => {
  res.json({ ok: true });
});

// --- Helpers ---------------------------------------------------------------

const dayKey = (d: Date | null): string | null =>
  d ? new Date(d).toISOString().slice(0, 10) : null;

function tally<T>(items: T[], keyOf: (item: T) => string | number | null) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = keyOf(item);
    if (k === null || k === undefined) continue;
    const key = String(k);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

const mapToPairs = (m: Map<string, number>, sortByValue = false) => {
  const pairs = [...m.entries()].map(([label, value]) => ({ label, value }));
  return sortByValue
    ? pairs.sort((a, b) => b.value - a.value)
    : pairs.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
};

// Build a continuous per-day series between the first and last date so charts
// don't have gaps. Falls back to whatever keys exist if range is unusable.
function fillDailySeries(counts: Map<string, number>) {
  const keys = [...counts.keys()].sort();
  if (keys.length === 0) return [] as { label: string; value: number }[];
  const start = new Date(keys[0] + 'T00:00:00Z');
  const end = new Date(keys[keys.length - 1] + 'T00:00:00Z');
  const out: { label: string; value: number }[] = [];
  // Cap to avoid pathological ranges.
  const MAX_DAYS = 400;
  let days = 0;
  for (let d = new Date(start); d <= end && days < MAX_DAYS; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push({ label: key, value: counts.get(key) ?? 0 });
    days++;
  }
  return out;
}

function bucketHistogram(values: number[], size: number, max: number) {
  const buckets = new Map<string, number>();
  for (let lo = 0; lo <= max; lo += size) {
    const hi = Math.min(lo + size - 1, max);
    buckets.set(`${lo}-${hi}`, 0);
  }
  for (const v of values) {
    const lo = Math.min(Math.floor(v / size) * size, max - (max % size === 0 ? size : max % size));
    const hi = Math.min(lo + size - 1, max);
    const key = `${lo}-${hi}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([label, value]) => ({ label, value }));
}

const avg = (nums: number[]) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

// --- Aggregate stats -------------------------------------------------------

router.get('/stats', async (_req, res) => {
  try {
    const [players, games, sessions] = await Promise.all([
      prisma.player.findMany({
        select: {
          id: true,
          name: true,
          levels: true,
          selectedRocketIndex: true,
          clientVersion: true,
          activeGameId: true,
          _count: { select: { authoredGames: true, sessions: true } },
        },
      }),
      prisma.game.findMany({
        select: {
          id: true,
          code: true,
          active: true,
          difficulty: true,
          galaxy: true,
          questiontypes: true,
          questionCount: true,
          version: true,
          seed: true,
          createdAt: true,
          authorId: true,
          _count: { select: { sessions: true } },
        },
      }),
      prisma.gameSession.findMany({
        select: {
          id: true,
          score: true,
          correctAnswers: true,
          completed: true,
          startedAt: true,
          endedAt: true,
          gameId: true,
          playerId: true,
        },
      }),
    ]);

    const questionCountByGame = new Map(games.map((g) => [g.id, g.questionCount]));
    const playerNameById = new Map(players.map((p) => [p.id, p.name]));
    const gameCodeById = new Map(games.map((g) => [g.id, g.code]));

    const completedSessions = sessions.filter((s) => s.completed);
    const durationsSec = completedSessions
      .filter((s) => s.endedAt)
      .map((s) => (new Date(s.endedAt as Date).getTime() - new Date(s.startedAt).getTime()) / 1000)
      .filter((d) => d >= 0 && d < 60 * 60 * 24);

    const accuracies = sessions
      .map((s) => {
        const qc = questionCountByGame.get(s.gameId);
        return qc && qc > 0 ? s.correctAnswers / qc : null;
      })
      .filter((a): a is number => a !== null);

    // Player level averages (levels = "l0,l1,l2,l3,l4").
    const levelSums = [0, 0, 0, 0, 0];
    let levelPlayers = 0;
    for (const p of players) {
      const parts = (p.levels || '').split(',').map((n) => Number(n));
      if (parts.length === 5 && parts.every((n) => !Number.isNaN(n))) {
        for (let i = 0; i < 5; i++) levelSums[i] += parts[i];
        levelPlayers++;
      }
    }
    const levelAverages = levelSums.map((s) => (levelPlayers ? s / levelPlayers : 0));

    const topAuthors = [...players]
      .filter((p) => p._count.authoredGames > 0)
      .sort((a, b) => b._count.authoredGames - a._count.authoredGames)
      .slice(0, 10)
      .map((p) => ({ label: p.name, value: p._count.authoredGames }));

    const topPlayers = [...players]
      .filter((p) => p._count.sessions > 0)
      .sort((a, b) => b._count.sessions - a._count.sessions)
      .slice(0, 10)
      .map((p) => ({ label: p.name, value: p._count.sessions }));

    const topGames = [...games]
      .filter((g) => g._count.sessions > 0)
      .sort((a, b) => b._count.sessions - a._count.sessions)
      .slice(0, 10)
      .map((g) => ({ label: `#${g.code}`, value: g._count.sessions }));

    const sessionScores = sessions.map((s) => s.score);

    const stats = {
      generatedAt: new Date().toISOString(),
      totals: {
        players: players.length,
        games: games.length,
        activeGames: games.filter((g) => g.active).length,
        inactiveGames: games.filter((g) => !g.active).length,
        sessions: sessions.length,
        completedSessions: completedSessions.length,
        inProgressSessions: sessions.length - completedSessions.length,
        completionRate: sessions.length
          ? completedSessions.length / sessions.length
          : 0,
        seededGames: games.filter((g) => !!g.seed).length,
        avgSessionsPerGame: games.length ? sessions.length / games.length : 0,
      },
      players: {
        clientVersions: mapToPairs(tally(players, (p) => p.clientVersion), true),
        rocketIndexDistribution: mapToPairs(tally(players, (p) => p.selectedRocketIndex)),
        levelAverages,
        topAuthors,
        topPlayers,
        playersWithActiveGame: players.filter((p) => p.activeGameId).length,
      },
      games: {
        difficultyHistogram: bucketHistogram(games.map((g) => g.difficulty), 10, 100),
        galaxyDistribution: mapToPairs(tally(games, (g) => g.galaxy)),
        questionCountDistribution: mapToPairs(tally(games, (g) => g.questionCount)),
        versionDistribution: mapToPairs(tally(games, (g) => g.version), true),
        seededVsRandom: [
          { label: 'Náhodné', value: games.filter((g) => !g.seed).length },
          { label: 'Se seedem', value: games.filter((g) => !!g.seed).length },
        ],
        activeVsInactive: [
          { label: 'Aktivní', value: games.filter((g) => g.active).length },
          { label: 'Neaktivní', value: games.filter((g) => !g.active).length },
        ],
        perDay: fillDailySeries(tally(games, (g) => dayKey(g.createdAt))),
        topGamesBySessions: topGames,
      },
      sessions: {
        perDay: fillDailySeries(tally(sessions, (s) => dayKey(s.startedAt))),
        perHour: (() => {
          const hours = new Map<string, number>();
          for (let h = 0; h < 24; h++) hours.set(String(h), 0);
          for (const s of sessions) {
            const h = String(new Date(s.startedAt).getUTCHours());
            hours.set(h, (hours.get(h) ?? 0) + 1);
          }
          return [...hours.entries()].map(([label, value]) => ({
            label: `${label}:00`,
            value,
          }));
        })(),
        completedVsInProgress: [
          { label: 'Dokončené', value: completedSessions.length },
          { label: 'Probíhající', value: sessions.length - completedSessions.length },
        ],
        scoreDistribution: bucketHistogram(
          sessionScores,
          5,
          Math.max(20, Math.ceil((Math.max(0, ...sessionScores) + 1) / 5) * 5)
        ),
        avgScore: avg(sessionScores),
        avgCorrectAnswers: avg(sessions.map((s) => s.correctAnswers)),
        avgAccuracy: avg(accuracies),
        avgDurationSec: avg(durationsSec),
      },
    };

    res.json(stats);
  } catch (error) {
    console.error('Error building analytics stats:', error);
    res.status(500).json({ error: 'Failed to build analytics' });
  }
});

// --- Raw table browser -----------------------------------------------------

const MAX_TAKE = 200;
const REDACTED = '••••••••';

router.get('/raw/:table', async (req, res) => {
  const { table } = req.params;
  const skip = Math.max(0, parseInt(String(req.query.skip ?? '0'), 10) || 0);
  const take = Math.min(
    MAX_TAKE,
    Math.max(1, parseInt(String(req.query.take ?? '25'), 10) || 25)
  );

  try {
    if (table === 'players') {
      const [rows, total] = await Promise.all([
        prisma.player.findMany({
          skip,
          take,
          orderBy: { name: 'asc' },
          include: { _count: { select: { authoredGames: true, sessions: true } } },
        }),
        prisma.player.count(),
      ]);
      // Never expose the secret key to the client.
      const safe = rows.map(({ secretKey, _count, ...rest }) => ({
        ...rest,
        secretKey: REDACTED,
        authoredGames: _count.authoredGames,
        sessions: _count.sessions,
      }));
      res.json({ table, total, skip, take, rows: safe });
      return;
    }

    if (table === 'games') {
      const [rows, total] = await Promise.all([
        prisma.game.findMany({
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { name: true } },
            _count: { select: { sessions: true } },
          },
        }),
        prisma.game.count(),
      ]);
      const safe = rows.map(({ author, _count, ...rest }) => ({
        ...rest,
        authorName: author?.name ?? null,
        sessions: _count.sessions,
      }));
      res.json({ table, total, skip, take, rows: safe });
      return;
    }

    if (table === 'sessions') {
      const [rows, total] = await Promise.all([
        prisma.gameSession.findMany({
          skip,
          take,
          orderBy: { startedAt: 'desc' },
          include: {
            player: { select: { name: true } },
            game: { select: { code: true } },
          },
        }),
        prisma.gameSession.count(),
      ]);
      const safe = rows.map(({ player, game, ...rest }) => ({
        ...rest,
        playerName: player?.name ?? null,
        gameCode: game?.code ?? null,
      }));
      res.json({ table, total, skip, take, rows: safe });
      return;
    }

    res.status(400).json({ error: 'Unknown table. Use players, games or sessions.' });
  } catch (error) {
    console.error('Error reading raw table:', error);
    res.status(500).json({ error: 'Failed to read table' });
  }
});

export default router;
