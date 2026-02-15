"""
Tests for town, character, and campaign CRUD routes
"""

import pytest


# === Town routes ===


class TestTown:
    def test_get_town(self, client, campaign_dir):
        resp = client.get("/campaigns/test_campaign/town")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Meadowdale"
        assert data["seeds"] == 25

    def test_update_town_seeds(self, client, campaign_dir):
        resp = client.put(
            "/campaigns/test_campaign/town",
            json={"seeds": 50},
        )
        assert resp.status_code == 200
        assert resp.json()["seeds"] == 50

    def test_update_town_name(self, client, campaign_dir):
        resp = client.put(
            "/campaigns/test_campaign/town",
            json={"name": "New Meadowdale"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Meadowdale"

    def test_update_town_building(self, client, campaign_dir):
        resp = client.put(
            "/campaigns/test_campaign/town",
            json={"buildings": {"blacksmith": True}},
        )
        assert resp.status_code == 200
        assert resp.json()["buildings"]["blacksmith"] is True
        # Other buildings should remain unchanged
        assert resp.json()["buildings"]["generalStore"] is True
        assert resp.json()["buildings"]["inn"] is False

    def test_get_nonexistent_town_returns_default(self, client, data_dir):
        """When no town.json exists, should create a default"""
        import os
        cdir = data_dir / "campaigns" / "empty_campaign"
        cdir.mkdir(parents=True)

        resp = client.get("/campaigns/empty_campaign/town")
        assert resp.status_code == 200
        data = resp.json()
        assert data["seeds"] == 0


# === Character routes ===


class TestCharacters:
    def test_get_characters(self, client, campaign_dir):
        resp = client.get("/campaigns/test_campaign/characters")
        assert resp.status_code == 200
        chars = resp.json()
        assert len(chars) == 2
        assert chars[0]["name"] == "Pip"
        assert chars[1]["name"] == "Clover"

    def test_create_character(self, client, campaign_dir):
        resp = client.post(
            "/campaigns/test_campaign/characters",
            json={
                "name": "Oakley",
                "species": "Squirrelfolk",
                "stats": {"Brave": 3, "Clever": 1, "Kind": 1},
                "maxHearts": 5,
                "maxThreads": 3,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Oakley"
        assert data["id"] is not None

        # Verify persisted
        chars = client.get("/campaigns/test_campaign/characters").json()
        assert len(chars) == 3

    def test_get_single_character(self, client, campaign_dir):
        resp = client.get("/campaigns/test_campaign/characters/char_001")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Pip"

    def test_get_nonexistent_character_404(self, client, campaign_dir):
        resp = client.get("/campaigns/test_campaign/characters/char_999")
        assert resp.status_code == 404

    def test_update_character(self, client, campaign_dir):
        resp = client.put(
            "/campaigns/test_campaign/characters/char_001",
            json={"level": 2, "xp": 5},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["level"] == 2
        assert data["xp"] == 5

    def test_update_character_stats_merge(self, client, campaign_dir):
        resp = client.put(
            "/campaigns/test_campaign/characters/char_001",
            json={"stats": {"Brave": 3}},
        )
        assert resp.status_code == 200
        stats = resp.json()["stats"]
        assert stats["Brave"] == 3
        assert stats["Clever"] == 2  # unchanged

    def test_delete_character(self, client, campaign_dir):
        resp = client.delete("/campaigns/test_campaign/characters/char_002")
        assert resp.status_code == 200

        chars = client.get("/campaigns/test_campaign/characters").json()
        assert len(chars) == 1
        assert chars[0]["id"] == "char_001"


# === Stash routes ===


class TestStash:
    def test_get_empty_stash(self, client, campaign_dir):
        resp = client.get("/campaigns/test_campaign/stash")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_update_stash_via_file(self, client, campaign_dir):
        """Write stash directly and verify GET reads it back"""
        import json
        stash_path = campaign_dir / "stash.json"
        items = [{"name": "Healing Berries", "quantity": 3}, {"name": "Rope", "quantity": 1}]
        with open(str(stash_path), "w") as f:
            json.dump({"items": items}, f)

        resp = client.get("/campaigns/test_campaign/stash")
        assert resp.status_code == 200
        assert len(resp.json()) == 2


# === Campaign CRUD ===


class TestCampaignCRUD:
    def test_get_campaigns_empty(self, client, data_dir):
        resp = client.get("/campaigns")
        assert resp.status_code == 200
        data = resp.json()
        assert data["campaigns"] == []

    def test_create_campaign(self, client, data_dir):
        resp = client.post(
            "/campaigns",
            json={"name": "Test Adventure", "description": "A test campaign"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test Adventure"
        assert data["id"] is not None
        assert data["isDraft"] is True

    def test_create_and_list_campaign(self, client, data_dir):
        client.post("/campaigns", json={"name": "Adventure One"})
        client.post("/campaigns", json={"name": "Adventure Two"})

        resp = client.get("/campaigns")
        campaigns = resp.json()["campaigns"]
        assert len(campaigns) == 2

    def test_root_endpoint(self, client, data_dir):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
