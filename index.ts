import express from 'express';
import bodyParser from 'body-parser';
import { 
  createGame, 
  joinGame,
  startSession, 
  updateSession, 
  getPlayerSessions, 
  getGameSessions,
  createPlayer,
  getPlayerInfo,
  syncPlayerConfig
} from './services/gameService';

const app = express();
const port = 5173;

// Middleware
app.use(bodyParser.json());

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
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
playerRouter.post('/create', createPlayer);
playerRouter.get('/:playerId', getPlayerInfo);
playerRouter.get('/:playerId/sessions', getPlayerSessions);
playerRouter.patch('/sync', syncPlayerConfig);

// Mount routers
app.use('/games', gameRouter);
app.use('/sessions', sessionRouter);
app.use('/players', playerRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});