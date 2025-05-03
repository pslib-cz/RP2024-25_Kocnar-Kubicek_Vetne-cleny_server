# RP2024-25_Kocnar-Kubicek_Vetne-cleny_server
Node server pro rocnikovou praci Vetne Cleny (Kubicek, Kocnar)

## API Documentation

### Authentication
All endpoints (except `/health` and `/players/create`) require two headers:
- `X-User-Secret`: Your secret key obtained during player creation
- `X-User-Id`: Your player ID

### Endpoints

#### Player Management

##### Create Player
```http
POST /players/create
```
Creates a new player account.

Request Body:
```json
{
  "id": "string",              // Unique player identifier
  "name": "string",            // Display name
  "bodyColor": "string",       // Hex color code
  "trailColor": "string",      // Hex color code
  "selectedRocketIndex": 0,    // Number
  "clientVersion": "string",   // Version of the client
  "secretKey": "string"        // Your secret key for authentication
}
```

Response:
```json
{
  "id": "string",
  "name": "string",
  "secretKey": "string"
}
```

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
  "selectedRocketIndex": 0,
  "clientVersion": "string",
  "gameId": "string"
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

##### Sync Player Config
```http
PATCH /players/sync
```
Updates player configuration. All fields are optional.

Request Body:
```json
{
  "name": "string",            // Optional
  "bodyColor": "string",       // Optional
  "trailColor": "string",      // Optional
  "selectedRocketIndex": 0,    // Optional
  "clientVersion": "string"    // Optional
}
```

Response:
```json
{
  "id": "string",
  "name": "string",
  "bodyColor": "string",
  "trailColor": "string",
  "selectedRocketIndex": 0,
  "clientVersion": "string"
}
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
  "expiration": 0             // Expiration time in seconds
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
- 409: Conflict (e.g., duplicate player ID)
- 410: Game Expired
- 500: Server Error
