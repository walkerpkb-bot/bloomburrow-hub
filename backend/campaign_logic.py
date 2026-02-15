"""
Campaign content, state, and run management logic
"""

import random

from campaign_schema import (
    CampaignContent,
    CampaignState,
    NPCState,
    RunTriggerType,
    DMPrepData,
)
from helpers import load_campaign_json, save_campaign_json


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
            "species": npc.species,
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
            "locations": [{"name": loc.name, "vibe": loc.vibe, "contains": loc.contains} for loc in content.locations]
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


# === DM Prep Data Helpers ===

def load_dm_prep_data(campaign_id: str) -> DMPrepData:
    """Load DM prep data for a campaign"""
    data = load_campaign_json(campaign_id, "dm_prep.json")
    if not data:
        return DMPrepData()
    return DMPrepData(**data)


def save_dm_prep_data(campaign_id: str, prep_data: DMPrepData):
    """Save DM prep data for a campaign"""
    save_campaign_json(campaign_id, "dm_prep.json", prep_data.dict())
