"""
Tests for pure logic functions in campaign_logic.py
"""

import pytest
from campaign_schema import (
    CampaignContent,
    CampaignState,
    NPCState,
    RunTriggerType,
    EXAMPLE_CAMPAIGN,
)
from campaign_logic import (
    check_trigger,
    get_available_runs,
    select_next_run,
    build_dm_context,
)


# === check_trigger ===


class TestCheckTrigger:
    """Tests for check_trigger(trigger, state)"""

    def _make_trigger(self, type_: str, value=None):
        from campaign_schema import RunTrigger
        return RunTrigger(type=type_, value=value)

    def test_start_trigger_always_true(self):
        trigger = self._make_trigger("start")
        state = CampaignState()
        assert check_trigger(trigger, state) is True

    def test_after_run_trigger_met(self):
        trigger = self._make_trigger("after_run", "first_signs")
        state = CampaignState(anchor_runs_completed=["first_signs"])
        assert check_trigger(trigger, state) is True

    def test_after_run_trigger_not_met(self):
        trigger = self._make_trigger("after_run", "first_signs")
        state = CampaignState(anchor_runs_completed=[])
        assert check_trigger(trigger, state) is False

    def test_after_runs_count_met(self):
        trigger = self._make_trigger("after_runs_count", "2")
        state = CampaignState(runs_completed=3)
        assert check_trigger(trigger, state) is True

    def test_after_runs_count_exact(self):
        trigger = self._make_trigger("after_runs_count", "2")
        state = CampaignState(runs_completed=2)
        assert check_trigger(trigger, state) is True

    def test_after_runs_count_not_met(self):
        trigger = self._make_trigger("after_runs_count", "2")
        state = CampaignState(runs_completed=1)
        assert check_trigger(trigger, state) is False

    def test_threat_stage_met(self):
        trigger = self._make_trigger("threat_stage", "3")
        state = CampaignState(threat_stage=3)
        assert check_trigger(trigger, state) is True

    def test_threat_stage_exceeded(self):
        trigger = self._make_trigger("threat_stage", "3")
        state = CampaignState(threat_stage=4)
        assert check_trigger(trigger, state) is True

    def test_threat_stage_not_met(self):
        trigger = self._make_trigger("threat_stage", "3")
        state = CampaignState(threat_stage=2)
        assert check_trigger(trigger, state) is False


# === get_available_runs ===


class TestGetAvailableRuns:
    """Tests for get_available_runs(content, state)"""

    def test_start_run_available_initially(self, sample_content):
        state = CampaignState()
        result = get_available_runs(sample_content, state)
        anchor_ids = [r.id for r in result["anchors"]]
        assert "first_signs" in anchor_ids

    def test_completed_run_not_available(self, sample_content):
        state = CampaignState(anchor_runs_completed=["first_signs"])
        result = get_available_runs(sample_content, state)
        anchor_ids = [r.id for r in result["anchors"]]
        assert "first_signs" not in anchor_ids

    def test_after_run_unlocked(self, sample_content):
        state = CampaignState(anchor_runs_completed=["first_signs"])
        result = get_available_runs(sample_content, state)
        anchor_ids = [r.id for r in result["anchors"]]
        assert "find_the_scholar" in anchor_ids

    def test_after_run_locked(self, sample_content):
        state = CampaignState()
        result = get_available_runs(sample_content, state)
        anchor_ids = [r.id for r in result["anchors"]]
        assert "find_the_scholar" not in anchor_ids

    def test_runs_count_unlocked(self, sample_content):
        state = CampaignState(runs_completed=2)
        result = get_available_runs(sample_content, state)
        anchor_ids = [r.id for r in result["anchors"]]
        assert "the_lost_patrol" in anchor_ids

    def test_threat_stage_locked(self, sample_content):
        state = CampaignState(threat_stage=1)
        result = get_available_runs(sample_content, state)
        anchor_ids = [r.id for r in result["anchors"]]
        assert "heart_of_the_rot" not in anchor_ids

    def test_threat_stage_unlocked(self, sample_content):
        state = CampaignState(threat_stage=3)
        result = get_available_runs(sample_content, state)
        anchor_ids = [r.id for r in result["anchors"]]
        assert "heart_of_the_rot" in anchor_ids

    def test_fillers_available(self, sample_content):
        state = CampaignState()
        result = get_available_runs(sample_content, state)
        assert len(result["fillers"]) == len(sample_content.filler_seeds)

    def test_used_fillers_excluded(self, sample_content):
        state = CampaignState(filler_seeds_used=[0, 2])
        result = get_available_runs(sample_content, state)
        filler_indices = [f["index"] for f in result["fillers"]]
        assert 0 not in filler_indices
        assert 2 not in filler_indices
        assert 1 in filler_indices


# === select_next_run ===


class TestSelectNextRun:
    """Tests for select_next_run(content, state)"""

    def test_selects_anchor_when_available(self, sample_content):
        state = CampaignState()
        result = select_next_run(sample_content, state)
        assert result["type"] == "anchor"
        assert result["id"] == "first_signs"

    def test_selects_filler_when_no_anchors(self, sample_content):
        # Complete all anchors + make the remaining ones untriggerable
        state = CampaignState(
            anchor_runs_completed=["first_signs", "find_the_scholar", "the_lost_patrol", "heart_of_the_rot"],
        )
        result = select_next_run(sample_content, state)
        assert result["type"] == "filler"
        assert "hook" in result

    def test_returns_none_when_exhausted(self, sample_content):
        state = CampaignState(
            anchor_runs_completed=["first_signs", "find_the_scholar", "the_lost_patrol", "heart_of_the_rot"],
            filler_seeds_used=list(range(len(sample_content.filler_seeds))),
        )
        result = select_next_run(sample_content, state)
        assert result["type"] == "none"

    def test_anchor_includes_required_fields(self, sample_content):
        state = CampaignState()
        result = select_next_run(sample_content, state)
        assert "hook" in result
        assert "goal" in result
        assert "tone" in result
        assert "must_include" in result
        assert "reveal" in result


# === build_dm_context ===


class TestBuildDmContext:
    """Tests for build_dm_context(content, state, run_details)"""

    def test_includes_campaign_context(self, sample_content, sample_state):
        run_details = {"type": "anchor", "id": "find_the_scholar"}
        result = build_dm_context(sample_content, sample_state, run_details)
        assert result["campaign_context"]["name"] == sample_content.name
        assert result["campaign_context"]["premise"] == sample_content.premise

    def test_includes_run(self, sample_content, sample_state):
        run_details = {"type": "anchor", "id": "find_the_scholar", "hook": "test"}
        result = build_dm_context(sample_content, sample_state, run_details)
        assert result["run"] == run_details

    def test_party_knows_contains_facts(self, sample_content, sample_state):
        run_details = {"type": "anchor", "id": "find_the_scholar"}
        result = build_dm_context(sample_content, sample_state, run_details)
        assert sample_state.facts_known[0] in result["party_knows"]

    def test_threat_description(self, sample_content, sample_state):
        run_details = {"type": "anchor", "id": "find_the_scholar"}
        result = build_dm_context(sample_content, sample_state, run_details)
        assert result["threat_stage"] == sample_state.threat_stage
        assert result["threat_name"] == sample_content.threat.name
        expected_desc = sample_content.threat.stages[sample_state.threat_stage]
        assert result["threat_description"] == expected_desc

    def test_npc_states_included(self, sample_content, sample_state):
        run_details = {"type": "anchor", "id": "find_the_scholar"}
        result = build_dm_context(sample_content, sample_state, run_details)
        assert "Bramblewick" in result["npc_states"]
        assert result["npc_states"]["Bramblewick"]["met"] is True

    def test_unrevealed_secrets_in_party_does_not_know(self, sample_content):
        state = CampaignState()
        state.initialize_from_content(sample_content)
        run_details = {"type": "anchor", "id": "first_signs"}
        result = build_dm_context(sample_content, state, run_details)
        assert len(result["party_does_not_know"]) > 0

    def test_locations_included(self, sample_content, sample_state):
        run_details = {"type": "anchor", "id": "find_the_scholar"}
        result = build_dm_context(sample_content, sample_state, run_details)
        loc_names = [loc["name"] for loc in result["campaign_context"]["locations"]]
        assert "The Withered Clearing" in loc_names
