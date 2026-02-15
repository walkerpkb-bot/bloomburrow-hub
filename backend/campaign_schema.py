"""
Campaign Schema and Validation
Defines the structure for authored campaign content
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from enum import Enum
import yaml
import json


class Species(str, Enum):
    MOUSEFOLK = "Mousefolk"
    RABBITFOLK = "Rabbitfolk"
    BIRDFOLK = "Birdfolk"
    BATFOLK = "Batfolk"
    FROGFOLK = "Frogfolk"
    RATFOLK = "Ratfolk"
    OTTERFOLK = "Otterfolk"
    LIZARDFOLK = "Lizardfolk"
    SQUIRRELFOLK = "Squirrelfolk"
    RACCOONFOLK = "Raccoonfolk"


class LocationTag(str, Enum):
    EXPOSITION = "exposition"
    ALLY = "ally"
    BOSS = "boss"
    TREASURE = "treasure"
    DANGER = "danger"
    SECRET = "secret"
    REST = "rest"


class ThreatAdvanceTrigger(str, Enum):
    RUN_FAILED = "run_failed"
    EVERY_2_RUNS = "every_2_runs"
    EVERY_3_RUNS = "every_3_runs"
    MANUAL = "manual"


class RunTriggerType(str, Enum):
    START = "start"
    AFTER_RUN = "after_run"
    AFTER_RUNS_COUNT = "after_runs_count"
    THREAT_STAGE = "threat_stage"


# === Campaign System Configuration ===

class SpeciesDefinition(BaseModel):
    """A playable species/race in the campaign"""
    name: str = Field(..., min_length=1, max_length=50)
    trait_name: str = Field(..., min_length=1, max_length=50, description="Name of the species trait")
    trait_desc: str = Field(..., min_length=10, max_length=200, description="Description of what the trait does")


class StatConfig(BaseModel):
    """Configuration for the stat system"""
    names: list[str] = Field(..., min_items=2, max_items=6, description="Stat names (e.g., Brave, Clever, Kind)")
    colors: list[str] = Field(default_factory=list, description="Hex colors for UI display")
    starting_pool: int = Field(5, ge=3, le=20, description="Total stat points to distribute at creation")
    min_per_stat: int = Field(1, ge=0, le=5, description="Minimum value for each stat")
    max_per_stat: int = Field(3, ge=1, le=10, description="Maximum value for each stat at creation")

    @validator('colors', always=True)
    def fill_colors(cls, v, values):
        """Ensure colors array matches names length"""
        names = values.get('names', [])
        if len(v) < len(names):
            # Fill with default colors
            default_colors = ["#c75050", "#5090c7", "#50c770", "#c7a050", "#a050c7", "#50c7a0"]
            while len(v) < len(names):
                v.append(default_colors[len(v) % len(default_colors)])
        return v[:len(names)]


class ResourceConfig(BaseModel):
    """Configuration for a resource (health, magic, etc.)"""
    name: str = Field(..., min_length=1, max_length=30, description="Resource name (e.g., Hearts, Threads)")
    symbol: str = Field(..., min_length=1, max_length=5, description="Display symbol (e.g., ♥, ✦)")
    starting: int = Field(..., ge=1, le=20, description="Starting value")
    max: int = Field(..., ge=1, le=30, description="Maximum value at highest level")


class CurrencyConfig(BaseModel):
    """Configuration for the campaign currency"""
    name: str = Field("Gold", min_length=1, max_length=30)
    symbol: str = Field("🪙", min_length=1, max_length=5)
    starting: int = Field(0, ge=0)


class BuildingDefinition(BaseModel):
    """A building that can be constructed in town"""
    key: str = Field(..., pattern=r'^[a-zA-Z][a-zA-Z0-9_]*$', max_length=30)
    name: str = Field(..., min_length=1, max_length=50)
    cost: int = Field(..., ge=0)
    desc: str = Field(..., min_length=1, max_length=100)


class LevelReward(BaseModel):
    """Reward granted at a specific level"""
    type: str = Field(..., description="Reward type: stat, health, magic, choice, ability")
    desc: str = Field(..., min_length=5, max_length=100, description="Description shown to player")


class LevelingConfig(BaseModel):
    """Configuration for the leveling system"""
    max_level: int = Field(5, ge=2, le=20)
    thresholds: list[int] = Field(..., min_items=1, description="XP needed for each level (starting at level 2)")
    rewards: dict[str, LevelReward] = Field(default_factory=dict, description="Rewards keyed by level number")

    @validator('thresholds')
    def validate_thresholds(cls, v, values):
        """Ensure thresholds are ascending"""
        for i in range(1, len(v)):
            if v[i] <= v[i-1]:
                raise ValueError("XP thresholds must be ascending")
        return v


class EnemyTier(BaseModel):
    """Configuration for an enemy difficulty tier"""
    health: int = Field(..., ge=1)
    damage: str = Field(..., pattern=r'^d\d+$', description="Damage die (e.g., d4, d6, d8)")


class MechanicsConfig(BaseModel):
    """Configuration for dice and combat mechanics"""
    dice: str = Field("d20", pattern=r'^d\d+$', description="Primary die type")
    success_threshold: int = Field(15, ge=1, description="Roll needed for full success")
    partial_threshold: int = Field(10, ge=1, description="Roll needed for partial success")
    enemy_tiers: dict[str, EnemyTier] = Field(
        default_factory=lambda: {
            "minion": EnemyTier(health=1, damage="d4"),
            "standard": EnemyTier(health=3, damage="d6"),
            "elite": EnemyTier(health=5, damage="d8"),
            "boss": EnemyTier(health=8, damage="d10")
        }
    )


class LocationTagDefinition(BaseModel):
    """A tag that can be applied to locations"""
    value: str = Field(..., pattern=r'^[a-z_]+$', max_length=30)
    label: str = Field(..., min_length=1, max_length=30)


class CampaignSystem(BaseModel):
    """Complete system configuration for a campaign - defines all game mechanics"""
    game_name: str = Field("Adventure", min_length=1, max_length=100, description="Name of the game/setting")
    player_context: str = Field("players", max_length=200, description="Who the players are (for DM prompt)")

    # Character creation
    species: list[SpeciesDefinition] = Field(..., min_items=2, max_items=20)
    stats: StatConfig

    # Resources
    resources: dict[str, ResourceConfig] = Field(
        default_factory=lambda: {
            "health": ResourceConfig(name="Health", symbol="♥", starting=5, max=10),
            "magic": ResourceConfig(name="Magic", symbol="✦", starting=3, max=6)
        }
    )

    # Economy
    currency: CurrencyConfig = Field(default_factory=CurrencyConfig)
    buildings: list[BuildingDefinition] = Field(default_factory=list)

    # Progression
    leveling: LevelingConfig

    # Combat & mechanics
    mechanics: MechanicsConfig = Field(default_factory=MechanicsConfig)

    # Campaign authoring options
    location_tags: list[LocationTagDefinition] = Field(
        default_factory=lambda: [
            LocationTagDefinition(value="exposition", label="Exposition"),
            LocationTagDefinition(value="ally", label="Ally"),
            LocationTagDefinition(value="boss", label="Boss"),
            LocationTagDefinition(value="treasure", label="Treasure"),
            LocationTagDefinition(value="danger", label="Danger"),
            LocationTagDefinition(value="secret", label="Secret"),
            LocationTagDefinition(value="rest", label="Rest"),
        ]
    )

    # Visual style
    art_style: str = Field(
        "fantasy illustration, detailed, atmospheric lighting",
        max_length=500,
        description="Style prompt for image generation"
    )

    # Narrative
    lore: str = Field("", max_length=5000, description="World lore and setting details")
    dm_tone: str = Field(
        "Be a fair and engaging narrator.",
        max_length=1000,
        description="Tone and personality guidance for the DM"
    )
    rules_addendum: str = Field("", max_length=2000, description="Additional campaign-specific rules")


# === Default System Templates ===

BLOOMBURROW_SYSTEM: dict = {
    "game_name": "Bloomburrow Adventures",
    "player_context": "a parent and their 7-year-old child",
    "species": [
        {"name": "Mousefolk", "trait_name": "Quick Paws", "trait_desc": "Once per run, take two actions in one turn"},
        {"name": "Rabbitfolk", "trait_name": "Warm Hearth", "trait_desc": "When you heal someone, they heal +1 extra Heart"},
        {"name": "Birdfolk", "trait_name": "Take Wing", "trait_desc": "Fly short distances"},
        {"name": "Batfolk", "trait_name": "Night Sight", "trait_desc": "See in darkness, sense hidden creatures"},
        {"name": "Frogfolk", "trait_name": "Read the Signs", "trait_desc": "Once per run, ask one yes/no question about what's ahead"},
        {"name": "Ratfolk", "trait_name": "Insect Companion", "trait_desc": "Your bug can scout, distract, or fetch small items"},
        {"name": "Otterfolk", "trait_name": "Slippery", "trait_desc": "Advantage on dodge and escape rolls"},
        {"name": "Lizardfolk", "trait_name": "Cold Blood, Hot Fury", "trait_desc": "After taking damage, your next attack deals +1d4"},
        {"name": "Squirrelfolk", "trait_name": "Bone Whisper", "trait_desc": "Once per run, ask a corpse one question"},
        {"name": "Raccoonfolk", "trait_name": "Junk Magic", "trait_desc": "Once per run, produce any mundane item from your bag"},
    ],
    "stats": {
        "names": ["Brave", "Clever", "Kind"],
        "colors": ["#c75050", "#5090c7", "#50c770"],
        "starting_pool": 5,
        "min_per_stat": 1,
        "max_per_stat": 3
    },
    "resources": {
        "health": {"name": "Hearts", "symbol": "♥", "starting": 5, "max": 7},
        "magic": {"name": "Threads", "symbol": "✦", "starting": 3, "max": 5}
    },
    "currency": {"name": "Seeds", "symbol": "🌰", "starting": 0},
    "buildings": [
        {"key": "generalStore", "name": "General Store", "cost": 0, "desc": "Basic items, healing berries"},
        {"key": "blacksmith", "name": "Blacksmith", "cost": 20, "desc": "Weapons, armor, repairs"},
        {"key": "weaversHut", "name": "Weaver's Hut", "cost": 20, "desc": "New weaves, Thread potions"},
        {"key": "inn", "name": "Inn", "cost": 15, "desc": "Rumors, recruit companions"},
        {"key": "shrine", "name": "Shrine", "cost": 30, "desc": "Respec stats, change traits"},
        {"key": "watchtower", "name": "Watchtower", "cost": 25, "desc": "See next run danger level"},
        {"key": "garden", "name": "Garden", "cost": 15, "desc": "Grow healing items"},
    ],
    "leveling": {
        "max_level": 5,
        "thresholds": [2, 4, 7, 11],
        "rewards": {
            "2": {"type": "stat", "desc": "+1 to one stat (max 4)"},
            "3": {"type": "health", "desc": "+1 Heart (now 6 total)"},
            "4": {"type": "choice", "desc": "New species ability OR +1 Thread"},
            "5": {"type": "stat", "desc": "+1 to one stat (max 5)"}
        }
    },
    "mechanics": {
        "dice": "d20",
        "success_threshold": 15,
        "partial_threshold": 10,
        "enemy_tiers": {
            "minion": {"health": 1, "damage": "d4"},
            "standard": {"health": 3, "damage": "d6"},
            "elite": {"health": 5, "damage": "d8"},
            "boss": {"health": 8, "damage": "d10"}
        }
    },
    "location_tags": [
        {"value": "exposition", "label": "Exposition"},
        {"value": "ally", "label": "Ally"},
        {"value": "boss", "label": "Boss"},
        {"value": "treasure", "label": "Treasure"},
        {"value": "danger", "label": "Danger"},
        {"value": "secret", "label": "Secret"},
        {"value": "rest", "label": "Rest"},
    ],
    "art_style": "rich detailed fantasy illustration, warm earthy tones, atmospheric lighting, woodland fantasy with anthropomorphic animals, Brian Froud meets Arthur Rackham style, textured painterly quality, deep shadows and golden highlights, cozy but grounded atmosphere",
    "lore": """The Valley is a vast wilderness where tiny animalfolk have built their civilizations among the roots and branches. Grass blades tower like forests, streams become rivers, and common boulders are mountains.

Ten species share the Valley: brave Mousefolk heroes, hospitable Rabbitfolk farmers, chivalrous Birdfolk knights, nocturnal Batfolk scholars, prophetic Frogfolk seers, secretive Ratfolk with their insect companions, playful Otterfolk storm-chasers, grumpy fire-worshipping Lizardfolk, death-positive Squirrelfolk, and wandering Raccoonfolk collectors.

Magic in the Valley is called Weaving—drawing power from the land itself. Anyone can learn it, though the most powerful forms have been sealed away since the old wars.

The Valley faces Calamity Beasts: ancient, massive creatures that transform the environment around them. Maha brings darkness, Eluge brings floods, Beza brings storms, Ygra causes earthquakes, Lumra creates blinding light, and Wildsear brings consuming flame.

Key settlements include Three Tree City (the capital, built in three ancient oaks), Fountainport (the trading hub by the great stream), and the Brambles (wild, dangerous, but full of secrets).""",
    "dm_tone": """You are the DM for Bloomburrow Adventures, a tabletop roguelike played by a parent and their 7-year-old child.

Keep the tone warm, storybook-like, and cozy but grounded. Never scary—thrilling is okay. Descriptions should be vivid but not gruesome. Combat should feel exciting, not violent.

Celebrate player creativity. If they try something clever, let it work (maybe with a roll). Default to "yes, and" whenever possible.

Keep responses to 2-4 paragraphs typically. Always end with a clear prompt for player action."""
}

DEFAULT_SYSTEM: dict = {
    "game_name": "Adventure",
    "player_context": "players",
    "species": [
        {"name": "Human", "trait_name": "Adaptable", "trait_desc": "Once per run, reroll any failed check"},
        {"name": "Elf", "trait_name": "Keen Senses", "trait_desc": "Automatically detect hidden doors and traps nearby"},
        {"name": "Dwarf", "trait_name": "Sturdy", "trait_desc": "Take 1 less damage from all sources (minimum 1)"},
    ],
    "stats": {
        "names": ["Strength", "Dexterity", "Wisdom"],
        "colors": ["#c75050", "#50c770", "#5090c7"],
        "starting_pool": 6,
        "min_per_stat": 1,
        "max_per_stat": 4
    },
    "resources": {
        "health": {"name": "Health", "symbol": "♥", "starting": 10, "max": 20},
        "magic": {"name": "Mana", "symbol": "✦", "starting": 5, "max": 10}
    },
    "currency": {"name": "Gold", "symbol": "🪙", "starting": 0},
    "buildings": [
        {"key": "shop", "name": "General Shop", "cost": 0, "desc": "Basic supplies and gear"},
        {"key": "smithy", "name": "Smithy", "cost": 50, "desc": "Weapons and armor"},
        {"key": "temple", "name": "Temple", "cost": 40, "desc": "Healing and blessings"},
        {"key": "tavern", "name": "Tavern", "cost": 30, "desc": "Rumors and recruits"},
    ],
    "leveling": {
        "max_level": 10,
        "thresholds": [10, 25, 50, 100, 175, 275, 400, 550, 750],
        "rewards": {
            "2": {"type": "stat", "desc": "+1 to one stat"},
            "3": {"type": "health", "desc": "+2 Health"},
            "4": {"type": "ability", "desc": "Learn a new ability"},
            "5": {"type": "stat", "desc": "+1 to one stat"},
            "6": {"type": "magic", "desc": "+2 Mana"},
            "7": {"type": "ability", "desc": "Learn a new ability"},
            "8": {"type": "stat", "desc": "+1 to one stat"},
            "9": {"type": "health", "desc": "+2 Health"},
            "10": {"type": "choice", "desc": "+2 to any stat OR new ability"}
        }
    },
    "mechanics": {
        "dice": "d20",
        "success_threshold": 15,
        "partial_threshold": 10,
        "enemy_tiers": {
            "minion": {"health": 2, "damage": "d4"},
            "standard": {"health": 6, "damage": "d6"},
            "elite": {"health": 12, "damage": "d8"},
            "boss": {"health": 20, "damage": "d10"}
        }
    },
    "location_tags": [
        {"value": "exposition", "label": "Exposition"},
        {"value": "ally", "label": "Ally"},
        {"value": "boss", "label": "Boss"},
        {"value": "treasure", "label": "Treasure"},
        {"value": "danger", "label": "Danger"},
        {"value": "secret", "label": "Secret"},
        {"value": "rest", "label": "Rest"},
    ],
    "art_style": "fantasy illustration, detailed, atmospheric lighting, medieval fantasy style",
    "lore": "",
    "dm_tone": "Be a fair and engaging narrator. Describe scenes vividly. Celebrate player creativity."
}


# === Authored Content Models ===

class NPC(BaseModel):
    """A key NPC in the campaign"""
    name: str = Field(..., min_length=1, max_length=50)
    species: str = Field(..., min_length=1, max_length=50, description="Species from campaign system config")
    role: str = Field(..., min_length=1, max_length=100, description="One phrase describing their role")
    wants: str = Field(..., min_length=1, max_length=200, description="What they're trying to achieve")
    secret: str = Field(..., min_length=1, max_length=300, description="What they know or are hiding")


class Location(BaseModel):
    """A key location in the campaign"""
    name: str = Field(..., min_length=1, max_length=50)
    vibe: str = Field(..., min_length=1, max_length=200, description="One sentence atmosphere")
    contains: list[str] = Field(..., min_items=1, description="Tags for what can be found here")


class RunTrigger(BaseModel):
    """When an anchor run becomes available"""
    type: RunTriggerType
    value: Optional[str] = None  # run_id for AFTER_RUN, number as string for counts
    
    @validator('value')
    def validate_value(cls, v, values):
        trigger_type = values.get('type')
        if trigger_type == RunTriggerType.START:
            return None
        if trigger_type in [RunTriggerType.AFTER_RUN] and not v:
            raise ValueError(f"Trigger type {trigger_type} requires a value")
        if trigger_type in [RunTriggerType.AFTER_RUNS_COUNT, RunTriggerType.THREAT_STAGE]:
            if not v or not v.isdigit():
                raise ValueError(f"Trigger type {trigger_type} requires a numeric value")
        return v


class AnchorRun(BaseModel):
    """A scripted story-beat run"""
    id: str = Field(..., pattern=r'^[a-z][a-z0-9_]*$', max_length=30, description="Unique identifier")
    hook: str = Field(..., min_length=10, max_length=300, description="The quest prompt shown to players")
    goal: str = Field(..., min_length=10, max_length=200, description="What success looks like")
    tone: Optional[str] = Field(None, max_length=100, description="Optional tone override")
    must_include: list[str] = Field(default_factory=list, max_items=5, description="Things AI must weave in")
    reveal: str = Field(..., min_length=5, max_length=300, description="What party learns on success")
    trigger: RunTrigger


class Threat(BaseModel):
    """The campaign's escalating threat"""
    name: str = Field(..., min_length=1, max_length=50)
    stages: list[str] = Field(..., min_items=3, max_items=6, description="Escalating threat states")
    advance_on: ThreatAdvanceTrigger
    
    @validator('stages')
    def validate_stages(cls, v):
        for stage in v:
            if len(stage) < 5 or len(stage) > 150:
                raise ValueError("Each stage must be 5-150 characters")
        return v


class CampaignContent(BaseModel):
    """The complete authored campaign content"""
    name: str = Field(..., min_length=1, max_length=50)
    premise: str = Field(..., min_length=20, max_length=500, description="2-4 sentences: what's happening, stakes, goal")
    tone: str = Field(..., min_length=3, max_length=100, description="Short phrase or comma-separated tags")
    
    threat: Threat
    npcs: list[NPC] = Field(..., min_items=2, max_items=10)
    locations: list[Location] = Field(..., min_items=2, max_items=10)
    anchor_runs: list[AnchorRun] = Field(..., min_items=3, max_items=10)
    filler_seeds: list[str] = Field(..., min_items=5, max_items=15)
    
    @validator('filler_seeds')
    def validate_filler_seeds(cls, v):
        for seed in v:
            if len(seed) < 10 or len(seed) > 150:
                raise ValueError("Each filler seed must be 10-150 characters")
        return v
    
    @validator('anchor_runs')
    def validate_anchor_run_references(cls, v, values):
        """Ensure AFTER_RUN triggers reference valid run IDs"""
        run_ids = {run.id for run in v}
        for run in v:
            if run.trigger.type == RunTriggerType.AFTER_RUN:
                if run.trigger.value not in run_ids:
                    raise ValueError(f"Run '{run.id}' references unknown run '{run.trigger.value}'")
                if run.trigger.value == run.id:
                    raise ValueError(f"Run '{run.id}' cannot trigger after itself")
        return v
    
    def has_start_run(self) -> bool:
        """Check if at least one run is available from start"""
        return any(run.trigger.type == RunTriggerType.START for run in self.anchor_runs)


# === Runtime State Models ===

class NPCState(BaseModel):
    """Runtime state for an NPC"""
    met: bool = False
    disposition: Literal["unknown", "friendly", "neutral", "suspicious", "hostile"] = "unknown"
    secrets_revealed: list[str] = Field(default_factory=list)


# === DM Prep Models ===

class DMPrepNote(BaseModel):
    """A note from the campaign author for DMs"""
    id: str = Field(..., description="Unique identifier for the note")
    content: str = Field(..., min_length=1, max_length=1000, description="The note content")
    category: Literal["reminder", "voice", "pacing", "secret", "general"] = Field(
        "general", description="Category of the note"
    )
    related_to: Optional[str] = Field(None, description="NPC name, location, or run_id this relates to")
    created_at: str = Field(..., description="ISO datetime when the note was created")


class DMPrepData(BaseModel):
    """Complete DM prep data for a campaign"""
    author_notes: list[DMPrepNote] = Field(default_factory=list, description="Manually added notes")
    conversation: list[dict] = Field(default_factory=list, description="Chat history with prep coach")
    pinned: list[DMPrepNote] = Field(default_factory=list, description="Insights pinned from conversation")
    last_accessed: Optional[str] = Field(None, description="ISO datetime of last access")


class CampaignState(BaseModel):
    """Runtime state tracking for a campaign"""
    threat_stage: int = 0
    runs_completed: int = 0
    anchor_runs_completed: list[str] = Field(default_factory=list)
    filler_seeds_used: list[int] = Field(default_factory=list)  # indices into filler_seeds
    current_run_id: Optional[str] = None
    current_run_type: Optional[Literal["anchor", "filler"]] = None
    facts_known: list[str] = Field(default_factory=list)
    npcs: dict[str, NPCState] = Field(default_factory=dict)
    locations_visited: list[str] = Field(default_factory=list)
    flags: dict[str, bool] = Field(default_factory=dict)
    
    def initialize_from_content(self, content: CampaignContent):
        """Set up NPC tracking from campaign content"""
        self.npcs = {
            npc.name.lower().replace(" ", "_"): NPCState()
            for npc in content.npcs
        }


# === Validation Helpers ===

class ValidationResult(BaseModel):
    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


def validate_campaign_content(data: dict) -> ValidationResult:
    """Validate campaign content and return detailed results"""
    errors = []
    warnings = []
    
    try:
        content = CampaignContent(**data)
        
        # Additional semantic checks
        if not content.has_start_run():
            errors.append("At least one anchor run must be available from start")
        
        # Check for NPC/location references in runs (warnings, not errors)
        npc_names = {npc.name.lower() for npc in content.npcs}
        location_names = {loc.name.lower() for loc in content.locations}
        
        for run in content.anchor_runs:
            # Check if must_include mentions NPCs or locations
            for item in run.must_include:
                item_lower = item.lower()
                has_npc_ref = any(name in item_lower for name in npc_names)
                has_loc_ref = any(name in item_lower for name in location_names)
                if not has_npc_ref and not has_loc_ref:
                    # This is fine, just a note
                    pass
        
        # Warn if filler seeds are sparse
        if len(content.filler_seeds) < len(content.anchor_runs):
            warnings.append("Consider adding more filler seeds for variety between anchor runs")
        
        return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=warnings)
        
    except Exception as e:
        error_str = str(e)
        # Parse pydantic errors into readable messages
        if "validation error" in error_str.lower():
            errors.append(error_str)
        else:
            errors.append(f"Validation failed: {error_str}")
        
        return ValidationResult(valid=False, errors=errors)


# === Serialization ===

def content_to_yaml(content: CampaignContent) -> str:
    """Serialize campaign content to YAML"""
    data = content.dict()
    # Convert enums to strings
    data['threat']['advance_on'] = content.threat.advance_on.value
    for run in data['anchor_runs']:
        run['trigger'] = {
            'type': run['trigger']['type'],
            'value': run['trigger']['value']
        }
    return yaml.dump(data, default_flow_style=False, allow_unicode=True, sort_keys=False)


def content_from_yaml(yaml_str: str) -> CampaignContent:
    """Deserialize campaign content from YAML"""
    data = yaml.safe_load(yaml_str)
    return CampaignContent(**data)


def content_to_json(content: CampaignContent) -> str:
    """Serialize campaign content to JSON"""
    return content.json(indent=2)


def content_from_json(json_str: str) -> CampaignContent:
    """Deserialize campaign content from JSON"""
    return CampaignContent.parse_raw(json_str)


# === Example Content ===

EXAMPLE_CAMPAIGN = {
    "name": "The Rotwood Blight",
    "premise": "A sickness spreads through the Brambles. Trees blacken, streams turn bitter, creatures flee toward Valley. The heroes must find the source before it reaches Three Tree City.",
    "tone": "creeping dread, mystery, hope at the edges",
    "threat": {
        "name": "The Blight",
        "stages": [
            "Brambles creatures appear near town",
            "First farm fields wither",
            "Sickness reaches the outskirts",
            "Three Tree City quarantined",
            "The Rotwood claims Valley"
        ],
        "advance_on": "run_failed"
    },
    "npcs": [
        {
            "name": "Bramblewick",
            "species": "Ratfolk",
            "role": "Hermit scholar in the Brambles",
            "wants": "Protect his insect colony",
            "secret": "Knows the blight started at an old shrine"
        },
        {
            "name": "Captain Thornfeather",
            "species": "Birdfolk",
            "role": "Guard captain, blocks Brambles access",
            "wants": "Keep citizens safe",
            "secret": "Lost a patrol to the blight, covering it up"
        },
        {
            "name": "Old Mossback",
            "species": "Frogfolk",
            "role": "Retired augur by the marsh",
            "wants": "To be left alone",
            "secret": "Had a vision of the blight years ago, ignored it"
        }
    ],
    "locations": [
        {
            "name": "The Withered Clearing",
            "vibe": "Dead center of the blight, air thick and wrong",
            "contains": ["boss", "danger", "secret"]
        },
        {
            "name": "Bramblewick's Hollow",
            "vibe": "Cozy burrow full of scrolls and clicking insects",
            "contains": ["exposition", "ally"]
        },
        {
            "name": "The Sunken Patrol Camp",
            "vibe": "Abandoned tents, claw marks, eerie silence",
            "contains": ["treasure", "danger", "secret"]
        }
    ],
    "anchor_runs": [
        {
            "id": "first_signs",
            "hook": "A farmer's child is sick. The healer needs bramble-root, but gatherers have gone missing.",
            "goal": "Retrieve bramble-root from the Brambles edge",
            "must_include": [
                "Signs of the blight (blackened leaves, bitter smell)",
                "At least one creature fleeing the Brambles"
            ],
            "reveal": "The Brambles themselves are sick — this isn't normal",
            "trigger": {"type": "start"}
        },
        {
            "id": "find_the_scholar",
            "hook": "Rumors speak of a ratfolk hermit who knows the old Brambles paths.",
            "goal": "Find Bramblewick and earn his trust",
            "must_include": [
                "Bramblewick's insect companions",
                "His paranoia about outsiders"
            ],
            "reveal": "There's a shrine at the heart of the blight. It can be reached.",
            "trigger": {"type": "after_run", "value": "first_signs"}
        },
        {
            "id": "the_lost_patrol",
            "hook": "Captain Thornfeather reluctantly asks for help finding his missing guards.",
            "goal": "Discover what happened to the patrol",
            "must_include": [
                "The Sunken Patrol Camp",
                "Evidence of what attacked them"
            ],
            "reveal": "The blight creates corrupted creatures. Thornfeather knows more than he's saying.",
            "trigger": {"type": "after_runs_count", "value": "2"}
        },
        {
            "id": "heart_of_the_rot",
            "hook": "Bramblewick has mapped a path to the shrine. It's now or never.",
            "goal": "Reach the shrine and stop the blight at its source",
            "must_include": [
                "The Withered Clearing",
                "Boss encounter with the blight's heart"
            ],
            "reveal": "The blight is cleansed. Valley is saved.",
            "trigger": {"type": "threat_stage", "value": "3"}
        }
    ],
    "filler_seeds": [
        "Escort refugees fleeing the Brambles to safety",
        "A blighted creature attacks the town walls — defend!",
        "Recover supplies from an abandoned farm at the Brambles edge",
        "Old Mossback has information, but wants something in return",
        "Strange lights in the Brambles at night — investigate",
        "A merchant's cart was ambushed; salvage what you can",
        "Thornfeather's guards are turning back travelers; find another way"
    ]
}


if __name__ == "__main__":
    # Test validation
    result = validate_campaign_content(EXAMPLE_CAMPAIGN)
    print(f"Valid: {result.valid}")
    if result.errors:
        print(f"Errors: {result.errors}")
    if result.warnings:
        print(f"Warnings: {result.warnings}")
    
    # Test serialization
    content = CampaignContent(**EXAMPLE_CAMPAIGN)
    print("\n--- YAML Output ---")
    print(content_to_yaml(content))
