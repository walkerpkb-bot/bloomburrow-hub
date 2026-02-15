# Weave

A web-based companion app for playing tabletop roguelike RPGs. Originally built for Bloomburrow Adventures, now supports fully customizable campaign systems for any setting.

## Features

- **Campaign System**: Support for multiple campaigns with full data isolation
- **Customizable Game Systems**: Configure species, stats, resources, currency, buildings, leveling, and mechanics per campaign
- **Templates**: Start from pre-built templates (Bloomburrow, Generic Fantasy) or build from scratch
- **Episodic Adventures**: Author story episodes with triggers and filler seeds the AI expands into full sessions
- **Character Roster**: Create and manage characters with campaign-specific species and stats
- **Town Management**: Track currency, build upgrades, manage shared stash
- **Session Runner**: AI-powered Dungeon Master using Claude API
- **AI Scene Illustrations**: Generate atmospheric scene images during play via Replicate
- **Dice Roller**: Digital dice with automatic threshold checking
- **Party Tracker**: Real-time HP and resource management during episodes
- **DM Prep Coach**: AI-assisted campaign preparation with author notes that flow into gameplay DM context
- **Docker Support**: Run the full stack with `docker compose up`

## Quick Start (Docker)

```bash
# Clone and configure
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start everything
docker compose up
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

Campaign data persists in a Docker volume (`backend-data`).

## Manual Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- Anthropic API key
- Replicate API key (for image generation)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env and add your API keys

# Run the server
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
cd backend
.venv/bin/python -m pytest tests/ -v
```

104 tests covering campaign logic, schema validation, session/episode lifecycle, and town/character CRUD.

### Data Migration (if upgrading from pre-campaign version)

```bash
cd backend
python migrate_to_campaigns.py
```

This migrates your roster, town, stash, and session data into a "Bloomburrow" campaign.

## Project Structure

```
weave/
├── docker-compose.yml          # Full stack orchestration
├── .dockerignore
├── backend/
│   ├── Dockerfile
│   ├── docker-entrypoint.sh    # Seeds templates into data volume
│   ├── main.py                 # FastAPI app init, CORS, router includes
│   ├── config.py               # Path constants (DATA_DIR, PROMPTS_DIR, etc.)
│   ├── models.py               # All Pydantic request/response models
│   ├── helpers.py              # File I/O helpers (load_json, save_json, etc.)
│   ├── campaign_logic.py       # Campaign content/state/episode logic
│   ├── campaign_schema.py      # Campaign data models and validation
│   ├── dm_context_builder.py   # Builds DM prompts from campaign config
│   ├── prep_coach_builder.py   # Builds prompts for DM Prep Coach
│   ├── migrate_to_campaigns.py # Data migration script
│   ├── requirements.txt
│   ├── routes/
│   │   ├── templates.py        # Template listing (2 routes)
│   │   ├── campaigns.py        # Campaign CRUD, select, banner, system config (10 routes)
│   │   ├── campaign_content.py # Content, drafts, state, episodes, DM context (10 routes)
│   │   ├── dm_prep.py          # DM prep notes, pins, conversation, coach (8 routes)
│   │   ├── characters.py       # Character CRUD (5 routes)
│   │   ├── town.py             # Town + stash management (4 routes)
│   │   ├── sessions.py         # Session lifecycle + dice (5 routes)
│   │   └── dm_ai.py            # DM message + image generation (3 routes)
│   ├── tests/
│   │   ├── conftest.py         # Shared fixtures (data_dir, campaign_dir, client)
│   │   ├── test_logic.py       # Pure logic: triggers, available runs, DM context
│   │   ├── test_schema.py      # Pydantic validation: content, threat, triggers
│   │   ├── test_routes.py      # Session lifecycle, episode routes, dice
│   │   └── test_town.py        # Town, character, stash, campaign CRUD
│   ├── data/
│   │   ├── templates/          # Pre-built system templates
│   │   │   ├── bloomburrow.json
│   │   │   └── default.json
│   │   └── campaigns/          # Per-campaign data
│   │       └── {campaign_id}/
│   │           ├── roster.json
│   │           ├── town.json
│   │           ├── stash.json
│   │           ├── system.json
│   │           ├── campaign.json
│   │           ├── state.json
│   │           ├── dm_prep.json
│   │           ├── current_session.json
│   │           └── images/
│   └── prompts/
│       ├── dm_system.md
│       ├── rules_reference.md
│       └── bloomburrow_lore.md
├── frontend/
│   ├── Dockerfile              # Multi-stage: npm build → nginx
│   ├── nginx.conf              # Proxies /api/ to backend, SPA fallback
│   ├── src/
│   │   ├── App.jsx             # View routing, hooks, context provider
│   │   ├── styles.css
│   │   ├── api/
│   │   │   ├── client.js       # Centralized apiFetch() + apiUpload() helpers
│   │   │   ├── campaigns.js    # Campaign CRUD, select, banner, system config
│   │   │   ├── characters.js   # Character CRUD
│   │   │   ├── sessions.js     # Session lifecycle, dice
│   │   │   ├── town.js         # Town + stash
│   │   │   ├── dm.js           # DM message
│   │   │   ├── dmPrep.js       # DM prep notes, pins, conversation, coach
│   │   │   ├── images.js       # Image generation
│   │   │   ├── templates.js    # Template listing
│   │   │   └── content.js      # Campaign content, drafts, episodes
│   │   ├── context/
│   │   │   └── CampaignContext.jsx  # CampaignProvider + useCampaignContext
│   │   ├── hooks/
│   │   │   ├── useCampaigns.js      # Campaign list fetching
│   │   │   └── useCampaignData.js   # In-campaign state + action handlers
│   │   └── components/
│   │       ├── CampaignSelector.jsx
│   │       ├── CampaignCard.jsx
│   │       ├── CampaignForm.jsx
│   │       ├── SettingsModal.jsx
│   │       ├── InCampaignHeader.jsx
│   │       ├── ChatWindow.jsx
│   │       ├── ImagePanel.jsx
│   │       ├── PartyStatus.jsx
│   │       ├── RosterView.jsx
│   │       ├── CharacterSheet.jsx
│   │       ├── TownView.jsx
│   │       ├── SessionPanel.jsx
│   │       ├── DiceRoller.jsx
│   │       ├── DMPrepSection.jsx
│   │       └── PrepCoachChat.jsx
│   └── package.json
└── README.md
```

## Campaign System Configuration

Each campaign can have a fully customized game system:

### System Config (`system.json`)

| Section | What it configures |
|---------|-------------------|
| `game_name` | Display name for the game system |
| `player_context` | Who's playing (e.g., "parent and child") - used in DM prompts |
| `species` | Playable species/races with trait names and descriptions |
| `stats` | Stat names, colors, point allocation rules |
| `resources` | Health and magic names, symbols, starting/max values |
| `currency` | Currency name, symbol, starting amount |
| `buildings` | Town buildings with costs and descriptions |
| `leveling` | Max level, XP thresholds, level-up rewards |
| `mechanics` | Dice type, success/partial thresholds, enemy tiers |
| `art_style` | Image generation style prompt |
| `lore` | World lore injected into DM context |
| `dm_tone` | DM personality and tone guidance |

### Content Config (`campaign.json`)

| Section | What it contains |
|---------|-----------------|
| `name` | Campaign name |
| `premise` | Campaign premise/hook |
| `tone` | Overall tone guidance |
| `threat` | Escalating threat with stages |
| `npcs` | Named NPCs with roles, wants, and secrets |
| `locations` | Key locations with vibes and contents |
| `anchor_runs` | Scripted story episodes with triggers |
| `filler_seeds` | One-liner prompts the AI expands into side episodes |

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
| `/campaigns/{id}/banner` | GET/POST | Get or upload campaign banner |
| `/campaigns/{id}/system` | GET/PUT | Get or update system config |
| `/campaigns/{id}/content` | GET/POST | Get or save campaign content |
| `/campaigns/{id}/draft` | GET/POST | Get or save draft content |
| `/campaigns/{id}/dm-prep` | GET | Get DM prep notes and conversation |
| `/campaigns/{id}/dm-prep/message` | POST | Chat with Prep Coach AI |
| `/campaigns/{id}/dm-prep/note` | POST | Create author note |
| `/campaigns/{id}/dm-prep/note/{note_id}` | PUT/DELETE | Update or delete note |
| `/campaigns/{id}/dm-prep/pin` | POST | Pin insight from conversation |
| `/campaigns/{id}/dm-prep/pin/{pin_id}` | DELETE | Unpin insight |
| `/campaigns/{id}/dm-prep/conversation` | DELETE | Clear conversation history |

### Template Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/templates` | GET | List available system templates |
| `/templates/{name}` | GET | Get specific template |

### Campaign-Scoped Game Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/campaigns/{id}/characters` | GET/POST | List or create characters |
| `/campaigns/{id}/characters/{char_id}` | GET/PUT/DELETE | Manage single character |
| `/campaigns/{id}/town` | GET/PUT | Get or update town state |
| `/campaigns/{id}/stash` | GET/PUT | Manage shared item stash |
| `/campaigns/{id}/session` | GET | Get current session |
| `/campaigns/{id}/session/start` | POST | Start a new episode |
| `/campaigns/{id}/session/update` | PUT | Update session state |
| `/campaigns/{id}/session/end` | POST | End episode (victory/retreat/failed) |
| `/campaigns/{id}/available-runs` | GET | List available story and filler episodes |
| `/campaigns/{id}/next-run` | GET | Get next recommended episode |
| `/campaigns/{id}/start-run` | POST | Start a story or filler episode |
| `/campaigns/{id}/complete-run` | POST | Complete episode, update campaign state |
| `/campaigns/{id}/state` | GET | Get campaign runtime state |
| `/campaigns/{id}/state/reset` | POST | Reset campaign progress |
| `/campaigns/{id}/dm-context` | GET | Get current DM context for active episode |
| `/campaigns/{id}/dm/message` | POST | Send message to AI DM |
| `/campaigns/{id}/dice/roll` | POST | Log a dice roll |
| `/campaigns/{id}/image/generate` | POST | Generate scene image |

## How to Play

1. **Select Campaign**: Choose or create a campaign from the landing page
2. **Configure System** (optional): Use Full Setup to customize species, stats, buildings, etc.
3. **Create Characters**: Go to the Roster tab and create 1-2 characters
4. **Start an Episode**: Select characters and click "Start Episode", choose a story or filler episode
5. **Adventure**: Chat with the AI DM in the Adventure tab
6. **Roll Dice**: Use physical dice and input results, or use the digital roller
7. **Track Status**: Click hearts/resources to update as you take damage or use abilities
8. **Generate Scenes**: Toggle illustration mode for AI-generated scene art
9. **End Episode**: Victory, retreat, or fail - XP and loot are awarded accordingly
10. **Build Town**: Spend currency in the Town tab to unlock new services

## Creating Custom Campaigns

### Quick Create
Just enter a name - uses default fantasy settings. Good for improvised sessions.

### Full Setup
Use the campaign form to configure everything:

1. **System Tab**: Configure game mechanics
   - General: Game name, player context
   - Species: Define playable species with unique traits
   - Stats: Name your stats, set point allocation rules
   - Resources: Configure health/magic systems
   - Buildings: Define town buildings and costs
   - Leveling: Set XP thresholds and rewards
   - Mechanics: Dice, thresholds, enemy tiers
   - Content: Art style, lore, DM tone

2. **Content Tab**: Author campaign content
   - Overview: Name, premise, tone
   - Threat: Escalating danger with stages
   - NPCs: Characters with secrets
   - Locations: Places to explore
   - Episodes: Scripted story episodes with triggers and filler seeds

3. **DM Prep Tab**: Prepare guidance for DMs
   - Chat with the Prep Coach AI to think through NPC voices, pacing, secrets
   - Create author notes that get injected into the gameplay DM's context
   - Pin useful insights from conversations
   - Notes are categorized: voice, pacing, secret, reminder, general

### Using Templates

Start from a template and customize:
- **Bloomburrow Adventures**: Cozy woodland fantasy with anthropomorphic animals
- **Generic Fantasy**: Classic D&D-style with humans, elves, dwarves

## Themes

The app features two distinct color themes:
- **Clean Slate**: Dark charcoal with gold accents (campaign selector)
- **Twilight Forest**: Plum/purple with amber glow (in-campaign play)

## License

Personal use. Bloomburrow setting is property of Wizards of the Coast.
