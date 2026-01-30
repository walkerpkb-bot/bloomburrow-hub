"""
Prep Coach Builder
Constructs the system prompt and context for the DM Prep Coach AI
"""

from typing import Optional, Dict, Any, List


def build_prep_coach_system_prompt(system_config: Dict[str, Any]) -> str:
    """
    Build the main system prompt for the Prep Coach.

    Args:
        system_config: The campaign's system configuration

    Returns:
        The complete Prep Coach system prompt as a string
    """
    game_name = system_config.get("game_name", "Adventure")

    prompt = f"""# Campaign Prep Coach for {game_name}

You are a Campaign Prep Coach helping an author prepare guidance for DMs who will run this campaign.

## Your Role

- Help the author think through how the campaign should be run
- Provide analytical, collaborative feedback
- Ask clarifying questions to draw out the author's vision
- Suggest concrete guidance that will help DMs run the campaign faithfully

## Topics You Can Help With

- **NPC Personalities & Voices**: How should NPCs speak? What are their mannerisms? What makes them memorable?
- **Pacing & Tension**: When should things feel urgent? When can players breathe? How to build toward climaxes?
- **Secrets & Reveals**: What should DMs protect? When and how should information be revealed?
- **Encounter Tips**: How might players approach challenges? What creative solutions should be rewarded?
- **Tone Consistency**: How to maintain the campaign's emotional beats across different scenes?
- **Player Agency**: When to let players deviate from the plan? What are acceptable variations?

## Important Notes

- You are NOT the DM. You are helping prepare the author's vision.
- Be specific and actionable in your suggestions.
- When the author shares a good insight, suggest they pin it as a note for DMs.
- Format suggested notes clearly so they're easy to pin.

## Response Style

- Keep responses focused and practical
- Use bullet points for lists of suggestions
- When suggesting a note to pin, format it like this:

  **Pin this?** "Bramblewick should speak in short, clipped sentences, always looking over his shoulder."

- Ask follow-up questions to explore ideas deeper
"""

    return prompt


def build_prep_coach_context(
    campaign_content: Optional[Dict[str, Any]],
    campaign_state: Optional[Dict[str, Any]],
    dm_prep_data: Optional[Dict[str, Any]],
    system_config: Dict[str, Any]
) -> str:
    """
    Build the context injection for the Prep Coach.

    Args:
        campaign_content: The authored campaign content (NPCs, locations, runs, etc.)
        campaign_state: Current runtime state (if mid-campaign)
        dm_prep_data: Existing DM prep notes and pinned insights
        system_config: The campaign's system configuration

    Returns:
        Context string to inject into the system prompt
    """
    sections = []

    # Campaign content
    if campaign_content:
        content_section = f"""## Campaign Content

**Name:** {campaign_content.get('name', 'Untitled')}

**Premise:** {campaign_content.get('premise', 'No premise set')}

**Tone:** {campaign_content.get('tone', 'Not specified')}
"""

        # Threat
        threat = campaign_content.get('threat', {})
        if threat:
            content_section += f"""
### Threat: {threat.get('name', 'Unknown')}
**Stages:**
"""
            for i, stage in enumerate(threat.get('stages', [])):
                content_section += f"  {i+1}. {stage}\n"
            content_section += f"**Advances when:** {threat.get('advance_on', 'unknown')}\n"

        # NPCs
        npcs = campaign_content.get('npcs', [])
        if npcs:
            content_section += "\n### NPCs\n"
            for npc in npcs:
                content_section += f"""
**{npc.get('name', 'Unknown')}** ({npc.get('species', 'Unknown')})
- Role: {npc.get('role', 'Unknown')}
- Wants: {npc.get('wants', 'Unknown')}
- Secret: {npc.get('secret', 'Unknown')}
"""

        # Locations
        locations = campaign_content.get('locations', [])
        if locations:
            content_section += "\n### Locations\n"
            for loc in locations:
                contains = ', '.join(loc.get('contains', []))
                content_section += f"""
**{loc.get('name', 'Unknown')}**
- Vibe: {loc.get('vibe', 'Unknown')}
- Contains: {contains}
"""

        # Anchor runs
        runs = campaign_content.get('anchor_runs', [])
        if runs:
            content_section += "\n### Anchor Runs\n"
            for run in runs:
                must_include = ', '.join(run.get('must_include', [])) or 'None specified'
                trigger = run.get('trigger', {})
                trigger_desc = f"{trigger.get('type', 'unknown')}"
                if trigger.get('value'):
                    trigger_desc += f" ({trigger['value']})"

                content_section += f"""
**{run.get('id', 'unknown')}** - {trigger_desc}
- Hook: {run.get('hook', 'Unknown')}
- Goal: {run.get('goal', 'Unknown')}
- Must include: {must_include}
- Reveal: {run.get('reveal', 'Unknown')}
"""

        # Filler seeds
        fillers = campaign_content.get('filler_seeds', [])
        if fillers:
            content_section += "\n### Filler Seeds\n"
            for i, seed in enumerate(fillers):
                content_section += f"  {i+1}. {seed}\n"

        sections.append(content_section)

    # Campaign state (if mid-playthrough)
    if campaign_state and campaign_state.get('runs_completed', 0) > 0:
        state_section = """## Current Campaign State

*A playthrough is in progress. Consider how guidance might vary based on progress.*
"""
        state_section += f"""
- **Runs completed:** {campaign_state.get('runs_completed', 0)}
- **Threat stage:** {campaign_state.get('threat_stage', 0)}
- **Anchor runs done:** {', '.join(campaign_state.get('anchor_runs_completed', [])) or 'None'}
- **Facts known by party:** {len(campaign_state.get('facts_known', []))} items
"""
        sections.append(state_section)

    # Existing DM prep notes
    if dm_prep_data:
        notes = dm_prep_data.get('author_notes', [])
        pinned = dm_prep_data.get('pinned', [])

        if notes or pinned:
            prep_section = "## Existing DM Guidance\n\n*These notes have already been prepared:*\n"

            if notes:
                prep_section += "\n### Author Notes\n"
                for note in notes:
                    category = note.get('category', 'general')
                    related = f" (re: {note['related_to']})" if note.get('related_to') else ""
                    prep_section += f"- [{category}]{related} {note.get('content', '')}\n"

            if pinned:
                prep_section += "\n### Pinned Insights\n"
                for note in pinned:
                    category = note.get('category', 'general')
                    related = f" (re: {note['related_to']})" if note.get('related_to') else ""
                    prep_section += f"- [{category}]{related} {note.get('content', '')}\n"

            sections.append(prep_section)

    # System config context
    if system_config:
        lore = system_config.get('lore', '')
        dm_tone = system_config.get('dm_tone', '')

        if lore or dm_tone:
            system_section = "## World & Tone Context\n"
            if lore:
                # Truncate lore if very long
                lore_preview = lore[:500] + "..." if len(lore) > 500 else lore
                system_section += f"\n**World Lore:**\n{lore_preview}\n"
            if dm_tone:
                system_section += f"\n**DM Tone Guidelines:**\n{dm_tone}\n"
            sections.append(system_section)

    return "\n---\n\n".join(sections) if sections else ""


def format_notes_for_dm_context(notes: List[Dict[str, Any]]) -> str:
    """
    Format DM prep notes for injection into the gameplay DM context.

    Args:
        notes: List of DMPrepNote dicts (author_notes + pinned)

    Returns:
        Formatted markdown string for DM system prompt
    """
    if not notes:
        return ""

    # Group by category
    by_category = {}
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

    sections = []
    for cat in category_order:
        if cat in by_category:
            cat_notes = by_category[cat]
            label = category_labels.get(cat, cat.title())
            section = f"### {label}\n"
            for note in cat_notes:
                related = f" *(re: {note['related_to']})*" if note.get('related_to') else ""
                section += f"- {note.get('content', '')}{related}\n"
            sections.append(section)

    return "\n".join(sections)
