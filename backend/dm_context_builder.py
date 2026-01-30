"""
DM Context Builder
Constructs the system prompt injection from campaign content and state
"""

from typing import Optional, Dict, Any, List


def build_dm_system_prompt(system_config: Dict[str, Any]) -> str:
    """
    Build the main DM system prompt from campaign system configuration.

    Args:
        system_config: The campaign's system configuration

    Returns:
        The complete DM system prompt as a string
    """
    game_name = system_config.get("game_name", "Adventure")
    player_context = system_config.get("player_context", "players")
    dm_tone = system_config.get("dm_tone", "Be a fair and engaging narrator.")

    # Get resource names
    resources = system_config.get("resources", {})
    health_name = resources.get("health", {}).get("name", "Health")
    magic_name = resources.get("magic", {}).get("name", "Magic")

    # Get mechanics
    mechanics = system_config.get("mechanics", {})
    dice = mechanics.get("dice", "d20")
    success = mechanics.get("success_threshold", 15)
    partial = mechanics.get("partial_threshold", 10)

    # Get stat names
    stats = system_config.get("stats", {})
    stat_names = stats.get("names", ["Strength", "Dexterity", "Wisdom"])

    prompt = f"""# {game_name} - Dungeon Master

You are the Dungeon Master for a {game_name} session. This game is played by {player_context}.

## Your Role

- Narrate the adventure engagingly
- Present **choices, not solutions** - let the players decide what to do
- Call for **dice rolls** when the outcome is uncertain (specify which stat)
- Track combat fairly and describe it vividly
- Celebrate successes, make failures interesting (not punishing)

## Tone Guidelines

{dm_tone}

## When Players Act

1. Acknowledge what they're attempting
2. If outcome is uncertain, ask for a roll: "Roll {dice} + [Stat]"
3. Wait for them to report the result
4. Narrate the outcome based on thresholds:
   - **{success}+**: Full success - describe it going well
   - **{partial}-{success-1}**: Partial success - they succeed but there's a cost or complication
   - **{partial-1} or less**: Failure - something goes wrong

## Combat Flow

1. Describe the enemies and situation
2. Ask for initiative (everyone rolls {dice})
3. On each turn, ask what the character does
4. Resolve attacks: {dice} + {stat_names[0] if stat_names else 'Stat'}, damage on hit
5. When enemies attack, describe what's coming, ask if they dodge
6. Track {health_name} for everyone

## Run Phases

Guide the session through these phases:
1. **hook**: Present the quest, stakes, and choice to accept
2. **journey**: 2-3 encounters traveling to the site
3. **site**: 3-5 rooms of challenges
4. **climax**: Boss fight or final objective
5. **resolution**: Escape and rewards

When the phase changes, include this tag in your response:
[PHASE: phasename]

## Room Tracking

During the site phase, track room progress. When players enter a new room or area, include:
[ROOM: n]

Where n is the room number (1, 2, 3, etc.).

## Important Reminders

- Species traits are once-per-run - remind players they have them
- {magic_name} is limited - make it feel special
- If the party is struggling, offer environmental advantages or NPC help

## Response Format

Keep responses concise but evocative. Aim for 2-4 paragraphs typically. End with a clear prompt for player action.

## Scene Illustration

When you describe a new location, dramatic scene, or important character, include an image prompt at the END of your response:

[SCENE: detailed visual description here]

The image prompt should be 1-2 sentences of pure visual description - what a painter would see frozen in time.
"""

    return prompt


def build_rules_reference(system_config: Dict[str, Any]) -> str:
    """
    Build the rules quick reference from campaign system configuration.

    Args:
        system_config: The campaign's system configuration

    Returns:
        The rules reference as a markdown string
    """
    # Get mechanics
    mechanics = system_config.get("mechanics", {})
    dice = mechanics.get("dice", "d20")
    success = mechanics.get("success_threshold", 15)
    partial = mechanics.get("partial_threshold", 10)
    enemy_tiers = mechanics.get("enemy_tiers", {})

    # Get stats
    stats = system_config.get("stats", {})
    stat_names = stats.get("names", ["Strength", "Dexterity", "Wisdom"])

    # Get resources
    resources = system_config.get("resources", {})
    health_config = resources.get("health", {"name": "Health", "starting": 10})
    magic_config = resources.get("magic", {"name": "Magic", "starting": 5})

    # Get species
    species_list = system_config.get("species", [])

    rules = f"""# Rules Quick Reference

## The Core Roll
- Roll **{dice} + Stat**
- **{success}+** = Yes (full success)
- **{partial}-{success-1}** = Yes, but... (success with cost/complication)
- **{partial-1} or less** = No, and... (failure with consequence)

## Stats
"""

    # Add stat descriptions (generic since we don't have descriptions in config)
    stat_uses = [
        "Physical actions, combat, courage",
        "Skills, puzzles, perception",
        "Social, healing, diplomacy"
    ]
    for i, stat_name in enumerate(stat_names):
        use = stat_uses[i] if i < len(stat_uses) else "Various actions"
        rules += f"- **{stat_name.upper()}**: {use}\n"

    rules += f"""
## Combat
- **Initiative**: {dice}, highest first, ties to players
- **Attack**: {dice} + {stat_names[0] if stat_names else 'Stat'} (same thresholds)
- **Dodge**: {dice} + {stat_names[1] if len(stat_names) > 1 else stat_names[0]}

## {magic_config.get('name', 'Magic')}
- Costs 1 {magic_config.get('name', 'point')}
- Roll {dice} + {stat_names[1] if len(stat_names) > 1 else stat_names[0]}
- Can do: damage, heal, create advantages
"""

    # Enemy tiers
    if enemy_tiers:
        rules += "\n## Enemy Tiers\n"
        for tier_name, tier_data in enemy_tiers.items():
            health = tier_data.get("health", 1)
            damage = tier_data.get("damage", "d4")
            rules += f"- **{tier_name.capitalize()}**: {health} {health_config.get('name', 'Health')}, {damage} damage\n"

    # Species traits
    if species_list:
        rules += "\n## Species Traits (Once Per Run)\n"
        for species in species_list:
            rules += f"- **{species['name']}**: {species['trait_desc']}\n"

    rules += f"""
## {health_config.get('name', 'Health')}
- Start with {health_config.get('starting', 10)} {health_config.get('name', 'Health')}
- At 0 = knocked out, run ends
"""

    return rules


def build_lore_section(system_config: Dict[str, Any]) -> str:
    """
    Build the lore/world section from system configuration.

    Args:
        system_config: The campaign's system configuration

    Returns:
        The lore section as a markdown string
    """
    lore = system_config.get("lore", "")
    if not lore:
        return ""

    return f"""## World Lore

{lore}
"""


def format_author_notes_for_dm(notes: list) -> str:
    """
    Format author notes for injection into the gameplay DM context.

    Args:
        notes: List of DMPrepNote dicts (author_notes + pinned)

    Returns:
        Formatted markdown string for DM system prompt
    """
    if not notes:
        return ""

    # Group by category
    by_category: Dict[str, list] = {}
    for note in notes:
        category = note.get('category', 'general')
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(note)

    # Category display order and labels
    category_order = ['voice', 'pacing', 'secret', 'reminder', 'general']
    category_labels = {
        'voice': 'NPC Voices & Personalities',
        'pacing': 'Pacing & Tension',
        'secret': 'Secrets to Protect',
        'reminder': 'Important Reminders',
        'general': 'General Guidance'
    }

    section = "## Author Guidance for DM\n\n*The campaign author has prepared the following guidance:*\n"

    for cat in category_order:
        if cat in by_category:
            cat_notes = by_category[cat]
            label = category_labels.get(cat, cat.title())
            section += f"\n### {label}\n"
            for note in cat_notes:
                related = f" *(re: {note['related_to']})*" if note.get('related_to') else ""
                section += f"- {note.get('content', '')}{related}\n"

    return section


def build_dm_system_injection(dm_context: dict, party_status: Optional[dict] = None, author_notes: Optional[list] = None) -> str:
    """
    Build the campaign-specific portion of the DM system prompt.
    
    Args:
        dm_context: The context dict from build_dm_context()
        party_status: Optional current party HP/Threads/gear
    
    Returns:
        Markdown string to inject into DM system prompt
    """
    
    run = dm_context["run"]
    campaign = dm_context["campaign_context"]
    
    sections = []
    
    # Campaign header
    sections.append(f"""## Campaign: {campaign['name']}

**Premise:** {campaign['premise']}

**Tone:** {campaign['tone']}""")
    
    # Current run
    run_section = f"""## Current Run

**Hook:** {run['hook']}

**Goal:** {run['goal']}

**Tone:** {run['tone']}"""
    
    if run.get('must_include'):
        run_section += "\n\n**Must Include:**"
        for item in run['must_include']:
            run_section += f"\n- {item}"
    
    sections.append(run_section)
    
    # Threat status
    threat_section = f"""## Threat: {dm_context['threat_name']}

**Current Stage:** {dm_context['threat_stage'] + 1} of {len(campaign.get('threat_stages', [])) or '?'}

**Status:** {dm_context['threat_description']}

*Convey urgency appropriate to this threat level. {"The situation is dire." if dm_context['threat_stage'] >= 3 else "There is still time, but not much." if dm_context['threat_stage'] >= 2 else "Early days, but signs are troubling."}*"""
    
    sections.append(threat_section)
    
    # Party knowledge
    if dm_context['party_knows']:
        knows_section = "## The Party Knows\n\n*Reference these facts naturally. The party has learned:*\n"
        for fact in dm_context['party_knows']:
            knows_section += f"\n- {fact}"
        sections.append(knows_section)
    else:
        sections.append("## The Party Knows\n\n*The party has not yet learned any major facts.*")
    
    # Secrets to protect
    if dm_context['party_does_not_know']:
        secrets_section = """## DO NOT REVEAL

*The party does not yet know the following. Do not hint at or reveal these unless the run's reveal specifically unlocks them:*
"""
        for secret in dm_context['party_does_not_know']:
            secrets_section += f"\n- {secret}"
        sections.append(secrets_section)
    
    # NPC reference
    npc_section = "## NPCs\n"
    for name, npc in dm_context['npc_states'].items():
        met_status = "**Met**" if npc['met'] else "*Not yet met*"
        disposition = f" ({npc['disposition']})" if npc['met'] else ""
        npc_section += f"""
### {name} ({npc['species']}) {met_status}{disposition}
- **Role:** {npc['role']}
- **Wants:** {npc['wants']}
- **Secret:** {npc['secret']} *(do not reveal unless earned)*
"""
    sections.append(npc_section)
    
    # Locations
    if campaign.get('locations'):
        loc_section = "## Key Locations\n"
        for loc in campaign['locations']:
            visited = "✓ visited" if loc['name'] in dm_context.get('locations_visited', []) else ""
            loc_section += f"\n### {loc['name']} {visited}\n*{loc['vibe']}*\nContains: {', '.join(loc['contains'])}\n"
        sections.append(loc_section)
    
    # Party status if provided
    if party_status:
        party_section = "## Current Party Status\n"
        for member in party_status.get('party', []):
            party_section += f"\n**{member['name']}** ({member['species']})"
            party_section += f"\n- Hearts: {member['currentHearts']}/{member.get('maxHearts', 5)}"
            party_section += f"\n- Threads: {member['currentThreads']}/{member.get('maxThreads', 3)}"
            if member.get('gear'):
                party_section += f"\n- Gear: {', '.join(member['gear'])}"
            party_section += "\n"
        sections.append(party_section)

    # Author guidance for DM (from DM Prep notes)
    if author_notes:
        guidance_section = format_author_notes_for_dm(author_notes)
        if guidance_section:
            sections.append(guidance_section)

    # Run progress
    progress_section = f"""## Campaign Progress

- Runs completed: {dm_context['runs_completed']}
- Run type: {run['type'].upper()}"""
    
    if run['type'] == 'anchor':
        progress_section += f"\n- Run ID: {run['id']}"
        if run.get('reveal'):
            progress_section += f"\n- **On victory, reveal:** {run['reveal']}"
    
    sections.append(progress_section)
    
    return "\n\n---\n\n".join(sections)


def build_run_intro_prompt(dm_context: dict) -> str:
    """
    Build a prompt to kick off a new run.
    The DM should respond with the hook narration.
    """
    run = dm_context["run"]
    
    return f"""Begin this run. The quest hook is: "{run['hook']}"

Narrate the scene where the party receives this quest. Include:
- Who is asking for help (can be an NPC or a situation)
- What the immediate stakes are
- A sensory detail that hints at the {dm_context['threat_name']}

End by asking the party if they accept the quest.

Keep it to 2-3 paragraphs. Warm but with underlying tension appropriate to the tone: {run['tone']}."""


def build_run_resolution_prompt(dm_context: dict, outcome: str) -> str:
    """
    Build a prompt for the DM to narrate run resolution.
    """
    run = dm_context["run"]
    
    if outcome == "victory":
        reveal_instruction = ""
        if run.get('reveal'):
            reveal_instruction = f"\n\nIMPORTANT: This victory reveals the following to the party: \"{run['reveal']}\"\nWeave this reveal into the resolution narration naturally."
        
        return f"""The party has completed the run victoriously!

Goal achieved: {run['goal']}

Narrate the resolution:
- Acknowledge their success with specific callbacks to what they did
- Describe returning to town safely
- Hint at what might come next
{reveal_instruction}

Keep it to 2-3 paragraphs. Celebratory but aware that the larger threat ({dm_context['threat_name']}) still looms."""
    
    elif outcome == "retreat":
        return f"""The party has chosen to retreat before completing the run.

They have not achieved the goal: {run['goal']}

Narrate the retreat:
- Acknowledge this was a strategic choice, not a failure
- Describe their escape back to town
- Note that the challenge remains for another day
- The threat clock does NOT advance on retreat

Keep it brief. Respectful of their choice."""
    
    else:  # failed
        return f"""The party has been knocked out and the run has failed.

They did not achieve: {run['goal']}

Narrate the failure:
- They wake up back in town, rescued by allies or luck
- The {dm_context['threat_name']} has advanced (threat clock ticked)
- Current threat status: {dm_context['threat_description']}
- Something has been lost or gotten worse

Keep it to 2 paragraphs. Somber but not crushing — they can try again. This is a setback, not an ending."""


# === Formatting Helpers ===

def format_facts_for_prompt(facts: list[str], label: str = "Known facts") -> str:
    """Format a list of facts for inclusion in prompts"""
    if not facts:
        return ""
    
    lines = [f"**{label}:**"]
    for fact in facts:
        lines.append(f"- {fact}")
    return "\n".join(lines)


def format_npc_quick_reference(npc_states: dict) -> str:
    """Quick NPC reference for mid-run context"""
    lines = ["**NPCs:**"]
    for name, npc in npc_states.items():
        status = "met" if npc['met'] else "unknown"
        lines.append(f"- {name} ({npc['species']}): {npc['role']} [{status}]")
    return "\n".join(lines)
