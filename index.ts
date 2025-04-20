import express from 'express';
import bodyParser from 'body-parser';
import { createGame, joinGame } from './services/gameService';

const app = express();
const port = 5173;

// Middleware
app.use(bodyParser.json());

// Create a new game
app.post('/create-game', createGame);

// Join a game
app.post('/join-game', joinGame);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});