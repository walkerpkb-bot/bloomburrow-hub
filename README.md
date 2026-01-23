# Bloomburrow Hub

A web-based companion app for playing Bloomburrow Adventures - a tabletop roguelike RPG for parent and child.

## Features

- **Character Roster**: Create and manage characters across all 10 Bloomburrow species
- **Town Management**: Track seeds, build upgrades, manage shared stash
- **Session Runner**: AI-powered Dungeon Master using Claude API
- **Dice Roller**: Digital dice with automatic threshold checking
- **Party Tracker**: Real-time HP and Thread management during runs

## Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- Anthropic API key

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env and add your Anthropic API key

# Set up data files (first time only)
cd data
cp roster.example.json roster.json
cp town.example.json town.json
cp stash.example.json stash.json
cp current_session.example.json current_session.json
cd ..

# Run the server
python main.py
```

The backend runs on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend runs on `http://localhost:3000`

## Project Structure

```
bloomburrow-hub/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── requirements.txt
│   ├── data/                # JSON storage
│   │   ├── roster.json
│   │   ├── town.json
│   │   ├── stash.json
│   │   └── current_session.json
│   └── prompts/             # AI prompt templates
│       ├── dm_system.md
│       ├── rules_reference.md
│       └── bloomburrow_lore.md
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── styles.css
│   │   └── components/
│   │       ├── ChatWindow.jsx
│   │       ├── PartyStatus.jsx
│   │       ├── DiceRoller.jsx
│   │       ├── RosterView.jsx
│   │       ├── CharacterSheet.jsx
│   │       ├── TownView.jsx
│   │       └── SessionPanel.jsx
│   └── package.json
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/characters` | GET/POST | List or create characters |
| `/characters/{id}` | GET/PUT/DELETE | Manage single character |
| `/town` | GET/PUT | Get or update town state |
| `/stash` | GET/PUT | Manage shared item stash |
| `/session` | GET | Get current session |
| `/session/start` | POST | Start a new run |
| `/session/update` | PUT | Update session state |
| `/session/end` | POST | End run (victory/retreat/failed) |
| `/dm/message` | POST | Send message to AI DM |
| `/dice/roll` | POST | Log a dice roll |

## How to Play

1. **Create Characters**: Go to the Roster tab and create 1-2 characters
2. **Start a Run**: Select characters and click "Start Run", enter quest and location
3. **Adventure**: Chat with the AI DM in the Adventure tab
4. **Roll Dice**: Use physical dice and input results, or use the digital roller
5. **Track Status**: Click hearts/threads to update as you take damage or cast spells
6. **End Run**: Victory, retreat, or fail - XP and loot are awarded accordingly
7. **Build Town**: Spend seeds in the Town tab to unlock new services

## Customization

### Adding Enemies

Edit `backend/prompts/rules_reference.md` to add new enemy types.

### Modifying the DM

Edit `backend/prompts/dm_system.md` to change how the AI DM behaves.

### Adding Lore

Edit `backend/prompts/bloomburrow_lore.md` to expand world details.

## License

Personal use. Bloomburrow setting is property of Wizards of the Coast.
