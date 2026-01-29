"""
Bloomburrow Hub - Backend Server
FastAPI application for managing game state and AI DM integration
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import json
import os
import re
import uuid
from datetime import datetime
import httpx
import anthropic
import replicate
from dotenv import load_dotenv
import random

# Campaign schema and DM context imports
from campaign_schema import (
    CampaignContent,
    CampaignState,
    CampaignSystem,
    NPCState,
    RunTriggerType,
    validate_campaign_content,
    BLOOMBURROW_SYSTEM,
    DEFAULT_SYSTEM
)
from dm_context_builder import (
    build_dm_system_injection,
    build_dm_system_prompt,
    build_rules_reference,
    build_lore_section
)

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
IMAGES_DIR = os.path.join(DATA_DIR, "images")
TEMPLATES_DIR = os.path.join(DATA_DIR, "templates")

# Ensure images directory exists
os.makedirs(IMAGES_DIR, exist_ok=True)

# Mount static files for serving images
app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")

# === Helper Functions ===

def load_json(filename: str) -> dict:
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return {}

def save_json(filename: str, data: dict):
    filepath = os.path.join(DATA_DIR, filename)
    temp_filepath = filepath + ".tmp"
    # Atomic write: write to temp file, then rename
    with open(temp_filepath, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(temp_filepath, filepath)

def load_prompt(filename: str) -> str:
    filepath = os.path.join(PROMPTS_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return f.read()
    return ""

# === Campaign Helper Functions ===

def get_campaign_dir(campaign_id: str) -> str:
    """Get the data directory path for a campaign"""
    return os.path.join(DATA_DIR, "campaigns", campaign_id)

def load_campaign_json(campaign_id: str, filename: str) -> dict:
    """Load JSON from a campaign's data directory"""
    filepath = os.path.join(get_campaign_dir(campaign_id), filename)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return {}

def save_campaign_json(campaign_id: str, filename: str, data: dict):
    """Save JSON to a campaign's data directory"""
    campaign_dir = get_campaign_dir(campaign_id)
    os.makedirs(campaign_dir, exist_ok=True)
    filepath = os.path.join(campaign_dir, filename)
    temp_filepath = filepath + ".tmp"
    with open(temp_filepath, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(temp_filepath, filepath)

def get_campaign_images_dir(campaign_id: str) -> str:
    """Get the images directory path for a campaign"""
    return os.path.join(get_campaign_dir(campaign_id), "images")

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
    requestIllustration: bool = False

class DiceRoll(BaseModel):
    dieType: str  # "d4", "d6", "d8", "d10", "d20"
    result: int
    modifier: int = 0
    purpose: str = ""

class SessionEnd(BaseModel):
    outcome: str  # "victory", "retreat", "failed"

class ImageRequest(BaseModel):
    prompt: str
    style: str = "scene"  # "scene", "character", "enemy", "item"

class CampaignCreate(BaseModel):
    name: str
    description: str = ""
    currencyName: str = "gold"
    template_id: Optional[str] = None  # Optional template to use for system config

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    currencyName: Optional[str] = None

# === Template Endpoints ===

@app.get("/templates")
def get_templates():
    """List all available system templates"""
    templates = []
    if os.path.exists(TEMPLATES_DIR):
        for filename in os.listdir(TEMPLATES_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(TEMPLATES_DIR, filename)
                try:
                    with open(filepath, 'r') as f:
                        template = json.load(f)
                        templates.append({
                            "id": template.get("id", filename.replace(".json", "")),
                            "name": template.get("name", filename),
                            "description": template.get("description", "")
                        })
                except:
                    pass
    return {"templates": templates}


@app.get("/templates/{template_id}")
def get_template(template_id: str):
    """Get a specific system template"""
    filepath = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Template not found")


# === Campaign Endpoints ===

@app.get("/campaigns/{campaign_id}/system")
def get_campaign_system(campaign_id: str):
    """Get the system configuration for a campaign"""
    # First check if campaign has a custom system
    system = load_campaign_json(campaign_id, "system.json")
    if system:
        return system

    # Fall back to Bloomburrow default for backwards compatibility
    return BLOOMBURROW_SYSTEM


@app.put("/campaigns/{campaign_id}/system")
def update_campaign_system(campaign_id: str, system: dict):
    """Update the system configuration for a campaign"""
    # Validate the system config
    try:
        CampaignSystem(**system)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid system config: {str(e)}")

    save_campaign_json(campaign_id, "system.json", system)
    return {"success": True}


@app.get("/campaigns")
def get_campaigns():
    """Get all campaigns with summary stats"""
    data = load_json("campaigns.json")
    if not data:
        # No campaigns yet, return empty
        return {"activeCampaignId": None, "campaigns": []}

    campaigns = []
    for campaign in data.get("campaigns", []):
        # Load campaign-specific data for stats
        roster = load_campaign_json(campaign["id"], "roster.json")
        town = load_campaign_json(campaign["id"], "town.json")

        campaigns.append({
            **campaign,
            "characterCount": len(roster.get("characters", [])),
            "currencyAmount": town.get("seeds", 0)
        })

    return {
        "activeCampaignId": data.get("activeCampaignId"),
        "campaigns": campaigns
    }

@app.get("/campaigns/{campaign_id}")
def get_campaign(campaign_id: str):
    """Get a specific campaign"""
    data = load_json("campaigns.json")
    for campaign in data.get("campaigns", []):
        if campaign["id"] == campaign_id:
            # Add stats
            roster = load_campaign_json(campaign_id, "roster.json")
            town = load_campaign_json(campaign_id, "town.json")
            return {
                **campaign,
                "characterCount": len(roster.get("characters", [])),
                "currencyAmount": town.get("seeds", 0)
            }
    raise HTTPException(status_code=404, detail="Campaign not found")

@app.post("/campaigns")
def create_campaign(campaign: CampaignCreate):
    """Create a new campaign"""
    data = load_json("campaigns.json")
    if not data:
        data = {"activeCampaignId": None, "campaigns": []}

    # Generate ID from name
    campaign_id = re.sub(r'[^a-z0-9]', '_', campaign.name.lower())
    campaign_id = f"{campaign_id}_{uuid.uuid4().hex[:6]}"

    # Load system config from template or use default
    system_config = None
    if campaign.template_id:
        template_path = os.path.join(TEMPLATES_DIR, f"{campaign.template_id}.json")
        if os.path.exists(template_path):
            with open(template_path, 'r') as f:
                template = json.load(f)
                system_config = template.get("system", BLOOMBURROW_SYSTEM)
        else:
            # Fall back to default if template not found
            system_config = DEFAULT_SYSTEM
    else:
        # No template specified, use Bloomburrow as default
        system_config = BLOOMBURROW_SYSTEM

    # Create campaign data directory
    campaign_dir = get_campaign_dir(campaign_id)
    os.makedirs(campaign_dir, exist_ok=True)
    os.makedirs(os.path.join(campaign_dir, "images"), exist_ok=True)

    # Initialize buildings from system config
    buildings_init = {}
    for i, building in enumerate(system_config.get("buildings", [])):
        # First building is free (unlocked by default)
        buildings_init[building["key"]] = (building.get("cost", 0) == 0)

    # Get currency config
    currency_config = system_config.get("currency", {"name": "Gold", "symbol": "🪙", "starting": 0})

    # Initialize campaign data files
    save_campaign_json(campaign_id, "roster.json", {"characters": []})
    save_campaign_json(campaign_id, "town.json", {
        "name": "",
        "currency": currency_config.get("starting", 0),
        "buildings": buildings_init
    })
    save_campaign_json(campaign_id, "stash.json", {"items": []})
    save_campaign_json(campaign_id, "current_session.json", {"active": False})
    save_campaign_json(campaign_id, "system.json", system_config)

    # Add to campaigns list
    now = datetime.utcnow().isoformat() + "Z"
    new_campaign = {
        "id": campaign_id,
        "name": campaign.name,
        "description": campaign.description,
        "bannerImage": None,
        "currencyName": campaign.currencyName,
        "lastPlayed": None,
        "createdAt": now,
        "isDraft": True  # New campaigns start as drafts
    }
    data["campaigns"].append(new_campaign)
    save_json("campaigns.json", data)

    return {**new_campaign, "characterCount": 0, "currencyAmount": 0}

@app.put("/campaigns/{campaign_id}")
def update_campaign(campaign_id: str, update: CampaignUpdate):
    """Update campaign metadata"""
    data = load_json("campaigns.json")

    for i, campaign in enumerate(data.get("campaigns", [])):
        if campaign["id"] == campaign_id:
            if update.name is not None:
                campaign["name"] = update.name
            if update.description is not None:
                campaign["description"] = update.description
            if update.currencyName is not None:
                campaign["currencyName"] = update.currencyName
            data["campaigns"][i] = campaign
            save_json("campaigns.json", data)
            return campaign

    raise HTTPException(status_code=404, detail="Campaign not found")

@app.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: str):
    """Delete a campaign and its data"""
    import shutil

    data = load_json("campaigns.json")

    # Find and remove campaign from list
    original_length = len(data.get("campaigns", []))
    data["campaigns"] = [c for c in data.get("campaigns", []) if c["id"] != campaign_id]

    if len(data["campaigns"]) == original_length:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # If deleted campaign was active, clear active
    if data.get("activeCampaignId") == campaign_id:
        data["activeCampaignId"] = None

    save_json("campaigns.json", data)

    # Delete campaign data directory
    campaign_dir = get_campaign_dir(campaign_id)
    if os.path.exists(campaign_dir):
        shutil.rmtree(campaign_dir)

    return {"deleted": campaign_id}

@app.put("/campaigns/{campaign_id}/select")
def select_campaign(campaign_id: str):
    """Set the active campaign and update lastPlayed"""
    data = load_json("campaigns.json")

    found = False
    for campaign in data.get("campaigns", []):
        if campaign["id"] == campaign_id:
            campaign["lastPlayed"] = datetime.utcnow().isoformat() + "Z"
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Campaign not found")

    data["activeCampaignId"] = campaign_id
    save_json("campaigns.json", data)
    return {"activeCampaignId": campaign_id}

@app.post("/campaigns/{campaign_id}/banner")
async def upload_campaign_banner(campaign_id: str, file: UploadFile = File(...)):
    """Upload a banner image for a campaign"""
    data = load_json("campaigns.json")

    # Find campaign
    campaign_idx = None
    for i, campaign in enumerate(data.get("campaigns", [])):
        if campaign["id"] == campaign_id:
            campaign_idx = i
            break

    if campaign_idx is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPEG, PNG, WebP, or GIF.")

    # Create campaign directory if needed
    campaign_dir = get_campaign_dir(campaign_id)
    os.makedirs(campaign_dir, exist_ok=True)

    # Determine file extension
    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
    ext = ext_map.get(file.content_type, ".jpg")

    # Save as banner file (overwrite existing)
    banner_path = os.path.join(campaign_dir, f"banner{ext}")

    # Remove old banner if exists with different extension
    for old_ext in [".jpg", ".png", ".webp", ".gif"]:
        old_path = os.path.join(campaign_dir, f"banner{old_ext}")
        if old_path != banner_path and os.path.exists(old_path):
            os.remove(old_path)

    # Write new banner
    content = await file.read()
    with open(banner_path, "wb") as f:
        f.write(content)

    # Update campaign metadata
    banner_url = f"/api/campaigns/{campaign_id}/banner"
    data["campaigns"][campaign_idx]["bannerImage"] = banner_url
    save_json("campaigns.json", data)

    return {"bannerImage": banner_url}

@app.get("/campaigns/{campaign_id}/banner")
def get_campaign_banner(campaign_id: str):
    """Serve a campaign's banner image"""
    campaign_dir = get_campaign_dir(campaign_id)

    # Check for banner with any supported extension
    for ext in [".jpg", ".png", ".webp", ".gif"]:
        banner_path = os.path.join(campaign_dir, f"banner{ext}")
        if os.path.exists(banner_path):
            media_types = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}
            return FileResponse(banner_path, media_type=media_types[ext])

    raise HTTPException(status_code=404, detail="Banner not found")

# === Campaign Content Endpoints ===

class CampaignContentRequest(BaseModel):
    """Request body for campaign content"""
    content: dict

class RunCompleteRequest(BaseModel):
    """Request body for completing a run"""
    outcome: str  # "victory", "retreat", "failed"
    facts_learned: list = []
    npcs_met: list = []
    locations_visited: list = []

def load_campaign_content(campaign_id: str):
    """Load authored campaign content"""
    data = load_campaign_json(campaign_id, "campaign.json")
    if not data:
        return None
    try:
        return CampaignContent(**data)
    except Exception:
        return None

def load_campaign_state(campaign_id: str) -> CampaignState:
    """Load runtime campaign state"""
    data = load_campaign_json(campaign_id, "state.json")
    if not data:
        return CampaignState()
    return CampaignState(**data)

def save_campaign_state(campaign_id: str, state: CampaignState):
    """Save runtime campaign state"""
    save_campaign_json(campaign_id, "state.json", state.dict())

def check_trigger(trigger, state: CampaignState) -> bool:
    """Check if a run trigger condition is met"""
    if trigger.type == RunTriggerType.START:
        return True
    if trigger.type == RunTriggerType.AFTER_RUN:
        return trigger.value in state.anchor_runs_completed
    if trigger.type == RunTriggerType.AFTER_RUNS_COUNT:
        return state.runs_completed >= int(trigger.value)
    if trigger.type == RunTriggerType.THREAT_STAGE:
        return state.threat_stage >= int(trigger.value)
    return False

def get_available_runs(content: CampaignContent, state: CampaignState) -> dict:
    """Get currently available anchor runs and filler seeds"""
    available_anchors = []
    for run in content.anchor_runs:
        if run.id not in state.anchor_runs_completed:
            if check_trigger(run.trigger, state):
                available_anchors.append(run)

    available_fillers = []
    for i, seed in enumerate(content.filler_seeds):
        if i not in state.filler_seeds_used:
            available_fillers.append({"index": i, "seed": seed})

    return {"anchors": available_anchors, "fillers": available_fillers}

def select_next_run(content: CampaignContent, state: CampaignState) -> dict:
    """Select the next recommended run"""
    available = get_available_runs(content, state)

    if available["anchors"]:
        run = available["anchors"][0]
        return {
            "type": "anchor",
            "id": run.id,
            "hook": run.hook,
            "goal": run.goal,
            "tone": run.tone or content.tone,
            "must_include": run.must_include,
            "reveal": run.reveal
        }

    if available["fillers"]:
        filler = random.choice(available["fillers"])
        return {
            "type": "filler",
            "index": filler["index"],
            "hook": filler["seed"],
            "goal": "Complete the task",
            "tone": content.tone,
            "must_include": [],
            "reveal": None
        }

    return {"type": "none", "message": "No runs available. Campaign may be complete."}

def build_dm_context(content: CampaignContent, state: CampaignState, run_details: dict) -> dict:
    """Build full context for the DM"""
    party_knows = list(state.facts_known)
    party_does_not_know = []

    for npc in content.npcs:
        npc_key = npc.name.lower().replace(" ", "_")
        if npc.secret not in party_knows:
            party_does_not_know.append(f"{npc.name}'s secret: {npc.secret}")

    for run in content.anchor_runs:
        if run.id not in state.anchor_runs_completed and run.reveal:
            if run.reveal not in party_knows:
                party_does_not_know.append(f"Run reveal ({run.id}): {run.reveal}")

    npc_states = {}
    for npc in content.npcs:
        npc_key = npc.name.lower().replace(" ", "_")
        npc_runtime = state.npcs.get(npc_key, NPCState())
        npc_states[npc.name] = {
            "species": npc.species.value,
            "role": npc.role,
            "wants": npc.wants,
            "secret": npc.secret,
            "met": npc_runtime.met,
            "disposition": npc_runtime.disposition
        }

    threat_desc = content.threat.stages[state.threat_stage] if state.threat_stage < len(content.threat.stages) else "Maximum threat reached"

    return {
        "run": run_details,
        "campaign_context": {
            "name": content.name,
            "premise": content.premise,
            "tone": content.tone,
            "locations": [{"name": loc.name, "vibe": loc.vibe, "contains": [t.value for t in loc.contains]} for loc in content.locations]
        },
        "party_knows": party_knows,
        "party_does_not_know": party_does_not_know,
        "npc_states": npc_states,
        "threat_stage": state.threat_stage,
        "threat_name": content.threat.name,
        "threat_description": threat_desc,
        "runs_completed": state.runs_completed,
        "locations_visited": state.locations_visited
    }

@app.post("/campaigns/{campaign_id}/content")
def create_campaign_content(campaign_id: str, request: CampaignContentRequest):
    """Create or replace campaign authored content"""
    result = validate_campaign_content(request.content)
    if not result.valid:
        raise HTTPException(status_code=400, detail={"errors": result.errors})

    content = CampaignContent(**request.content)
    save_campaign_json(campaign_id, "campaign.json", content.dict())

    # Mark campaign as no longer a draft
    campaigns_data = load_json("campaigns.json")
    for campaign in campaigns_data.get("campaigns", []):
        if campaign["id"] == campaign_id:
            campaign["isDraft"] = False
            break
    save_json("campaigns.json", campaigns_data)

    # Initialize state if needed
    state_data = load_campaign_json(campaign_id, "state.json")
    if not state_data:
        state = CampaignState()
        state.initialize_from_content(content)
        save_campaign_state(campaign_id, state)

    return {"success": True, "warnings": result.warnings, "campaign_id": campaign_id}

@app.post("/campaigns/{campaign_id}/draft")
def save_campaign_draft(campaign_id: str, request: CampaignContentRequest):
    """Save campaign content as draft (no validation)"""
    # Save raw content without validation
    save_campaign_json(campaign_id, "draft.json", request.content)

    # Ensure campaign is marked as draft
    campaigns_data = load_json("campaigns.json")
    for campaign in campaigns_data.get("campaigns", []):
        if campaign["id"] == campaign_id:
            campaign["isDraft"] = True
            # Update name/description from draft if provided
            if request.content.get("name"):
                campaign["name"] = request.content["name"]
            if request.content.get("premise"):
                campaign["description"] = request.content["premise"]
            break
    save_json("campaigns.json", campaigns_data)

    return {"success": True, "campaign_id": campaign_id, "isDraft": True}

@app.get("/campaigns/{campaign_id}/draft")
def get_campaign_draft(campaign_id: str):
    """Get campaign draft content for resuming editing"""
    draft = load_campaign_json(campaign_id, "draft.json")
    if draft:
        return {"hasDraft": True, "content": draft}

    # Fall back to campaign.json if exists
    content = load_campaign_json(campaign_id, "campaign.json")
    if content:
        return {"hasDraft": False, "content": content}

    return {"hasDraft": False, "content": None}

@app.get("/campaigns/{campaign_id}/content")
def get_campaign_content_endpoint(campaign_id: str):
    """Get campaign authored content for editing"""
    content = load_campaign_content(campaign_id)
    if not content:
        raise HTTPException(status_code=404, detail="Campaign content not found")
    return content.dict()

@app.put("/campaigns/{campaign_id}/content")
def update_campaign_content(campaign_id: str, request: CampaignContentRequest):
    """Update campaign authored content"""
    result = validate_campaign_content(request.content)
    if not result.valid:
        raise HTTPException(status_code=400, detail={"errors": result.errors})

    content = CampaignContent(**request.content)
    save_campaign_json(campaign_id, "campaign.json", content.dict())

    # Update state to include any new NPCs
    state = load_campaign_state(campaign_id)
    for npc in content.npcs:
        npc_key = npc.name.lower().replace(" ", "_")
        if npc_key not in state.npcs:
            state.npcs[npc_key] = NPCState()
    save_campaign_state(campaign_id, state)

    return {"success": True, "warnings": result.warnings}

@app.get("/campaigns/{campaign_id}/state")
def get_campaign_state_endpoint(campaign_id: str):
    """Get campaign runtime state"""
    state = load_campaign_state(campaign_id)
    return state.dict()

@app.post("/campaigns/{campaign_id}/state/reset")
def reset_campaign_state(campaign_id: str):
    """Reset campaign runtime state (keep content)"""
    content = load_campaign_content(campaign_id)
    if not content:
        raise HTTPException(status_code=404, detail="Campaign content not found")

    state = CampaignState()
    state.initialize_from_content(content)
    save_campaign_state(campaign_id, state)
    return {"success": True}

@app.get("/campaigns/{campaign_id}/available-runs")
def get_available_runs_endpoint(campaign_id: str):
    """Get list of currently available runs"""
    content = load_campaign_content(campaign_id)
    if not content:
        return {"anchors": [], "fillers": [], "hasContent": False}

    state = load_campaign_state(campaign_id)
    available = get_available_runs(content, state)

    return {
        "hasContent": True,
        "anchors": [{"id": r.id, "hook": r.hook, "goal": r.goal} for r in available["anchors"]],
        "fillers": available["fillers"],
        "runs_completed": state.runs_completed,
        "threat_stage": state.threat_stage
    }

@app.get("/campaigns/{campaign_id}/next-run")
def get_next_run_endpoint(campaign_id: str):
    """Get the next recommended run"""
    content = load_campaign_content(campaign_id)
    if not content:
        return {"type": "none", "hasContent": False}

    state = load_campaign_state(campaign_id)
    return {**select_next_run(content, state), "hasContent": True}

@app.post("/campaigns/{campaign_id}/start-run")
def start_run(campaign_id: str, run_type: str, run_id: str = None, filler_index: int = None):
    """Start a run and get DM context"""
    content = load_campaign_content(campaign_id)
    if not content:
        raise HTTPException(status_code=404, detail="Campaign content not found")

    state = load_campaign_state(campaign_id)

    if run_type == "anchor":
        run = next((r for r in content.anchor_runs if r.id == run_id), None)
        if not run:
            raise HTTPException(status_code=404, detail="Anchor run not found")
        state.current_run_id = run.id
        state.current_run_type = "anchor"
        run_details = {
            "type": "anchor",
            "id": run.id,
            "hook": run.hook,
            "goal": run.goal,
            "tone": run.tone or content.tone,
            "must_include": run.must_include,
            "reveal": run.reveal
        }
    else:
        if filler_index is None or filler_index >= len(content.filler_seeds):
            raise HTTPException(status_code=400, detail="Invalid filler index")
        state.current_run_id = f"filler_{filler_index}"
        state.current_run_type = "filler"
        run_details = {
            "type": "filler",
            "index": filler_index,
            "hook": content.filler_seeds[filler_index],
            "goal": "Complete the task",
            "tone": content.tone,
            "must_include": [],
            "reveal": None
        }

    save_campaign_state(campaign_id, state)
    return build_dm_context(content, state, run_details)

@app.post("/campaigns/{campaign_id}/complete-run")
def complete_run(campaign_id: str, request: RunCompleteRequest):
    """Complete current run and update state"""
    content = load_campaign_content(campaign_id)
    if not content:
        raise HTTPException(status_code=404, detail="Campaign content not found")

    state = load_campaign_state(campaign_id)

    if not state.current_run_id:
        raise HTTPException(status_code=400, detail="No active run")

    state.runs_completed += 1

    if request.outcome == "victory":
        if state.current_run_type == "anchor":
            state.anchor_runs_completed.append(state.current_run_id)
            run = next((r for r in content.anchor_runs if r.id == state.current_run_id), None)
            if run and run.reveal:
                state.facts_known.append(run.reveal)
        else:
            filler_index = int(state.current_run_id.split("_")[1])
            if filler_index not in state.filler_seeds_used:
                state.filler_seeds_used.append(filler_index)

    elif request.outcome == "failed":
        if content.threat.advance_on.value == "run_failed":
            state.threat_stage = min(state.threat_stage + 1, len(content.threat.stages) - 1)

    state.facts_known.extend(request.facts_learned)
    state.facts_known = list(set(state.facts_known))
    state.locations_visited.extend(request.locations_visited)
    state.locations_visited = list(set(state.locations_visited))

    for npc_name in request.npcs_met:
        npc_key = npc_name.lower().replace(" ", "_")
        if npc_key in state.npcs:
            state.npcs[npc_key].met = True

    state.current_run_id = None
    state.current_run_type = None
    save_campaign_state(campaign_id, state)

    # Check periodic threat advance
    if content.threat.advance_on.value == "every_2_runs" and state.runs_completed % 2 == 0:
        state.threat_stage = min(state.threat_stage + 1, len(content.threat.stages) - 1)
        save_campaign_state(campaign_id, state)
    elif content.threat.advance_on.value == "every_3_runs" and state.runs_completed % 3 == 0:
        state.threat_stage = min(state.threat_stage + 1, len(content.threat.stages) - 1)
        save_campaign_state(campaign_id, state)

    # Check if campaign is complete
    all_anchors_done = all(run.id in state.anchor_runs_completed for run in content.anchor_runs)
    threat_maxed = state.threat_stage >= len(content.threat.stages) - 1

    return {
        "success": True,
        "runs_completed": state.runs_completed,
        "threat_stage": state.threat_stage,
        "campaign_complete": all_anchors_done or threat_maxed
    }

@app.get("/campaigns/{campaign_id}/dm-context")
def get_dm_context_endpoint(campaign_id: str):
    """Get current DM context for ongoing run"""
    content = load_campaign_content(campaign_id)
    if not content:
        raise HTTPException(status_code=404, detail="Campaign content not found")

    state = load_campaign_state(campaign_id)

    if not state.current_run_id:
        raise HTTPException(status_code=400, detail="No active run")

    if state.current_run_type == "anchor":
        run = next((r for r in content.anchor_runs if r.id == state.current_run_id), None)
        run_details = {
            "type": "anchor",
            "id": run.id,
            "hook": run.hook,
            "goal": run.goal,
            "tone": run.tone or content.tone,
            "must_include": run.must_include,
            "reveal": run.reveal
        }
    else:
        filler_index = int(state.current_run_id.split("_")[1])
        run_details = {
            "type": "filler",
            "index": filler_index,
            "hook": content.filler_seeds[filler_index],
            "goal": "Complete the task",
            "tone": content.tone,
            "must_include": [],
            "reveal": None
        }

    return build_dm_context(content, state, run_details)

# === Character Endpoints (Campaign-Scoped) ===

@app.get("/campaigns/{campaign_id}/characters")
def get_characters(campaign_id: str):
    data = load_campaign_json(campaign_id, "roster.json")
    return data.get("characters", [])

@app.post("/campaigns/{campaign_id}/characters")
def create_character(campaign_id: str, character: Character):
    data = load_campaign_json(campaign_id, "roster.json")
    if "characters" not in data:
        data["characters"] = []

    # Generate ID
    char_id = f"char_{len(data['characters']) + 1:03d}"
    character.id = char_id

    data["characters"].append(character.dict())
    save_campaign_json(campaign_id, "roster.json", data)
    return character

@app.get("/campaigns/{campaign_id}/characters/{char_id}")
def get_character(campaign_id: str, char_id: str):
    data = load_campaign_json(campaign_id, "roster.json")
    for char in data.get("characters", []):
        if char["id"] == char_id:
            return char
    raise HTTPException(status_code=404, detail="Character not found")

@app.put("/campaigns/{campaign_id}/characters/{char_id}")
def update_character(campaign_id: str, char_id: str, updates: dict):
    """Update a character's stats, level, etc."""
    data = load_campaign_json(campaign_id, "roster.json")
    for i, char in enumerate(data.get("characters", [])):
        if char["id"] == char_id:
            # Apply updates
            for key, value in updates.items():
                if key == "stats" and isinstance(value, dict):
                    # Merge stats
                    char["stats"] = {**char.get("stats", {}), **value}
                else:
                    char[key] = value
            data["characters"][i] = char
            save_campaign_json(campaign_id, "roster.json", data)
            return char
    raise HTTPException(status_code=404, detail="Character not found")

@app.delete("/campaigns/{campaign_id}/characters/{char_id}")
def delete_character(campaign_id: str, char_id: str):
    data = load_campaign_json(campaign_id, "roster.json")
    data["characters"] = [c for c in data.get("characters", []) if c["id"] != char_id]
    save_campaign_json(campaign_id, "roster.json", data)
    return {"deleted": char_id}

# === Town Endpoints (Campaign-Scoped) ===

@app.get("/campaigns/{campaign_id}/town")
def get_town(campaign_id: str):
    data = load_campaign_json(campaign_id, "town.json")
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
        save_campaign_json(campaign_id, "town.json", data)
    return data

@app.put("/campaigns/{campaign_id}/town")
def update_town(campaign_id: str, update: TownUpdate):
    data = load_campaign_json(campaign_id, "town.json")
    if update.name is not None:
        data["name"] = update.name
    if update.seeds is not None:
        data["seeds"] = update.seeds
    if update.buildings is not None:
        data["buildings"].update(update.buildings)
    save_campaign_json(campaign_id, "town.json", data)
    return data

# === Stash Endpoints (Campaign-Scoped) ===

@app.get("/campaigns/{campaign_id}/stash")
def get_stash(campaign_id: str):
    data = load_campaign_json(campaign_id, "stash.json")
    return data.get("items", [])

@app.put("/campaigns/{campaign_id}/stash")
def update_stash(campaign_id: str, items: list):
    save_campaign_json(campaign_id, "stash.json", {"items": items})
    return {"items": items}

# === Session Endpoints (Campaign-Scoped) ===

@app.get("/campaigns/{campaign_id}/session")
def get_session(campaign_id: str):
    data = load_campaign_json(campaign_id, "current_session.json")
    if not data:
        return {"active": False}
    return data

@app.post("/campaigns/{campaign_id}/session/start")
def start_session(campaign_id: str, session: SessionStart):
    roster = load_campaign_json(campaign_id, "roster.json")

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
                    "maxHearts": char["maxHearts"],
                    "maxThreads": char["maxThreads"],
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

    save_campaign_json(campaign_id, "current_session.json", session_data)
    return session_data

@app.put("/campaigns/{campaign_id}/session/update")
def update_session(campaign_id: str, update: SessionUpdate):
    data = load_campaign_json(campaign_id, "current_session.json")
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

    save_campaign_json(campaign_id, "current_session.json", data)
    return data

@app.post("/campaigns/{campaign_id}/session/end")
def end_session(campaign_id: str, data: SessionEnd):
    """End session with outcome: 'victory', 'retreat', or 'failed'"""
    session = load_campaign_json(campaign_id, "current_session.json")
    roster = load_campaign_json(campaign_id, "roster.json")
    town = load_campaign_json(campaign_id, "town.json")
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
        save_campaign_json(campaign_id, "roster.json", roster)

    elif outcome == "retreat":
        # Award partial XP
        for party_member in session.get("party", []):
            for char in roster.get("characters", []):
                if char["id"] == party_member["characterId"]:
                    char["xp"] = char.get("xp", 0) + 1
                    break
        save_campaign_json(campaign_id, "roster.json", roster)

    # Clear session
    save_campaign_json(campaign_id, "current_session.json", {"active": False})

    return {"outcome": outcome, "message": f"Run ended: {outcome}"}

# === Dice Endpoints (Campaign-Scoped) ===

@app.post("/campaigns/{campaign_id}/dice/roll")
def log_dice_roll(campaign_id: str, roll: DiceRoll):
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
    session = load_campaign_json(campaign_id, "current_session.json")
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
        save_campaign_json(campaign_id, "current_session.json", session)

    return {
        "die": roll.dieType,
        "result": roll.result,
        "modifier": roll.modifier,
        "total": total,
        "threshold": threshold_result
    }

# === DM / AI Endpoints ===

def craft_image_prompt(scene_description: str, session: dict) -> str:
    """Use Claude to craft an optimized image generation prompt"""
    party_info = ""
    if session.get("party"):
        party_info = ", ".join([f"{m['name']} (a {m['species'].lower()})" for m in session["party"]])

    location = session.get("location", "a woodland location")

    try:
        client = anthropic.Anthropic()
        response = client.messages.create(
            model="claude-3-5-haiku-latest",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": f"""Convert this scene description into an optimized image generation prompt.

Scene: {scene_description}
Location: {location}
Characters present: {party_info}

Rules:
- Output ONLY the prompt, nothing else
- 1-2 sentences max
- Focus on composition, lighting, mood, key visual elements
- Describe it as a rich, atmospheric fantasy illustration with earthy tones
- Include specific details about any characters (species, clothing, expressions)
- No action verbs - describe a frozen moment
- Be specific about colors and lighting"""
            }]
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"Prompt crafting failed: {e}")
        return scene_description  # Fall back to original


def download_image(url: str, campaign_id: str = None) -> str:
    """Download image from URL and save locally, return local path"""
    try:
        response = httpx.get(url, timeout=30.0)
        response.raise_for_status()

        # Generate unique filename
        filename = f"{uuid.uuid4().hex}.webp"

        # Save to campaign-specific directory if campaign_id provided
        if campaign_id:
            images_dir = get_campaign_images_dir(campaign_id)
            os.makedirs(images_dir, exist_ok=True)
            filepath = os.path.join(images_dir, filename)
            url_path = f"/api/campaigns/{campaign_id}/images/{filename}"
        else:
            filepath = os.path.join(IMAGES_DIR, filename)
            url_path = f"/api/images/{filename}"

        with open(filepath, "wb") as f:
            f.write(response.content)

        return url_path
    except Exception as e:
        print(f"Failed to download image: {e}")
        return None

def generate_scene_image(scene_description: str, session: dict, campaign_id: str = None, art_style: str = None) -> tuple[str, str]:
    """Generate an image for a scene and return (local_URL, crafted_prompt)"""

    # First, craft an optimized prompt
    crafted_prompt = craft_image_prompt(scene_description, session)

    # Use provided art style or fall back to default
    style = art_style or "fantasy illustration, detailed, atmospheric lighting"

    # Add style prefix
    full_prompt = f"{style}, {crafted_prompt}"

    try:
        output = replicate.run(
            "black-forest-labs/flux-schnell",
            input={
                "prompt": full_prompt,
                "num_outputs": 1,
                "aspect_ratio": "16:9",
                "output_format": "webp",
                "output_quality": 80
            }
        )
        # Convert FileOutput to string URL and download locally
        if output and len(output) > 0:
            remote_url = str(output[0])
            local_url = download_image(remote_url, campaign_id)
            if local_url:
                return local_url, crafted_prompt
            # Fallback to remote URL if download fails
            return remote_url, crafted_prompt
        return None, crafted_prompt
    except Exception as e:
        print(f"Image generation failed: {e}")
        return None, crafted_prompt


@app.post("/campaigns/{campaign_id}/dm/message")
def dm_message(campaign_id: str, msg: DMMessage):
    """Send a message to Claude as DM, get response"""

    # Load campaign system config
    system_config = load_campaign_json(campaign_id, "system.json")
    if not system_config:
        # Fall back to Bloomburrow for backwards compatibility
        system_config = BLOOMBURROW_SYSTEM

    # Build prompts from system config
    system_prompt = build_dm_system_prompt(system_config)
    rules = build_rules_reference(system_config)
    lore = build_lore_section(system_config)

    # Get current session
    session = load_campaign_json(campaign_id, "current_session.json")

    # Check for authored campaign content
    campaign_context_section = ""
    content = load_campaign_content(campaign_id)
    if content:
        state = load_campaign_state(campaign_id)
        if state.current_run_id:
            # Build run details
            if state.current_run_type == "anchor":
                run = next((r for r in content.anchor_runs if r.id == state.current_run_id), None)
                if run:
                    run_details = {
                        "type": "anchor",
                        "id": run.id,
                        "hook": run.hook,
                        "goal": run.goal,
                        "tone": run.tone or content.tone,
                        "must_include": run.must_include,
                        "reveal": run.reveal
                    }
                    dm_context = build_dm_context(content, state, run_details)
                    campaign_context_section = build_dm_system_injection(dm_context, session)
            else:
                filler_index = int(state.current_run_id.split("_")[1])
                run_details = {
                    "type": "filler",
                    "index": filler_index,
                    "hook": content.filler_seeds[filler_index],
                    "goal": "Complete the task",
                    "tone": content.tone,
                    "must_include": [],
                    "reveal": None
                }
                dm_context = build_dm_context(content, state, run_details)
                campaign_context_section = build_dm_system_injection(dm_context, session)

    # Get current state if requested (for freestyle campaigns or fallback)
    state_context = ""
    if msg.includeState and session.get("active") and not campaign_context_section:
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

        # Include previously generated images for context
        if session.get("images"):
            state_context += "\n## Previously Generated Scenes\n"
            for img in session.get("images", [])[-5:]:  # Last 5 images
                state_context += f"- {img.get('prompt', 'unknown scene')}\n"

    # Combine into full system prompt
    full_system = f"""{system_prompt}

{campaign_context_section}

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

    # Add current message, with illustration request if needed
    user_content = msg.message
    if msg.requestIllustration:
        user_content += "\n\n[Please include a vivid, painterly description of the scene in your response, and include a [SCENE: ...] tag with visual details for illustration.]"
    messages.append({"role": "user", "content": user_content})

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
        image_url = None

        # Get art style from system config
        art_style = system_config.get("art_style", "fantasy illustration, detailed, atmospheric lighting")

        # Check for [SCENE: ...] tag and generate image
        scene_match = re.search(r'\[SCENE:\s*(.+?)\]', dm_response, re.IGNORECASE | re.DOTALL)
        if scene_match:
            scene_description = scene_match.group(1).strip()
            image_url, crafted_prompt = generate_scene_image(scene_description, session, campaign_id, art_style)

            # Store image in session
            if image_url and session.get("active"):
                session.setdefault("images", []).append({
                    "url": image_url,
                    "prompt": crafted_prompt
                })
                session["currentImage"] = image_url

            # Remove the [SCENE:] tag from the response shown to users
            dm_response_clean = re.sub(r'\[SCENE:\s*.+?\]', '', dm_response, flags=re.IGNORECASE | re.DOTALL).strip()
        else:
            dm_response_clean = dm_response
            # If illustration was requested but no SCENE tag, generate from first paragraph
            if msg.requestIllustration and session.get("active"):
                # Use first paragraph as scene description
                first_para = dm_response.split('\n\n')[0][:500]
                image_url, crafted_prompt = generate_scene_image(first_para, session, campaign_id, art_style)
                if image_url:
                    session.setdefault("images", []).append({
                        "url": image_url,
                        "prompt": crafted_prompt
                    })
                    session["currentImage"] = image_url

        # Check for [PHASE: ...] tag and update session
        phase_match = re.search(r'\[PHASE:\s*(\w+)\]', dm_response, re.IGNORECASE)
        if phase_match and session.get("active"):
            new_phase = phase_match.group(1).strip().lower()
            session["runState"] = new_phase
            # Remove tag from response
            dm_response_clean = re.sub(r'\[PHASE:\s*\w+\]', '', dm_response_clean, flags=re.IGNORECASE).strip()

        # Check for [ROOM: ...] tag and update session
        room_match = re.search(r'\[ROOM:\s*(\d+)\]', dm_response, re.IGNORECASE)
        if room_match and session.get("active"):
            new_room = int(room_match.group(1))
            session["roomNumber"] = new_room
            # Remove tag from response
            dm_response_clean = re.sub(r'\[ROOM:\s*\d+\]', '', dm_response_clean, flags=re.IGNORECASE).strip()

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
                "content": dm_response_clean
            })
            save_campaign_json(campaign_id, "current_session.json", session)

        return {
            "response": dm_response_clean,
            "image_url": image_url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

# === Image Generation (Campaign-Scoped) ===

# Default style for backwards compatibility
DEFAULT_ART_STYLE = "fantasy illustration, detailed, atmospheric lighting"

@app.post("/campaigns/{campaign_id}/image/generate")
def generate_image(campaign_id: str, request: ImageRequest):
    """Generate an image using Replicate Flux"""

    # Load campaign system config for art style
    system_config = load_campaign_json(campaign_id, "system.json")
    art_style = system_config.get("art_style", DEFAULT_ART_STYLE) if system_config else DEFAULT_ART_STYLE

    # Build the full prompt with style
    if request.style == "scene":
        full_prompt = f"{art_style}, scenic landscape view, {request.prompt}"
    elif request.style == "character":
        full_prompt = f"{art_style}, character portrait, {request.prompt}"
    elif request.style == "enemy":
        full_prompt = f"{art_style}, creature design, slightly menacing but not scary, {request.prompt}"
    else:
        full_prompt = f"{art_style}, {request.prompt}"

    try:
        output = replicate.run(
            "black-forest-labs/flux-schnell",
            input={
                "prompt": full_prompt,
                "num_outputs": 1,
                "aspect_ratio": "16:9",
                "output_format": "webp",
                "output_quality": 80
            }
        )

        # Flux returns a list of URLs - download to campaign directory
        if output and len(output) > 0:
            remote_url = str(output[0])
            local_url = download_image(remote_url, campaign_id)
            return {"image_url": local_url or remote_url, "prompt": full_prompt}

        return {"image_url": None, "prompt": full_prompt}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation error: {str(e)}")

# === Campaign Image Serving ===

@app.get("/campaigns/{campaign_id}/images/{filename}")
def get_campaign_image(campaign_id: str, filename: str):
    """Serve images from a campaign's images directory"""
    filepath = os.path.join(get_campaign_images_dir(campaign_id), filename)
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="image/webp")
    raise HTTPException(status_code=404, detail="Image not found")

# === Health Check ===

@app.get("/")
def root():
    return {"status": "ok", "app": "Bloomburrow Hub", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
