import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import { 
  createGame, 
  joinGame,
  startSession, 
  updateSession, 
  getPlayerSessions, 
  getGameSessions,
  upsertPlayer,
  getPlayerInfo,
  getAuthoredGames,
  getPlayedGameById,
  getAuthoredGameById
} from './services/gameService';
import path from 'path';
import setsManagerRouter from './services/setsManagerService';

const app = express();
const port = process.env.PORT ?? 5173;

const DATA_ROOT = process.env.DATA_ROOT ?? path.join(__dirname, 'data');

// CORS configuration
const corsOptions = {
  origin: '*', // In production, replace with your actual domain(s)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-User-Secret', 'X-User-Id'],
  exposedHeaders: ['Content-Type'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Custom logging middleware
const requestLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  
  // Log request
  console.log('\n=== Request ===');
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;
    console.log('\n=== Response ===');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Duration: ${duration}ms`);
    if (body) {
      try {
        const parsedBody = JSON.parse(body.toString());
        console.log('Body:', JSON.stringify(parsedBody, null, 2));
      } catch (e) {
        console.log('Body:', body.toString());
      }
    }
    console.log('================\n');
    return originalSend.call(this, body);
  };

  next();
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(morgan('dev')); // HTTP request logger
app.use(requestLogger); // Custom request/response logger

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('\n=== Error ===');
  console.error(err.stack);
  console.error('=============\n');
  res.status(500).json({ error: 'Something went wrong!' });
});

// Game routes
const gameRouter = express.Router();
gameRouter.post('/create', createGame);
gameRouter.post('/join', joinGame);
gameRouter.get('/:gameId/sessions', getGameSessions);

// Session routes
const sessionRouter = express.Router();
sessionRouter.post('/', startSession);
sessionRouter.patch('/:sessionId', updateSession);

// Player routes
const playerRouter = express.Router();
playerRouter.post('/upsert', upsertPlayer);
playerRouter.get('/:playerId', getPlayerInfo);
playerRouter.get('/:playerId/sessions', getPlayerSessions);
playerRouter.get('/me/authored-games', getAuthoredGames);
playerRouter.get('/me/authored-games/:gameId', getAuthoredGameById);
playerRouter.get('/:playerId/played-games/:gameId', getPlayedGameById);

// Mount routers
app.use('/games', gameRouter);
app.use('/sessions', sessionRouter);
app.use('/players', playerRouter);

// Static serving
app.use('/', express.static(path.join(__dirname, 'www-root')));
app.use('/sets', express.static(path.join(DATA_ROOT, 'sets')));

// Sets manager routes
app.use('/upload', setsManagerRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log('Logging enabled:');
    console.log('- HTTP requests (Morgan)');
    console.log('- Request/Response bodies');
    console.log('- Request duration');
    console.log('- Error stack traces');
    console.log("ENVS:");
    console.log("DATABASE_URL:", process.env.DATABASE_URL, Bun.env.DATABASE_URL);
    console.log("DATA_ROOT:", process.env.DATA_ROOT, Bun.env.DATA_ROOT);
    console.log("PORT:", process.env.PORT, Bun.env.PORT);
});