"""
Shared test fixtures for backend tests
"""

import json
import os
import sys

import pytest

# Add backend to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from campaign_schema import (
    EXAMPLE_CAMPAIGN,
    BLOOMBURROW_SYSTEM,
    CampaignContent,
    CampaignState,
    CampaignSystem,
)


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    """Create temp data directory and patch config.DATA_DIR"""
    d = tmp_path / "data"
    d.mkdir()
    (d / "images").mkdir()
    (d / "campaigns").mkdir()

    import config
    import helpers
    monkeypatch.setattr(config, "DATA_DIR", str(d))
    monkeypatch.setattr(config, "IMAGES_DIR", str(d / "images"))
    # helpers imports DATA_DIR at module level, so patch it there too
    monkeypatch.setattr(helpers, "DATA_DIR", str(d))
    return d


@pytest.fixture
def sample_content():
    """Return a CampaignContent built from EXAMPLE_CAMPAIGN"""
    return CampaignContent(**EXAMPLE_CAMPAIGN)


@pytest.fixture
def sample_state():
    """Return a CampaignState with some progress"""
    return CampaignState(
        threat_stage=1,
        runs_completed=2,
        anchor_runs_completed=["first_signs"],
        filler_seeds_used=[0],
        facts_known=["The Brambles themselves are sick — this isn't normal"],
        npcs={
            "bramblewick": {"met": True, "disposition": "friendly", "secrets_revealed": []},
            "captain_thornfeather": {"met": False, "disposition": "unknown", "secrets_revealed": []},
            "old_mossback": {"met": False, "disposition": "unknown", "secrets_revealed": []},
        },
        locations_visited=["The Withered Clearing"],
    )


@pytest.fixture
def sample_system():
    """Return a CampaignSystem with Bloomburrow defaults"""
    return CampaignSystem(**BLOOMBURROW_SYSTEM)


@pytest.fixture
def campaign_dir(data_dir, sample_content, sample_state):
    """Create a fully populated test campaign directory"""
    cdir = data_dir / "campaigns" / "test_campaign"
    cdir.mkdir(parents=True)

    # roster.json
    roster = {
        "characters": [
            {
                "id": "char_001",
                "name": "Pip",
                "species": "Mousefolk",
                "level": 1,
                "xp": 0,
                "stats": {"Brave": 2, "Clever": 2, "Kind": 1},
                "maxHearts": 5,
                "maxThreads": 3,
                "gear": ["Tiny Sword"],
                "weavesKnown": [],
                "notes": "",
            },
            {
                "id": "char_002",
                "name": "Clover",
                "species": "Rabbitfolk",
                "level": 1,
                "xp": 0,
                "stats": {"Brave": 1, "Clever": 1, "Kind": 3},
                "maxHearts": 5,
                "maxThreads": 3,
                "gear": ["Healing Herbs"],
                "weavesKnown": [],
                "notes": "",
            },
        ]
    }

    # town.json
    town = {
        "name": "Meadowdale",
        "seeds": 25,
        "buildings": {
            "generalStore": True,
            "blacksmith": False,
            "weaversHut": False,
            "inn": False,
            "shrine": False,
            "watchtower": False,
            "garden": False,
        },
    }

    # current_session.json (inactive)
    session = {"active": False}

    # system.json
    system = BLOOMBURROW_SYSTEM

    # Write all files
    for filename, obj in [
        ("roster.json", roster),
        ("town.json", town),
        ("current_session.json", session),
        ("system.json", system),
        ("campaign.json", sample_content.dict()),
        ("state.json", sample_state.dict()),
    ]:
        with open(str(cdir / filename), "w") as f:
            json.dump(obj, f, indent=2)

    return cdir


@pytest.fixture
def client(data_dir):
    """FastAPI TestClient with DATA_DIR patched to temp"""
    from fastapi.testclient import TestClient
    from main import app

    return TestClient(app)
