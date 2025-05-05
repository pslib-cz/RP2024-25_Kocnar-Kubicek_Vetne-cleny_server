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
  getPlayerInfo
} from './services/gameService';

const app = express();
const port = 5173;

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
  console.log('Logging enabled:');
  console.log('- HTTP requests (Morgan)');
  console.log('- Request/Response bodies');
  console.log('- Request duration');
  console.log('- Error stack traces');
});