"""
Tests for session lifecycle and run management routes via TestClient
"""

import json

import pytest


# === Session start ===


class TestSessionStart:
    def test_start_session(self, client, campaign_dir):
        resp = client.post(
            "/campaigns/test_campaign/session/start",
            json={"quest": "Find the herbs", "location": "Brambles", "partyIds": ["char_001"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["active"] is True
        assert data["quest"] == "Find the herbs"
        assert len(data["party"]) == 1
        assert data["party"][0]["name"] == "Pip"
        assert data["party"][0]["currentHearts"] == 5

    def test_start_session_full_party(self, client, campaign_dir):
        resp = client.post(
            "/campaigns/test_campaign/session/start",
            json={"quest": "Find the herbs", "location": "Brambles", "partyIds": ["char_001", "char_002"]},
        )
        assert resp.status_code == 200
        assert len(resp.json()["party"]) == 2

    def test_start_session_empty_party(self, client, campaign_dir):
        resp = client.post(
            "/campaigns/test_campaign/session/start",
            json={"quest": "Scout ahead", "location": "Forest", "partyIds": []},
        )
        assert resp.status_code == 200
        assert resp.json()["party"] == []

    def test_start_session_unknown_char_ignored(self, client, campaign_dir):
        resp = client.post(
            "/campaigns/test_campaign/session/start",
            json={"quest": "Go", "location": "Here", "partyIds": ["nonexistent"]},
        )
        assert resp.status_code == 200
        assert resp.json()["party"] == []


# === Session get ===


class TestSessionGet:
    def test_get_inactive_session(self, client, campaign_dir):
        resp = client.get("/campaigns/test_campaign/session")
        assert resp.status_code == 200
        assert resp.json()["active"] is False

    def test_get_active_session(self, client, campaign_dir):
        client.post(
            "/campaigns/test_campaign/session/start",
            json={"quest": "Test", "location": "Here", "partyIds": ["char_001"]},
        )
        resp = client.get("/campaigns/test_campaign/session")
        assert resp.status_code == 200
        assert resp.json()["active"] is True


# === Session update ===


class TestSessionUpdate:
    def _start(self, client):
        client.post(
            "/campaigns/test_campaign/session/start",
            json={"quest": "Test", "location": "Here", "partyIds": ["char_001"]},
        )

    def test_update_run_state(self, client, campaign_dir):
        self._start(client)
        resp = client.put(
            "/campaigns/test_campaign/session/update",
            json={"runState": "exploration"},
        )
        assert resp.status_code == 200
        assert resp.json()["runState"] == "exploration"

    def test_update_room_number(self, client, campaign_dir):
        self._start(client)
        resp = client.put(
            "/campaigns/test_campaign/session/update",
            json={"roomNumber": 2},
        )
        assert resp.status_code == 200
        assert resp.json()["roomNumber"] == 2

    def test_update_no_active_session(self, client, campaign_dir):
        resp = client.put(
            "/campaigns/test_campaign/session/update",
            json={"runState": "exploration"},
        )
        assert resp.status_code == 400


# === Session end ===


class TestSessionEnd:
    def _start(self, client):
        client.post(
            "/campaigns/test_campaign/session/start",
            json={"quest": "Test", "location": "Here", "partyIds": ["char_001"]},
        )

    def test_end_victory(self, client, campaign_dir):
        self._start(client)
        resp = client.post(
            "/campaigns/test_campaign/session/end",
            json={"outcome": "victory"},
        )
        assert resp.status_code == 200
        assert resp.json()["outcome"] == "victory"

        # Session should be inactive
        session = client.get("/campaigns/test_campaign/session").json()
        assert session["active"] is False

    def test_end_victory_awards_xp(self, client, campaign_dir):
        self._start(client)
        client.post("/campaigns/test_campaign/session/end", json={"outcome": "victory"})

        chars = client.get("/campaigns/test_campaign/characters").json()
        pip = next(c for c in chars if c["id"] == "char_001")
        assert pip["xp"] == 2  # 1 base + 1 victory bonus

    def test_end_retreat_awards_partial_xp(self, client, campaign_dir):
        self._start(client)
        client.post("/campaigns/test_campaign/session/end", json={"outcome": "retreat"})

        chars = client.get("/campaigns/test_campaign/characters").json()
        pip = next(c for c in chars if c["id"] == "char_001")
        assert pip["xp"] == 1

    def test_end_failed(self, client, campaign_dir):
        self._start(client)
        resp = client.post(
            "/campaigns/test_campaign/session/end",
            json={"outcome": "failed"},
        )
        assert resp.status_code == 200
        session = client.get("/campaigns/test_campaign/session").json()
        assert session["active"] is False


# === Run lifecycle (campaign_content routes) ===


class TestRunLifecycle:
    def test_get_available_runs(self, client, campaign_dir):
        resp = client.get("/campaigns/test_campaign/available-runs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["hasContent"] is True
        # first_signs already completed in sample_state, find_the_scholar should be available
        anchor_ids = [a["id"] for a in data["anchors"]]
        assert "find_the_scholar" in anchor_ids
        assert "first_signs" not in anchor_ids

    def test_get_next_run(self, client, campaign_dir):
        resp = client.get("/campaigns/test_campaign/next-run")
        assert resp.status_code == 200
        data = resp.json()
        assert data["hasContent"] is True
        assert data["type"] == "anchor"

    def test_start_anchor_run(self, client, campaign_dir):
        resp = client.post(
            "/campaigns/test_campaign/start-run?run_type=anchor&run_id=find_the_scholar",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "run" in data
        assert "campaign_context" in data

    def test_complete_run_victory(self, client, campaign_dir):
        # Start a run first
        client.post("/campaigns/test_campaign/start-run?run_type=anchor&run_id=find_the_scholar")

        resp = client.post(
            "/campaigns/test_campaign/complete-run",
            json={"outcome": "victory", "facts_learned": [], "npcs_met": ["Bramblewick"], "locations_visited": []},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["runs_completed"] == 3  # sample_state has 2

    def test_complete_run_failed_advances_threat(self, client, campaign_dir):
        # Example campaign uses run_failed for threat advancement
        client.post("/campaigns/test_campaign/start-run?run_type=anchor&run_id=find_the_scholar")

        resp = client.post(
            "/campaigns/test_campaign/complete-run",
            json={"outcome": "failed", "facts_learned": [], "npcs_met": [], "locations_visited": []},
        )
        assert resp.status_code == 200
        data = resp.json()
        # threat_stage should increment from 1 to 2
        assert data["threat_stage"] == 2

    def test_complete_run_no_active_run_400(self, client, campaign_dir):
        resp = client.post(
            "/campaigns/test_campaign/complete-run",
            json={"outcome": "victory", "facts_learned": [], "npcs_met": [], "locations_visited": []},
        )
        # sample_state has no current_run_id
        assert resp.status_code == 400

    def test_get_campaign_state(self, client, campaign_dir):
        resp = client.get("/campaigns/test_campaign/state")
        assert resp.status_code == 200
        data = resp.json()
        assert data["threat_stage"] == 1
        assert data["runs_completed"] == 2

    def test_reset_campaign_state(self, client, campaign_dir):
        resp = client.post("/campaigns/test_campaign/state/reset")
        assert resp.status_code == 200

        state = client.get("/campaigns/test_campaign/state").json()
        assert state["threat_stage"] == 0
        assert state["runs_completed"] == 0
        assert state["anchor_runs_completed"] == []


# === Dice rolling ===


class TestDiceRoll:
    def test_d20_success(self, client, campaign_dir):
        resp = client.post(
            "/campaigns/test_campaign/dice/roll",
            json={"dieType": "d20", "result": 17, "modifier": 0, "purpose": "attack"},
        )
        assert resp.status_code == 200
        assert resp.json()["threshold"] == "success"

    def test_d20_partial(self, client, campaign_dir):
        resp = client.post(
            "/campaigns/test_campaign/dice/roll",
            json={"dieType": "d20", "result": 12, "modifier": 0},
        )
        assert resp.json()["threshold"] == "partial"

    def test_d20_failure(self, client, campaign_dir):
        resp = client.post(
            "/campaigns/test_campaign/dice/roll",
            json={"dieType": "d20", "result": 5, "modifier": 0},
        )
        assert resp.json()["threshold"] == "failure"

    def test_d6_no_threshold(self, client, campaign_dir):
        resp = client.post(
            "/campaigns/test_campaign/dice/roll",
            json={"dieType": "d6", "result": 4},
        )
        assert resp.json()["threshold"] is None
