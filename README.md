# Bloomburrow Hub

A web-based companion app for playing tabletop roguelike RPGs. Originally built for Bloomburrow Adventures, now supports fully customizable campaign systems for any setting.

## Features

- **Campaign System**: Support for multiple campaigns with full data isolation
- **Customizable Game Systems**: Configure species, stats, resources, currency, buildings, leveling, and mechanics per campaign
- **Templates**: Start from pre-built templates (Bloomburrow, Generic Fantasy) or build from scratch
- **Character Roster**: Create and manage characters with campaign-specific species and stats
- **Town Management**: Track currency, build upgrades, manage shared stash
- **Session Runner**: AI-powered Dungeon Master using Claude API
- **AI Scene Illustrations**: Generate atmospheric scene images during play
- **Dice Roller**: Digital dice with automatic threshold checking
- **Party Tracker**: Real-time HP and resource management during runs
- **DM Prep Coach**: AI-assisted campaign preparation with author notes that flow into gameplay DM context

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
uvicorn main:app --reload --port 8000
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
│   ├── main.py                 # FastAPI server
│   ├── campaign_schema.py      # Pydantic models for campaign system
│   ├── dm_context_builder.py   # Builds DM prompts from campaign config
│   ├── prep_coach_builder.py   # Builds prompts for DM Prep Coach
│   ├── migrate_to_campaigns.py # Data migration script
│   ├── requirements.txt
│   ├── data/
│   │   ├── campaigns.json      # Campaign metadata
│   │   ├── templates/          # Pre-built system templates
│   │   │   ├── bloomburrow.json
│   │   │   └── default.json
│   │   └── campaigns/          # Per-campaign data
│   │       └── {campaign_id}/
│   │           ├── roster.json
│   │           ├── town.json
│   │           ├── stash.json
│   │           ├── system.json     # Campaign system config
│   │           ├── content.json    # Campaign content (NPCs, locations, etc.)
│   │           ├── dm_prep.json    # DM prep notes and conversation
│   │           ├── current_session.json
│   │           ├── banner.jpg (optional)
│   │           └── images/
│   └── prompts/                # Base AI prompt templates
│       ├── dm_system.md
│       └── rules_reference.md
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── styles.css
│   │   └── components/
│   │       ├── CampaignSelector.jsx
│   │       ├── CampaignCard.jsx
│   │       ├── CampaignForm.jsx    # Full campaign/system editor
│   │       ├── SettingsModal.jsx
│   │       ├── InCampaignHeader.jsx
│   │       ├── ChatWindow.jsx
│   │       ├── ImagePanel.jsx
│   │       ├── PartyStatus.jsx
│   │       ├── RosterView.jsx
│   │       ├── CharacterSheet.jsx
│   │       ├── TownView.jsx
│   │       ├── SessionPanel.jsx
│   │       ├── DMPrepSection.jsx   # DM Prep tab container
│   │       └── PrepCoachChat.jsx   # Prep Coach chat interface
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

### Content Config (`content.json`)

| Section | What it contains |
|---------|-----------------|
| `name` | Campaign name |
| `premise` | Campaign premise/hook |
| `tone` | Overall tone guidance |
| `threat` | Escalating threat with stages |
| `npcs` | Named NPCs with roles, wants, and secrets |
| `locations` | Key locations with vibes and contents |
| `anchor_runs` | Scripted story runs with triggers |
| `filler_seeds` | Random run ideas for variety |

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
| `/campaigns/{id}/session/start` | POST | Start a new run |
| `/campaigns/{id}/session/update` | PUT | Update session state |
| `/campaigns/{id}/session/end` | POST | End run (victory/retreat/failed) |
| `/campaigns/{id}/dm/message` | POST | Send message to AI DM |
| `/campaigns/{id}/dice/roll` | POST | Log a dice roll |
| `/campaigns/{id}/image/generate` | POST | Generate scene image |

## How to Play

1. **Select Campaign**: Choose or create a campaign from the landing page
2. **Configure System** (optional): Use Full Setup to customize species, stats, buildings, etc.
3. **Create Characters**: Go to the Roster tab and create 1-2 characters
4. **Start a Run**: Select characters and click "Start Run", enter quest and location
5. **Adventure**: Chat with the AI DM in the Adventure tab
6. **Roll Dice**: Use physical dice and input results, or use the digital roller
7. **Track Status**: Click hearts/resources to update as you take damage or use abilities
8. **Generate Scenes**: Toggle illustration mode for AI-generated scene art
9. **End Run**: Victory, retreat, or fail - XP and loot are awarded accordingly
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
   - Runs: Scripted and filler adventures

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
