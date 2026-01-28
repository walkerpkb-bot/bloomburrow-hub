# Bloomburrow Hub

A web-based companion app for playing Bloomburrow Adventures - a tabletop roguelike RPG for parent and child.

## Features

- **Campaign System**: Support for multiple campaigns with full data isolation
- **Character Roster**: Create and manage characters across all 10 Bloomburrow species
- **Town Management**: Track seeds, build upgrades, manage shared stash
- **Session Runner**: AI-powered Dungeon Master using Claude API
- **AI Scene Illustrations**: Generate atmospheric scene images during play
- **Dice Roller**: Digital dice with automatic threshold checking
- **Party Tracker**: Real-time HP and Thread management during runs

## Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- Anthropic API key
- Replicate API key (for image generation)

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
# Edit .env and add your API keys

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

### Data Migration (if upgrading from pre-campaign version)

If you have existing data from before the campaign system:

```bash
cd backend
python migrate_to_campaigns.py
```

This migrates your roster, town, stash, and session data into a "Bloomburrow" campaign.

## Project Structure

```
bloomburrow-hub/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── migrate_to_campaigns.py  # Data migration script
│   ├── requirements.txt
│   ├── data/
│   │   ├── campaigns.json   # Campaign metadata
│   │   └── campaigns/       # Per-campaign data
│   │       └── {campaign_id}/
│   │           ├── roster.json
│   │           ├── town.json
│   │           ├── stash.json
│   │           ├── current_session.json
│   │           ├── banner.jpg (optional)
│   │           └── images/
│   └── prompts/             # AI prompt templates
│       ├── dm_system.md
│       ├── rules_reference.md
│       └── bloomburrow_lore.md
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── styles.css
│   │   └── components/
│   │       ├── CampaignSelector.jsx
│   │       ├── CampaignCard.jsx
│   │       ├── SettingsModal.jsx
│   │       ├── InCampaignHeader.jsx
│   │       ├── ChatWindow.jsx
│   │       ├── ImagePanel.jsx
│   │       ├── PartyStatus.jsx
│   │       ├── RosterView.jsx
│   │       ├── CharacterSheet.jsx
│   │       ├── TownView.jsx
│   │       └── SessionPanel.jsx
│   └── package.json
└── README.md
```

## API Endpoints

### Campaign Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/campaigns` | GET | List all campaigns with stats |
| `/campaigns` | POST | Create new campaign |
| `/campaigns/{id}` | GET | Get campaign details |
| `/campaigns/{id}` | PUT | Update campaign metadata |
| `/campaigns/{id}` | DELETE | Delete campaign and data |
| `/campaigns/{id}/select` | PUT | Set active campaign |
| `/campaigns/{id}/banner` | GET/POST | Get or upload campaign banner image |

### Campaign-Scoped Endpoints

All game data endpoints are scoped by campaign:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/campaigns/{id}/characters` | GET/POST | List or create characters |
| `/campaigns/{id}/characters/{char_id}` | GET/PUT/DELETE | Manage single character |
| `/campaigns/{id}/town` | GET/PUT | Get or update town state |
| `/campaigns/{id}/stash` | GET/PUT | Manage shared item stash |
| `/campaigns/{id}/session` | GET | Get current session |
| `/campaigns/{id}/session/start` | POST | Start a new run |
| `/campaigns/{id}/session/update` | PUT | Update session state |
| `/campaigns/{id}/session/end` | POST | End run (victory/retreat/failed) |
| `/campaigns/{id}/dm/message` | POST | Send message to AI DM |
| `/campaigns/{id}/dice/roll` | POST | Log a dice roll |
| `/campaigns/{id}/image/generate` | POST | Generate scene image |

## How to Play

1. **Select Campaign**: Choose or create a campaign from the landing page
2. **Create Characters**: Go to the Roster tab and create 1-2 characters
3. **Start a Run**: Select characters and click "Start Run", enter quest and location
4. **Adventure**: Chat with the AI DM in the Adventure tab
5. **Roll Dice**: Use physical dice and input results, or use the digital roller
6. **Track Status**: Click hearts/threads to update as you take damage or cast spells
7. **Generate Scenes**: Toggle illustration mode for AI-generated scene art
8. **End Run**: Victory, retreat, or fail - XP and loot are awarded accordingly
9. **Build Town**: Spend seeds in the Town tab to unlock new services

## Customization

### Campaign Banner Art

Upload custom banner images for campaigns via Settings (gear icon) > Edit > Add Campaign Art.

### Adding Enemies

Edit `backend/prompts/rules_reference.md` to add new enemy types.

### Modifying the DM

Edit `backend/prompts/dm_system.md` to change how the AI DM behaves.

### Adding Lore

Edit `backend/prompts/bloomburrow_lore.md` to expand world details.

## Themes

The app features two distinct color themes:
- **Clean Slate**: Dark charcoal with gold accents (campaign selector)
- **Twilight Forest**: Plum/purple with amber glow (in-campaign play)

## License

Personal use. Bloomburrow setting is property of Wizards of the Coast.
