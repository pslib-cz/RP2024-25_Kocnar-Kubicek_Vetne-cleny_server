# RP2024-25_Kocnar-Kubicek_Vetne-cleny_server
Node server pro rocnikovou praci Vetne Cleny (Kubicek, Kocnar)

## API Documentation

### Cross-Origin Resource Sharing (CORS)
The API supports CORS with the following configuration:
- All origins are allowed (`*`)
- Allowed methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- Allowed headers: `Content-Type`, `X-User-Secret`, `X-User-Id`
- Credentials are supported
- CORS preflight requests are cached for 24 hours

Note: In production, you should replace the wildcard origin (`*`) with your specific domain(s).

### Authentication
All endpoints (except `/health`) require two headers:
- `X-User-Secret`: Your secret key obtained during player creation
- `X-User-Id`: Your player ID

### Data Models

#### Player
```typescript
{
  id: string;              // Unique identifier
  name: string;            // Player's display name
  bodyColor: string;       // Player's body color
  trailColor: string;      // Player's trail color
  levels: number[];        // Array of 5 numbers representing player levels
  selectedRocketIndex: number; // Selected rocket index
  clientVersion: string;   // Client version
  secretKey: string;       // Authentication secret
  activeGameId?: string;   // Optional reference to current game
  activeGame?: Game;       // Optional relation to current game
  sessions: GameSession[]; // Player's game sessions
  authoredGames: Game[];   // Games created by this player
}
```

### Endpoints

#### Player Management

##### Upsert Player
```http
POST /players/upsert
```
Creates a new player account or updates an existing one based on the X-User-Id header.

Headers:
- `X-User-Secret`: Your secret key
- `X-User-Id`: Your player ID

Request Body:
```json
{
  "name": "string",            // Required for new players
  "bodyColor": "string",       // Required for new players
  "trailColor": "string",      // Required for new players
  "levels": [0,0,0,0,0],       // Required for new players
  "selectedRocketIndex": 0,    // Required for new players
  "clientVersion": "string"    // Required for new players
}
```

Response for new player:
```json
{
  "id": "string",
  "name": "string"
}
```

Response for update:
```json
{
  "id": "string",
  "name": "string",
  "bodyColor": "string",
  "trailColor": "string",
  "levels": [0,0,0,0,0],
  "selectedRocketIndex": 0,
  "clientVersion": "string",
  "secretKey": "string"
}
```

Note: When X-User-Id doesn't exist in the database, the endpoint creates a new player. If it exists, it updates the player after verifying the X-User-Secret matches.

##### Get Player Info
```http
GET /players/:playerId
```
Retrieves player information.

Response:
```json
{
  "id": "string",
  "name": "string",
  "bodyColor": "string",
  "trailColor": "string",
  "levels": [0,0,0,0,0],
  "selectedRocketIndex": 0,
  "clientVersion": "string",
  "activeGame": {
    "id": "string",
    "code": 0,
    "difficulty": 0,
    "galaxy": 0,
    "questiontypes": 0,
    "version": "string"
  },
  "sessions": [
    {
      "id": "string",
      "gameId": "string",
      "score": 0,
      "correctAnswers": 0,
      "completed": false,
      "startedAt": "datetime",
      "endedAt": "datetime"
    }
  ]
}
```

##### Get Player Sessions
```http
GET /players/:playerId/sessions
```
Retrieves all game sessions for a player.

Response:
```json
[
  {
    "id": "string",
    "gameId": "string",
    "score": 0,
    "correctAnswers": 0,
    "completed": false,
    "startedAt": "datetime",
    "endedAt": "datetime",
    "game": {
      "id": "string",
      "code": 0,
      "difficulty": 0,
      "galaxy": 0,
      "questiontypes": 0,
      "version": "string"
    }
  }
]
```

#### Game Management

##### Create Game
```http
POST /games/create
```
Creates a new game.

Request Body:
```json
{
  "difficulty": 0,             // 0-100
  "galaxy": 0,                // 0-4
  "questiontypes": 0,         // Bitmask of question types
  "version": "string",        // Client version
  "expiration": 0             // Number of seconds until game expires
}
```

Response:
```json
{
  "gameId": "string",
  "code": 0,
  "author": {
    "id": "string",
    "name": "string"
  }
}
```

Note: The game will automatically expire and become inactive after the specified expiration time. The expiration time is stored as a DateTime in the database and is calculated as `current_time + expiration_seconds`.

##### Join Game
```http
POST /games/join
```
Joins an existing game.

Request Body:
```json
{
  "code": 0,                  // Game code
  "version": "string"         // Client version
}
```

Response:
```json
{
  "playerId": "string",
  "game": {
    "difficulty": 0,
    "galaxy": 0,
    "questiontypes": 0,
    "version": "string",
    "seed": "string"
  }
}
```

##### Get Game Sessions
```http
GET /games/:gameId/sessions
```
Retrieves all sessions for a game.

Response:
```json
[
  {
    "id": "string",
    "playerId": "string",
    "score": 0,
    "correctAnswers": 0,
    "completed": false,
    "startedAt": "datetime",
    "endedAt": "datetime",
    "player": {
      "id": "string",
      "name": "string"
    }
  }
]
```

#### Session Management

##### Start Session
```http
POST /sessions
```
Starts a new game session.

Request Body:
```json
{
  "gameId": "string"
}
```

Response:
```json
{
  "sessionId": "string"
}
```

##### Update Session
```http
PATCH /sessions/:sessionId
```
Updates session progress. All fields are optional.

Request Body:
```json
{
  "score": 0,                 // Optional
  "correctAnswers": 0,        // Optional
  "completed": false          // Optional
}
```

Response:
```json
{
  "id": "string",
  "playerId": "string",
  "gameId": "string",
  "score": 0,
  "correctAnswers": 0,
  "completed": false,
  "startedAt": "datetime",
  "endedAt": "datetime"
}
```

#### System

##### Health Check
```http
GET /health
```
Checks server status.

Response:
```json
{
  "status": "ok"
}
```

### Error Responses
All endpoints may return the following error responses:

```json
{
  "error": "error message"
}
```

Common status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized (missing/invalid headers)
- 404: Not Found
- 409: Conflict (e.g., duplicate player ID or secret key)
- 410: Game Expired
- 500: Server Error
