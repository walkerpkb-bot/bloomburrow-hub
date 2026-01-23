"""
Bloomburrow Hub - Backend Server
FastAPI application for managing game state and AI DM integration
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import os
import anthropic
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Bloomburrow Hub", version="1.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data directory
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "prompts")

# === Helper Functions ===

def load_json(filename: str) -> dict:
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return {}

def save_json(filename: str, data: dict):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

def load_prompt(filename: str) -> str:
    filepath = os.path.join(PROMPTS_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return f.read()
    return ""

# === Pydantic Models ===

class Character(BaseModel):
    id: Optional[str] = None
    name: str
    species: str
    level: int = 1
    xp: int = 0
    stats: dict  # {"brave": 2, "clever": 2, "kind": 1}
    maxHearts: int = 5
    maxThreads: int = 3
    gear: list = []
    weavesKnown: list = []
    notes: str = ""

class TownUpdate(BaseModel):
    name: Optional[str] = None
    seeds: Optional[int] = None
    buildings: Optional[dict] = None

class SessionStart(BaseModel):
    quest: str
    location: str
    partyIds: list  # character IDs

class SessionUpdate(BaseModel):
    runState: Optional[str] = None
    roomNumber: Optional[int] = None
    party: Optional[list] = None
    enemies: Optional[list] = None
    lootCollected: Optional[list] = None

class DMMessage(BaseModel):
    message: str
    includeState: bool = True

class DiceRoll(BaseModel):
    dieType: str  # "d4", "d6", "d8", "d10", "d20"
    result: int
    modifier: int = 0
    purpose: str = ""

class SessionEnd(BaseModel):
    outcome: str  # "victory", "retreat", "failed"

# === Character Endpoints ===

@app.get("/characters")
def get_characters():
    data = load_json("roster.json")
    return data.get("characters", [])

@app.post("/characters")
def create_character(character: Character):
    data = load_json("roster.json")
    if "characters" not in data:
        data["characters"] = []
    
    # Generate ID
    char_id = f"char_{len(data['characters']) + 1:03d}"
    character.id = char_id
    
    data["characters"].append(character.dict())
    save_json("roster.json", data)
    return character

@app.get("/characters/{char_id}")
def get_character(char_id: str):
    data = load_json("roster.json")
    for char in data.get("characters", []):
        if char["id"] == char_id:
            return char
    raise HTTPException(status_code=404, detail="Character not found")

@app.put("/characters/{char_id}")
def update_character(char_id: str, character: Character):
    data = load_json("roster.json")
    for i, char in enumerate(data.get("characters", [])):
        if char["id"] == char_id:
            character.id = char_id
            data["characters"][i] = character.dict()
            save_json("roster.json", data)
            return character
    raise HTTPException(status_code=404, detail="Character not found")

@app.delete("/characters/{char_id}")
def delete_character(char_id: str):
    data = load_json("roster.json")
    data["characters"] = [c for c in data.get("characters", []) if c["id"] != char_id]
    save_json("roster.json", data)
    return {"deleted": char_id}

# === Town Endpoints ===

@app.get("/town")
def get_town():
    data = load_json("town.json")
    if not data:
        data = {
            "name": "",
            "seeds": 0,
            "buildings": {
                "generalStore": True,
                "blacksmith": False,
                "weaversHut": False,
                "inn": False,
                "shrine": False,
                "watchtower": False,
                "garden": False
            }
        }
        save_json("town.json", data)
    return data

@app.put("/town")
def update_town(update: TownUpdate):
    data = load_json("town.json")
    if update.name is not None:
        data["name"] = update.name
    if update.seeds is not None:
        data["seeds"] = update.seeds
    if update.buildings is not None:
        data["buildings"].update(update.buildings)
    save_json("town.json", data)
    return data

# === Stash Endpoints ===

@app.get("/stash")
def get_stash():
    data = load_json("stash.json")
    return data.get("items", [])

@app.put("/stash")
def update_stash(items: list):
    save_json("stash.json", {"items": items})
    return {"items": items}

# === Session Endpoints ===

@app.get("/session")
def get_session():
    data = load_json("current_session.json")
    if not data:
        return {"active": False}
    return data

@app.post("/session/start")
def start_session(session: SessionStart):
    roster = load_json("roster.json")
    
    # Build party from character IDs
    party = []
    for char_id in session.partyIds:
        for char in roster.get("characters", []):
            if char["id"] == char_id:
                party.append({
                    "characterId": char_id,
                    "name": char["name"],
                    "species": char["species"],
                    "stats": char["stats"],
                    "currentHearts": char["maxHearts"],
                    "currentThreads": char["maxThreads"],
                    "gear": char["gear"],
                    "conditions": []
                })
                break
    
    session_data = {
        "active": True,
        "runState": "hook",
        "quest": session.quest,
        "location": session.location,
        "roomNumber": 0,
        "roomsTotal": 4,
        "party": party,
        "enemies": [],
        "lootCollected": [],
        "log": []
    }
    
    save_json("current_session.json", session_data)
    return session_data

@app.put("/session/update")
def update_session(update: SessionUpdate):
    data = load_json("current_session.json")
    if not data.get("active"):
        raise HTTPException(status_code=400, detail="No active session")
    
    if update.runState is not None:
        data["runState"] = update.runState
    if update.roomNumber is not None:
        data["roomNumber"] = update.roomNumber
    if update.party is not None:
        data["party"] = update.party
    if update.enemies is not None:
        data["enemies"] = update.enemies
    if update.lootCollected is not None:
        data["lootCollected"] = update.lootCollected
    
    save_json("current_session.json", data)
    return data

@app.post("/session/end")
def end_session(data: SessionEnd):
    """End session with outcome: 'victory', 'retreat', or 'failed'"""
    session = load_json("current_session.json")
    roster = load_json("roster.json")
    town = load_json("town.json")
    outcome = data.outcome

    if outcome == "victory":
        # Award XP to party members
        for party_member in session.get("party", []):
            for char in roster.get("characters", []):
                if char["id"] == party_member["characterId"]:
                    char["xp"] = char.get("xp", 0) + 2  # 1 base + 1 victory bonus
                    break
        
        # Add loot to town treasury (simplified: assume loot is seeds)
        # In real implementation, parse loot items
        save_json("roster.json", roster)
    
    elif outcome == "retreat":
        # Award partial XP
        for party_member in session.get("party", []):
            for char in roster.get("characters", []):
                if char["id"] == party_member["characterId"]:
                    char["xp"] = char.get("xp", 0) + 1
                    break
        save_json("roster.json", roster)
    
    # Clear session
    save_json("current_session.json", {"active": False})
    
    return {"outcome": outcome, "message": f"Run ended: {outcome}"}

# === Dice Endpoints ===

@app.post("/dice/roll")
def log_dice_roll(roll: DiceRoll):
    """Log a dice roll and return the result with threshold check"""
    total = roll.result + roll.modifier
    
    # Check against thresholds for d20 rolls
    threshold_result = None
    if roll.dieType == "d20":
        if total >= 15:
            threshold_result = "success"
        elif total >= 10:
            threshold_result = "partial"
        else:
            threshold_result = "failure"
    
    # Log to session if active
    session = load_json("current_session.json")
    if session.get("active"):
        log_entry = {
            "type": "roll",
            "die": roll.dieType,
            "result": roll.result,
            "modifier": roll.modifier,
            "total": total,
            "purpose": roll.purpose,
            "threshold": threshold_result
        }
        session.setdefault("log", []).append(log_entry)
        save_json("current_session.json", session)
    
    return {
        "die": roll.dieType,
        "result": roll.result,
        "modifier": roll.modifier,
        "total": total,
        "threshold": threshold_result
    }

# === DM / AI Endpoints ===

@app.post("/dm/message")
def dm_message(msg: DMMessage):
    """Send a message to Claude as DM, get response"""

    # Build context
    system_prompt = load_prompt("dm_system.md")
    rules = load_prompt("rules_reference.md")
    lore = load_prompt("bloomburrow_lore.md")

    # Get current session
    session = load_json("current_session.json")

    # Get current state if requested
    state_context = ""
    if msg.includeState and session.get("active"):
        state_context = f"""
## Current Session State
- Run State: {session.get('runState', 'unknown')}
- Quest: {session.get('quest', 'none')}
- Location: {session.get('location', 'unknown')}
- Room: {session.get('roomNumber', 0)} of {session.get('roomsTotal', 4)}

## Party Status
"""
        for member in session.get("party", []):
            state_context += f"- {member['name']} ({member['species']}): {member['currentHearts']} Hearts, {member['currentThreads']} Threads\n"

        if session.get("enemies"):
            state_context += "\n## Current Enemies\n"
            for enemy in session["enemies"]:
                state_context += f"- {enemy['name']}: {enemy['currentHearts']}/{enemy['maxHearts']} Hearts\n"

    # Combine into full system prompt
    full_system = f"""{system_prompt}

{state_context}

## Rules Reference
{rules}

## World Lore (Brief)
{lore}
"""

    # Build conversation history from session log
    messages = []
    if session.get("active") and session.get("log"):
        for entry in session["log"]:
            if entry.get("type") == "chat":
                role = "user" if entry["role"] == "player" else "assistant"
                messages.append({"role": role, "content": entry["content"]})

    # Add current message
    messages.append({"role": "user", "content": msg.message})

    # Call Claude API
    try:
        client = anthropic.Anthropic()  # Uses ANTHROPIC_API_KEY env var

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=full_system,
            messages=messages
        )

        dm_response = response.content[0].text

        # Log to session
        if session.get("active"):
            session.setdefault("log", []).append({
                "type": "chat",
                "role": "player",
                "content": msg.message
            })
            session.setdefault("log", []).append({
                "type": "chat",
                "role": "dm",
                "content": dm_response
            })
            save_json("current_session.json", session)

        return {"response": dm_response}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

# === Health Check ===

@app.get("/")
def root():
    return {"status": "ok", "app": "Bloomburrow Hub", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
