import React, { useState, useEffect } from 'react'
import DMPrepSection from './DMPrepSection'
import { fetchTemplates as apiGetTemplates, fetchTemplate } from '../api/templates'

const TRIGGER_TYPES = [
  { value: 'start', label: 'Available from start' },
  { value: 'after_run', label: 'After completing episode...' },
  { value: 'after_runs_count', label: 'After X episodes completed' },
  { value: 'threat_stage', label: 'When threat reaches stage...' },
]

const THREAT_ADVANCE_OPTIONS = [
  { value: 'run_failed', label: 'When an episode fails' },
  { value: 'every_2_runs', label: 'Every 2 episodes' },
  { value: 'every_3_runs', label: 'Every 3 episodes' },
  { value: 'manual', label: 'Manual only' },
]

const REWARD_TYPES = [
  { value: 'stat', label: 'Stat increase' },
  { value: 'health', label: 'Health increase' },
  { value: 'magic', label: 'Magic increase' },
  { value: 'choice', label: 'Player choice' },
  { value: 'ability', label: 'New ability' },
]

// Validation requirements
const VALIDATION = {
  minNPCs: 2,
  maxNPCs: 10,
  minLocations: 2,
  maxLocations: 10,
  minAnchorRuns: 3,
  maxAnchorRuns: 10,
  minFillerSeeds: 5,
  maxFillerSeeds: 15,
  minThreatStages: 3,
  maxThreatStages: 6,
  minSpecies: 2,
  maxSpecies: 15,
  minStats: 2,
  maxStats: 6,
  minBuildings: 2,
  maxBuildings: 12,
}

// Default system config - empty/minimal to start fresh
const DEFAULT_SYSTEM = {
  game_name: '',
  player_context: '',
  species: [
    { name: '', trait_name: '', trait_desc: '' },
    { name: '', trait_name: '', trait_desc: '' },
  ],
  stats: {
    names: ['', '', ''],
    colors: ['#c75050', '#50c770', '#5090c7'],
    starting_pool: 6,
    min_per_stat: 1,
    max_per_stat: 4,
  },
  resources: {
    health: { name: '', symbol: '', starting: 10, max: 20 },
    magic: { name: '', symbol: '', starting: 5, max: 10 },
  },
  currency: { name: '', symbol: '', starting: 0 },
  buildings: [
    { key: '', name: '', cost: 0, desc: '' },
    { key: '', name: '', cost: 0, desc: '' },
  ],
  leveling: {
    max_level: 5,
    thresholds: [10, 25, 50, 100],
    rewards: {
      '2': { type: 'stat', desc: '' },
      '3': { type: 'health', desc: '' },
      '4': { type: 'ability', desc: '' },
      '5': { type: 'stat', desc: '' },
    },
  },
  mechanics: {
    dice: 'd20',
    success_threshold: 15,
    partial_threshold: 10,
    enemy_tiers: {
      minion: { health: 2, damage: 'd4' },
      standard: { health: 6, damage: 'd6' },
      elite: { health: 12, damage: 'd8' },
      boss: { health: 20, damage: 'd10' },
    },
  },
  location_tags: [
    { value: '', label: '' },
  ],
  art_style: '',
  lore: '',
  dm_tone: '',
  rules_addendum: '',
}

function CampaignForm({ onSubmit, onCancel, onSaveDraft, initialData = null, initialSystem = null, campaignId = null }) {
  // === Templates State ===
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')

  // === Content State ===
  const [name, setName] = useState(initialData?.name || '')
  const [premise, setPremise] = useState(initialData?.premise || '')
  const [tone, setTone] = useState(initialData?.tone || '')

  const [threatName, setThreatName] = useState(initialData?.threat?.name || '')
  const [threatStages, setThreatStages] = useState(
    initialData?.threat?.stages || ['', '', '']
  )
  const [threatAdvance, setThreatAdvance] = useState(
    initialData?.threat?.advance_on || 'run_failed'
  )

  const [npcs, setNpcs] = useState(
    initialData?.npcs || [
      { name: '', species: '', role: '', wants: '', secret: '' },
      { name: '', species: '', role: '', wants: '', secret: '' },
    ]
  )

  const [locations, setLocations] = useState(
    initialData?.locations || [
      { name: '', vibe: '', contains: [] },
      { name: '', vibe: '', contains: [] },
    ]
  )

  const [anchorRuns, setAnchorRuns] = useState(
    initialData?.anchor_runs || [
      { id: '', hook: '', goal: '', tone: '', must_include: [''], reveal: '', trigger: { type: 'start', value: null } },
      { id: '', hook: '', goal: '', tone: '', must_include: [''], reveal: '', trigger: { type: 'after_run', value: '' } },
      { id: '', hook: '', goal: '', tone: '', must_include: [''], reveal: '', trigger: { type: 'after_run', value: '' } },
    ]
  )

  const [fillerSeeds, setFillerSeeds] = useState(
    initialData?.filler_seeds || ['', '', '', '', '']
  )

  // === System Config State ===
  const [system, setSystem] = useState(initialSystem || DEFAULT_SYSTEM)
  const [systemSection, setSystemSection] = useState('general') // Which system sub-section is active

  const [errors, setErrors] = useState([])
  const [currentSection, setCurrentSection] = useState('system') // Start with system for new campaigns

  // === Fetch templates on mount ===
  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const data = await apiGetTemplates()
      setTemplates(data.templates || [])
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }

  const loadTemplate = async (templateId) => {
    if (!templateId) return

    try {
      const data = await fetchTemplate(templateId)
      if (data.system) {
        setSystem(data.system)
        setSelectedTemplate(templateId)
      }
    } catch (err) {
      console.error('Failed to load template:', err)
    }
  }

  // === System Update Helpers ===
  const updateSystem = (field, value) => {
    setSystem(prev => ({ ...prev, [field]: value }))
  }

  const updateSystemNested = (path, value) => {
    setSystem(prev => {
      const copy = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      let obj = copy
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
      return copy
    })
  }

  // Species helpers
  const updateSpecies = (index, field, value) => {
    const updated = [...system.species]
    updated[index] = { ...updated[index], [field]: value }
    updateSystem('species', updated)
  }

  const addSpecies = () => {
    if (system.species.length < VALIDATION.maxSpecies) {
      updateSystem('species', [...system.species, { name: '', trait_name: '', trait_desc: '' }])
    }
  }

  const removeSpecies = (index) => {
    if (system.species.length > VALIDATION.minSpecies) {
      updateSystem('species', system.species.filter((_, i) => i !== index))
    }
  }

  // Stats helpers
  const updateStatName = (index, value) => {
    const updated = [...system.stats.names]
    updated[index] = value
    updateSystemNested('stats.names', updated)
  }

  const updateStatColor = (index, value) => {
    const updated = [...system.stats.colors]
    updated[index] = value
    updateSystemNested('stats.colors', updated)
  }

  const addStat = () => {
    if (system.stats.names.length < VALIDATION.maxStats) {
      updateSystemNested('stats.names', [...system.stats.names, ''])
      updateSystemNested('stats.colors', [...system.stats.colors, '#666666'])
    }
  }

  const removeStat = (index) => {
    if (system.stats.names.length > VALIDATION.minStats) {
      updateSystemNested('stats.names', system.stats.names.filter((_, i) => i !== index))
      updateSystemNested('stats.colors', system.stats.colors.filter((_, i) => i !== index))
    }
  }

  // Building helpers
  const updateBuilding = (index, field, value) => {
    const updated = [...system.buildings]
    updated[index] = { ...updated[index], [field]: value }
    updateSystem('buildings', updated)
  }

  const addBuilding = () => {
    if (system.buildings.length < VALIDATION.maxBuildings) {
      updateSystem('buildings', [...system.buildings, { key: '', name: '', cost: 0, desc: '' }])
    }
  }

  const removeBuilding = (index) => {
    if (system.buildings.length > VALIDATION.minBuildings) {
      updateSystem('buildings', system.buildings.filter((_, i) => i !== index))
    }
  }

  // Location tag helpers
  const updateLocationTag = (index, field, value) => {
    const updated = [...system.location_tags]
    updated[index] = { ...updated[index], [field]: value }
    updateSystem('location_tags', updated)
  }

  const addLocationTag = () => {
    updateSystem('location_tags', [...system.location_tags, { value: '', label: '' }])
  }

  const removeLocationTag = (index) => {
    if (system.location_tags.length > 1) {
      updateSystem('location_tags', system.location_tags.filter((_, i) => i !== index))
    }
  }

  // Leveling helpers
  const updateThreshold = (index, value) => {
    const updated = [...system.leveling.thresholds]
    updated[index] = parseInt(value) || 0
    updateSystemNested('leveling.thresholds', updated)
  }

  const updateReward = (level, field, value) => {
    const updated = { ...system.leveling.rewards }
    updated[level] = { ...updated[level], [field]: value }
    updateSystemNested('leveling.rewards', updated)
  }

  // Enemy tier helpers
  const updateEnemyTier = (tier, field, value) => {
    const updated = { ...system.mechanics.enemy_tiers }
    updated[tier] = { ...updated[tier], [field]: field === 'health' ? (parseInt(value) || 0) : value }
    updateSystemNested('mechanics.enemy_tiers', updated)
  }

  // === Validation ===
  const validate = () => {
    const errs = []

    // Basics
    if (!name.trim()) errs.push('Campaign name is required')
    if (premise.length < 20) errs.push('Premise must be at least 20 characters')
    if (!tone.trim()) errs.push('Tone is required')

    // Threat
    if (!threatName.trim()) errs.push('Threat name is required')
    const validStages = threatStages.filter(s => s.trim().length >= 5)
    if (validStages.length < VALIDATION.minThreatStages) {
      errs.push(`At least ${VALIDATION.minThreatStages} threat stages required (each 5+ chars)`)
    }

    // NPCs
    const validNpcs = npcs.filter(n => n.name && n.role && n.wants && n.secret)
    if (validNpcs.length < VALIDATION.minNPCs) {
      errs.push(`At least ${VALIDATION.minNPCs} complete NPCs required`)
    }

    // Locations
    const validLocs = locations.filter(l => l.name && l.vibe && l.contains.length > 0)
    if (validLocs.length < VALIDATION.minLocations) {
      errs.push(`At least ${VALIDATION.minLocations} complete locations required`)
    }

    // Anchor runs
    const validRuns = anchorRuns.filter(r => r.id && r.hook && r.goal && r.reveal)
    if (validRuns.length < VALIDATION.minAnchorRuns) {
      errs.push(`At least ${VALIDATION.minAnchorRuns} complete episodes required`)
    }

    // Check for start run
    const hasStartRun = anchorRuns.some(r => r.trigger.type === 'start' && r.id && r.hook)
    if (!hasStartRun) {
      errs.push('At least one episode must be available from start')
    }

    // Check run ID uniqueness
    const runIds = anchorRuns.map(r => r.id).filter(id => id)
    if (new Set(runIds).size !== runIds.length) {
      errs.push('Episode IDs must be unique')
    }

    // Check run ID format
    const idPattern = /^[a-z][a-z0-9_]*$/
    for (const run of anchorRuns) {
      if (run.id && !idPattern.test(run.id)) {
        errs.push(`Episode ID "${run.id}" must start with letter, use only lowercase, numbers, underscores`)
      }
    }

    // Check after_run references
    for (const run of anchorRuns) {
      if (run.trigger.type === 'after_run' && run.trigger.value) {
        if (!runIds.includes(run.trigger.value)) {
          errs.push(`Episode "${run.id}" references unknown episode "${run.trigger.value}"`)
        }
        if (run.trigger.value === run.id) {
          errs.push(`Episode "${run.id}" cannot trigger after itself`)
        }
      }
    }

    // Filler seeds
    const validSeeds = fillerSeeds.filter(s => s.trim().length >= 10)
    if (validSeeds.length < VALIDATION.minFillerSeeds) {
      errs.push(`At least ${VALIDATION.minFillerSeeds} filler seeds required (each 10+ chars)`)
    }

    // System validation
    const validSpecies = system.species.filter(s => s.name && s.trait_name && s.trait_desc)
    if (validSpecies.length < VALIDATION.minSpecies) {
      errs.push(`At least ${VALIDATION.minSpecies} complete species required`)
    }

    const validStats = system.stats.names.filter(n => n.trim())
    if (validStats.length < VALIDATION.minStats) {
      errs.push(`At least ${VALIDATION.minStats} stats required`)
    }

    setErrors(errs)
    return errs.length === 0
  }

  // === Build output ===
  const buildCampaignData = () => {
    return {
      name: name.trim(),
      premise: premise.trim(),
      tone: tone.trim(),
      threat: {
        name: threatName.trim(),
        stages: threatStages.filter(s => s.trim()).map(s => s.trim()),
        advance_on: threatAdvance
      },
      npcs: npcs
        .filter(n => n.name && n.role && n.wants && n.secret)
        .map(n => ({
          name: n.name.trim(),
          species: n.species || system.species[0]?.name || 'Human',
          role: n.role.trim(),
          wants: n.wants.trim(),
          secret: n.secret.trim()
        })),
      locations: locations
        .filter(l => l.name && l.vibe && l.contains.length > 0)
        .map(l => ({
          name: l.name.trim(),
          vibe: l.vibe.trim(),
          contains: l.contains
        })),
      anchor_runs: anchorRuns
        .filter(r => r.id && r.hook && r.goal && r.reveal)
        .map(r => ({
          id: r.id.trim(),
          hook: r.hook.trim(),
          goal: r.goal.trim(),
          tone: r.tone?.trim() || null,
          must_include: r.must_include.filter(m => m.trim()).map(m => m.trim()),
          reveal: r.reveal.trim(),
          trigger: {
            type: r.trigger.type,
            value: r.trigger.value || null
          }
        })),
      filler_seeds: fillerSeeds.filter(s => s.trim().length >= 10).map(s => s.trim())
    }
  }

  const buildSystemData = () => {
    return {
      ...system,
      species: system.species.filter(s => s.name && s.trait_name && s.trait_desc),
      stats: {
        ...system.stats,
        names: system.stats.names.filter(n => n.trim()),
        colors: system.stats.colors.slice(0, system.stats.names.filter(n => n.trim()).length),
      },
      buildings: system.buildings.filter(b => b.key && b.name),
      location_tags: system.location_tags.filter(t => t.value && t.label),
    }
  }

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({
        content: buildCampaignData(),
        system: buildSystemData()
      })
    }
  }

  // Build draft data - keeps everything including partial items
  const buildDraftData = () => {
    return {
      content: {
        name: name.trim(),
        premise: premise.trim(),
        tone: tone.trim(),
        threat: {
          name: threatName.trim(),
          stages: threatStages.map(s => s.trim()),
          advance_on: threatAdvance
        },
        npcs: npcs.map(n => ({
          name: n.name?.trim() || '',
          species: n.species || system.species[0]?.name || '',
          role: n.role?.trim() || '',
          wants: n.wants?.trim() || '',
          secret: n.secret?.trim() || ''
        })),
        locations: locations.map(l => ({
          name: l.name?.trim() || '',
          vibe: l.vibe?.trim() || '',
          contains: l.contains || []
        })),
        anchor_runs: anchorRuns.map(r => ({
          id: r.id?.trim() || '',
          hook: r.hook?.trim() || '',
          goal: r.goal?.trim() || '',
          tone: r.tone?.trim() || null,
          must_include: r.must_include.map(m => m?.trim() || ''),
          reveal: r.reveal?.trim() || '',
          trigger: {
            type: r.trigger.type,
            value: r.trigger.value || null
          }
        })),
        filler_seeds: fillerSeeds.map(s => s.trim())
      },
      system: system
    }
  }

  const handleSaveDraft = () => {
    if (!name.trim()) {
      setErrors(['Campaign name is required to save a draft'])
      return
    }
    onSaveDraft?.(buildDraftData())
  }

  // === Array manipulation helpers ===
  const updateNpc = (index, field, value) => {
    const updated = [...npcs]
    updated[index] = { ...updated[index], [field]: value }
    setNpcs(updated)
  }

  const addNpc = () => {
    if (npcs.length < VALIDATION.maxNPCs) {
      setNpcs([...npcs, { name: '', species: system.species[0]?.name || '', role: '', wants: '', secret: '' }])
    }
  }

  const removeNpc = (index) => {
    if (npcs.length > VALIDATION.minNPCs) {
      setNpcs(npcs.filter((_, i) => i !== index))
    }
  }

  const updateLocation = (index, field, value) => {
    const updated = [...locations]
    updated[index] = { ...updated[index], [field]: value }
    setLocations(updated)
  }

  const toggleLocationTag = (locIndex, tag) => {
    const updated = [...locations]
    const contains = updated[locIndex].contains
    if (contains.includes(tag)) {
      updated[locIndex].contains = contains.filter(t => t !== tag)
    } else {
      updated[locIndex].contains = [...contains, tag]
    }
    setLocations(updated)
  }

  const addLocation = () => {
    if (locations.length < VALIDATION.maxLocations) {
      setLocations([...locations, { name: '', vibe: '', contains: [] }])
    }
  }

  const removeLocation = (index) => {
    if (locations.length > VALIDATION.minLocations) {
      setLocations(locations.filter((_, i) => i !== index))
    }
  }

  const updateAnchorRun = (index, field, value) => {
    const updated = [...anchorRuns]
    updated[index] = { ...updated[index], [field]: value }
    setAnchorRuns(updated)
  }

  const updateRunTrigger = (index, field, value) => {
    const updated = [...anchorRuns]
    updated[index].trigger = { ...updated[index].trigger, [field]: value }
    setAnchorRuns(updated)
  }

  const updateMustInclude = (runIndex, itemIndex, value) => {
    const updated = [...anchorRuns]
    updated[runIndex].must_include[itemIndex] = value
    setAnchorRuns(updated)
  }

  const addMustInclude = (runIndex) => {
    if (anchorRuns[runIndex].must_include.length < 5) {
      const updated = [...anchorRuns]
      updated[runIndex].must_include = [...updated[runIndex].must_include, '']
      setAnchorRuns(updated)
    }
  }

  const removeMustInclude = (runIndex, itemIndex) => {
    const updated = [...anchorRuns]
    updated[runIndex].must_include = updated[runIndex].must_include.filter((_, i) => i !== itemIndex)
    setAnchorRuns(updated)
  }

  const addAnchorRun = () => {
    if (anchorRuns.length < VALIDATION.maxAnchorRuns) {
      setAnchorRuns([...anchorRuns, {
        id: '', hook: '', goal: '', tone: '', must_include: [''], reveal: '',
        trigger: { type: 'after_run', value: '' }
      }])
    }
  }

  const removeAnchorRun = (index) => {
    if (anchorRuns.length > VALIDATION.minAnchorRuns) {
      setAnchorRuns(anchorRuns.filter((_, i) => i !== index))
    }
  }

  const updateFillerSeed = (index, value) => {
    const updated = [...fillerSeeds]
    updated[index] = value
    setFillerSeeds(updated)
  }

  const addFillerSeed = () => {
    if (fillerSeeds.length < VALIDATION.maxFillerSeeds) {
      setFillerSeeds([...fillerSeeds, ''])
    }
  }

  const removeFillerSeed = (index) => {
    if (fillerSeeds.length > VALIDATION.minFillerSeeds) {
      setFillerSeeds(fillerSeeds.filter((_, i) => i !== index))
    }
  }

  const updateThreatStage = (index, value) => {
    const updated = [...threatStages]
    updated[index] = value
    setThreatStages(updated)
  }

  const addThreatStage = () => {
    if (threatStages.length < VALIDATION.maxThreatStages) {
      setThreatStages([...threatStages, ''])
    }
  }

  const removeThreatStage = (index) => {
    if (threatStages.length > VALIDATION.minThreatStages) {
      setThreatStages(threatStages.filter((_, i) => i !== index))
    }
  }

  // === Section navigation ===
  const sections = ['system', 'basics', 'threat', 'npcs', 'locations', 'runs', 'fillers', 'dm-prep']
  const sectionLabels = {
    system: 'System',
    basics: 'Basics',
    threat: 'Threat',
    npcs: 'NPCs',
    locations: 'Locations',
    runs: 'Episodes',
    fillers: 'Filler Seeds',
    'dm-prep': 'DM Prep'
  }

  const systemSections = ['general', 'species', 'stats', 'resources', 'buildings', 'leveling', 'mechanics', 'content']
  const systemSectionLabels = {
    general: 'General',
    species: 'Species',
    stats: 'Stats',
    resources: 'Resources',
    buildings: 'Buildings',
    leveling: 'Leveling',
    mechanics: 'Mechanics',
    content: 'Lore & Style'
  }

  // === Render ===
  return (
    <div className="campaign-form">
      <div className="form-header">
        <h2>{initialData ? 'Edit Campaign' : 'New Campaign'}</h2>
        <p className="form-subtitle">Configure game system and story content</p>
      </div>

      {/* Section tabs */}
      <div className="section-tabs">
        {sections.map(section => (
          <button
            key={section}
            className={`section-tab ${currentSection === section ? 'active' : ''}`}
            onClick={() => setCurrentSection(section)}
          >
            {sectionLabels[section]}
          </button>
        ))}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="form-errors">
          <strong>Please fix the following:</strong>
          <ul>
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <div className="form-body">

        {/* === SYSTEM CONFIG === */}
        {currentSection === 'system' && (
          <div className="form-section">
            {/* Template selector */}
            <div className="form-group">
              <label>Start from Template</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  className="btn btn-secondary"
                  onClick={() => loadTemplate(selectedTemplate)}
                  disabled={!selectedTemplate}
                >
                  Load
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-muted)', marginTop: '0.25rem' }}>
                Loading a template will replace current system settings
              </div>
            </div>

            {/* System sub-section tabs */}
            <div className="sub-section-tabs" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {systemSections.map(section => (
                <button
                  key={section}
                  className={`btn ${systemSection === section ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSystemSection(section)}
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                >
                  {systemSectionLabels[section]}
                </button>
              ))}
            </div>

            {/* General Settings */}
            {systemSection === 'general' && (
              <div>
                <div className="form-group">
                  <label>Game Name</label>
                  <input
                    type="text"
                    value={system.game_name}
                    onChange={e => updateSystem('game_name', e.target.value)}
                    placeholder="e.g., Bloomburrow Adventures"
                  />
                </div>
                <div className="form-group">
                  <label>Player Context <span className="hint">(who is playing - used in DM prompts)</span></label>
                  <input
                    type="text"
                    value={system.player_context}
                    onChange={e => updateSystem('player_context', e.target.value)}
                    placeholder="e.g., parent and child, solo adventurer"
                  />
                </div>
              </div>
            )}

            {/* Species */}
            {systemSection === 'species' && (
              <div>
                <p className="section-intro">Playable species/races with their unique traits.</p>

                {system.species.map((spec, i) => (
                  <div key={i} className="sub-form-card">
                    <div className="sub-form-header">
                      <span>Species {i + 1}</span>
                      {system.species.length > VALIDATION.minSpecies && (
                        <button className="remove-btn" onClick={() => removeSpecies(i)}>Remove</button>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Name *</label>
                      <input
                        type="text"
                        value={spec.name}
                        onChange={e => updateSpecies(i, 'name', e.target.value)}
                        placeholder="e.g., Mousefolk"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group half">
                        <label>Trait Name *</label>
                        <input
                          type="text"
                          value={spec.trait_name}
                          onChange={e => updateSpecies(i, 'trait_name', e.target.value)}
                          placeholder="e.g., Quick Paws"
                        />
                      </div>
                      <div className="form-group half">
                        <label>Trait Description *</label>
                        <input
                          type="text"
                          value={spec.trait_desc}
                          onChange={e => updateSpecies(i, 'trait_desc', e.target.value)}
                          placeholder="e.g., Take two actions in one turn"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {system.species.length < VALIDATION.maxSpecies && (
                  <button className="add-btn" onClick={addSpecies}>+ Add Species</button>
                )}
              </div>
            )}

            {/* Stats */}
            {systemSection === 'stats' && (
              <div>
                <p className="section-intro">Character stats (e.g., Brave, Clever, Kind or Strength, Dexterity, Wisdom)</p>

                <div className="form-row">
                  <div className="form-group third">
                    <label>Starting Pool</label>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={system.stats.starting_pool}
                      onChange={e => updateSystemNested('stats.starting_pool', parseInt(e.target.value) || 3)}
                    />
                  </div>
                  <div className="form-group third">
                    <label>Min per Stat</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={system.stats.min_per_stat}
                      onChange={e => updateSystemNested('stats.min_per_stat', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="form-group third">
                    <label>Max per Stat</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={system.stats.max_per_stat}
                      onChange={e => updateSystemNested('stats.max_per_stat', parseInt(e.target.value) || 3)}
                    />
                  </div>
                </div>

                {system.stats.names.map((statName, i) => (
                  <div key={i} className="array-item" style={{ alignItems: 'center' }}>
                    <input
                      type="color"
                      value={system.stats.colors[i] || '#666666'}
                      onChange={e => updateStatColor(i, e.target.value)}
                      style={{ width: '40px', height: '32px', padding: 0, border: 'none' }}
                    />
                    <input
                      type="text"
                      value={statName}
                      onChange={e => updateStatName(i, e.target.value)}
                      placeholder="Stat name"
                      style={{ flex: 1 }}
                    />
                    {system.stats.names.length > VALIDATION.minStats && (
                      <button className="remove-btn" onClick={() => removeStat(i)}>×</button>
                    )}
                  </div>
                ))}

                {system.stats.names.length < VALIDATION.maxStats && (
                  <button className="add-btn" onClick={addStat}>+ Add Stat</button>
                )}
              </div>
            )}

            {/* Resources */}
            {systemSection === 'resources' && (
              <div>
                <p className="section-intro">Health and magic resources for characters</p>

                <div className="sub-form-card">
                  <div className="sub-form-header">Health Resource</div>
                  <div className="form-row">
                    <div className="form-group half">
                      <label>Name</label>
                      <input
                        type="text"
                        value={system.resources.health?.name || ''}
                        onChange={e => updateSystemNested('resources.health.name', e.target.value)}
                        placeholder="e.g., Hearts, HP, Health"
                      />
                    </div>
                    <div className="form-group quarter">
                      <label>Symbol</label>
                      <input
                        type="text"
                        value={system.resources.health?.symbol || ''}
                        onChange={e => updateSystemNested('resources.health.symbol', e.target.value)}
                        placeholder="♥"
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group half">
                      <label>Starting</label>
                      <input
                        type="number"
                        min="1"
                        value={system.resources.health?.starting || 5}
                        onChange={e => updateSystemNested('resources.health.starting', parseInt(e.target.value) || 5)}
                      />
                    </div>
                    <div className="form-group half">
                      <label>Maximum</label>
                      <input
                        type="number"
                        min="1"
                        value={system.resources.health?.max || 10}
                        onChange={e => updateSystemNested('resources.health.max', parseInt(e.target.value) || 10)}
                      />
                    </div>
                  </div>
                </div>

                <div className="sub-form-card">
                  <div className="sub-form-header">Magic Resource</div>
                  <div className="form-row">
                    <div className="form-group half">
                      <label>Name</label>
                      <input
                        type="text"
                        value={system.resources.magic?.name || ''}
                        onChange={e => updateSystemNested('resources.magic.name', e.target.value)}
                        placeholder="e.g., Threads, Mana, MP"
                      />
                    </div>
                    <div className="form-group quarter">
                      <label>Symbol</label>
                      <input
                        type="text"
                        value={system.resources.magic?.symbol || ''}
                        onChange={e => updateSystemNested('resources.magic.symbol', e.target.value)}
                        placeholder="✦"
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group half">
                      <label>Starting</label>
                      <input
                        type="number"
                        min="0"
                        value={system.resources.magic?.starting || 3}
                        onChange={e => updateSystemNested('resources.magic.starting', parseInt(e.target.value) || 3)}
                      />
                    </div>
                    <div className="form-group half">
                      <label>Maximum</label>
                      <input
                        type="number"
                        min="1"
                        value={system.resources.magic?.max || 5}
                        onChange={e => updateSystemNested('resources.magic.max', parseInt(e.target.value) || 5)}
                      />
                    </div>
                  </div>
                </div>

                <div className="sub-form-card">
                  <div className="sub-form-header">Currency</div>
                  <div className="form-row">
                    <div className="form-group half">
                      <label>Name</label>
                      <input
                        type="text"
                        value={system.currency?.name || ''}
                        onChange={e => updateSystemNested('currency.name', e.target.value)}
                        placeholder="e.g., Gold, Seeds, Credits"
                      />
                    </div>
                    <div className="form-group quarter">
                      <label>Symbol</label>
                      <input
                        type="text"
                        value={system.currency?.symbol || ''}
                        onChange={e => updateSystemNested('currency.symbol', e.target.value)}
                        placeholder="🪙"
                        maxLength={2}
                      />
                    </div>
                    <div className="form-group quarter">
                      <label>Starting</label>
                      <input
                        type="number"
                        min="0"
                        value={system.currency?.starting || 0}
                        onChange={e => updateSystemNested('currency.starting', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Buildings */}
            {systemSection === 'buildings' && (
              <div>
                <p className="section-intro">Town buildings that can be purchased</p>

                {system.buildings.map((building, i) => (
                  <div key={i} className="sub-form-card">
                    <div className="sub-form-header">
                      <span>Building {i + 1}</span>
                      {system.buildings.length > VALIDATION.minBuildings && (
                        <button className="remove-btn" onClick={() => removeBuilding(i)}>Remove</button>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group third">
                        <label>Key *</label>
                        <input
                          type="text"
                          value={building.key}
                          onChange={e => updateBuilding(i, 'key', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                          placeholder="shop"
                        />
                      </div>
                      <div className="form-group third">
                        <label>Name *</label>
                        <input
                          type="text"
                          value={building.name}
                          onChange={e => updateBuilding(i, 'name', e.target.value)}
                          placeholder="General Shop"
                        />
                      </div>
                      <div className="form-group third">
                        <label>Cost</label>
                        <input
                          type="number"
                          min="0"
                          value={building.cost}
                          onChange={e => updateBuilding(i, 'cost', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <input
                        type="text"
                        value={building.desc}
                        onChange={e => updateBuilding(i, 'desc', e.target.value)}
                        placeholder="Basic supplies and gear"
                      />
                    </div>
                  </div>
                ))}

                {system.buildings.length < VALIDATION.maxBuildings && (
                  <button className="add-btn" onClick={addBuilding}>+ Add Building</button>
                )}
              </div>
            )}

            {/* Leveling */}
            {systemSection === 'leveling' && (
              <div>
                <p className="section-intro">XP thresholds and level-up rewards</p>

                <div className="form-group">
                  <label>Max Level</label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={system.leveling.max_level}
                    onChange={e => updateSystemNested('leveling.max_level', parseInt(e.target.value) || 5)}
                    style={{ width: '100px' }}
                  />
                </div>

                <div className="form-group">
                  <label>XP Thresholds <span className="hint">(XP needed for each level starting at 2)</span></label>
                  {system.leveling.thresholds.map((threshold, i) => (
                    <div key={i} className="array-item">
                      <span className="array-index">Lvl {i + 2}:</span>
                      <input
                        type="number"
                        min="1"
                        value={threshold}
                        onChange={e => updateThreshold(i, e.target.value)}
                        style={{ width: '100px' }}
                      />
                      <span style={{ color: 'var(--slate-muted)', fontSize: '0.8rem' }}>XP</span>
                    </div>
                  ))}
                </div>

                <div className="form-group">
                  <label>Level Rewards</label>
                  {Object.entries(system.leveling.rewards).map(([level, reward]) => (
                    <div key={level} className="sub-form-card" style={{ padding: '0.5rem' }}>
                      <div className="form-row">
                        <div className="form-group quarter">
                          <label>Level {level}</label>
                        </div>
                        <div className="form-group quarter">
                          <select
                            value={reward.type}
                            onChange={e => updateReward(level, 'type', e.target.value)}
                          >
                            {REWARD_TYPES.map(rt => (
                              <option key={rt.value} value={rt.value}>{rt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group half">
                          <input
                            type="text"
                            value={reward.desc}
                            onChange={e => updateReward(level, 'desc', e.target.value)}
                            placeholder="Reward description"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mechanics */}
            {systemSection === 'mechanics' && (
              <div>
                <p className="section-intro">Dice mechanics and enemy definitions</p>

                <div className="form-row">
                  <div className="form-group third">
                    <label>Dice Type</label>
                    <select
                      value={system.mechanics.dice}
                      onChange={e => updateSystemNested('mechanics.dice', e.target.value)}
                    >
                      <option value="d4">d4</option>
                      <option value="d6">d6</option>
                      <option value="d8">d8</option>
                      <option value="d10">d10</option>
                      <option value="d12">d12</option>
                      <option value="d20">d20</option>
                    </select>
                  </div>
                  <div className="form-group third">
                    <label>Success Threshold</label>
                    <input
                      type="number"
                      min="1"
                      value={system.mechanics.success_threshold}
                      onChange={e => updateSystemNested('mechanics.success_threshold', parseInt(e.target.value) || 15)}
                    />
                  </div>
                  <div className="form-group third">
                    <label>Partial Threshold</label>
                    <input
                      type="number"
                      min="1"
                      value={system.mechanics.partial_threshold}
                      onChange={e => updateSystemNested('mechanics.partial_threshold', parseInt(e.target.value) || 10)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Enemy Tiers</label>
                  {Object.entries(system.mechanics.enemy_tiers || {}).map(([tier, data]) => (
                    <div key={tier} className="array-item" style={{ alignItems: 'center' }}>
                      <span style={{ width: '80px', fontWeight: 600 }}>{tier}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--slate-muted)' }}>HP:</span>
                      <input
                        type="number"
                        min="1"
                        value={data.health}
                        onChange={e => updateEnemyTier(tier, 'health', e.target.value)}
                        style={{ width: '60px' }}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--slate-muted)' }}>Dmg:</span>
                      <select
                        value={data.damage}
                        onChange={e => updateEnemyTier(tier, 'damage', e.target.value)}
                        style={{ width: '70px' }}
                      >
                        <option value="d4">d4</option>
                        <option value="d6">d6</option>
                        <option value="d8">d8</option>
                        <option value="d10">d10</option>
                        <option value="d12">d12</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="form-group">
                  <label>Location Tags <span className="hint">(used in authored campaigns)</span></label>
                  {system.location_tags.map((tag, i) => (
                    <div key={i} className="array-item">
                      <input
                        type="text"
                        value={tag.value}
                        onChange={e => updateLocationTag(i, 'value', e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                        placeholder="value"
                        style={{ width: '100px' }}
                      />
                      <input
                        type="text"
                        value={tag.label}
                        onChange={e => updateLocationTag(i, 'label', e.target.value)}
                        placeholder="Label"
                        style={{ flex: 1 }}
                      />
                      {system.location_tags.length > 1 && (
                        <button className="remove-btn" onClick={() => removeLocationTag(i)}>×</button>
                      )}
                    </div>
                  ))}
                  <button className="add-btn" onClick={addLocationTag}>+ Add Tag</button>
                </div>
              </div>
            )}

            {/* Lore & Style */}
            {systemSection === 'content' && (
              <div>
                <div className="form-group">
                  <label>Art Style <span className="hint">(prompt for AI image generation)</span></label>
                  <textarea
                    value={system.art_style}
                    onChange={e => updateSystem('art_style', e.target.value)}
                    placeholder="e.g., fantasy illustration, warm earthy tones, atmospheric lighting"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>World Lore <span className="hint">(background for the DM)</span></label>
                  <textarea
                    value={system.lore}
                    onChange={e => updateSystem('lore', e.target.value)}
                    placeholder="Describe the world, history, and key concepts..."
                    rows={5}
                  />
                </div>

                <div className="form-group">
                  <label>DM Tone <span className="hint">(how the AI narrator should behave)</span></label>
                  <textarea
                    value={system.dm_tone}
                    onChange={e => updateSystem('dm_tone', e.target.value)}
                    placeholder="e.g., Warm storybook tone. Never scary. Celebrate creativity."
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Rules Addendum <span className="hint">(additional rules or modifications)</span></label>
                  <textarea
                    value={system.rules_addendum}
                    onChange={e => updateSystem('rules_addendum', e.target.value)}
                    placeholder="Any special rules for this campaign..."
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* === BASICS === */}
        {currentSection === 'basics' && (
          <div className="form-section">
            <div className="form-group">
              <label>Campaign Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., The Rotwood Blight"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>Premise * <span className="hint">(2-4 sentences: what's happening, stakes, goal)</span></label>
              <textarea
                value={premise}
                onChange={e => setPremise(e.target.value)}
                placeholder="A sickness spreads through the Brambles. Trees blacken, streams turn bitter, creatures flee toward Valley. The heroes must find the source before it reaches Three Tree City."
                rows={4}
                maxLength={500}
              />
              <div className="char-count">{premise.length}/500</div>
            </div>

            <div className="form-group">
              <label>Tone * <span className="hint">(short phrase or comma-separated tags)</span></label>
              <input
                type="text"
                value={tone}
                onChange={e => setTone(e.target.value)}
                placeholder="e.g., creeping dread, mystery, hope at the edges"
                maxLength={100}
              />
            </div>
          </div>
        )}

        {/* === THREAT === */}
        {currentSection === 'threat' && (
          <div className="form-section">
            <div className="form-group">
              <label>Threat Name *</label>
              <input
                type="text"
                value={threatName}
                onChange={e => setThreatName(e.target.value)}
                placeholder="e.g., The Blight"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>Threat Stages * <span className="hint">(escalating states, {VALIDATION.minThreatStages}-{VALIDATION.maxThreatStages})</span></label>
              {threatStages.map((stage, i) => (
                <div key={i} className="array-item">
                  <span className="array-index">{i + 1}.</span>
                  <input
                    type="text"
                    value={stage}
                    onChange={e => updateThreatStage(i, e.target.value)}
                    placeholder={`Stage ${i + 1}: What's happening at this level?`}
                    maxLength={150}
                  />
                  {threatStages.length > VALIDATION.minThreatStages && (
                    <button className="remove-btn" onClick={() => removeThreatStage(i)}>×</button>
                  )}
                </div>
              ))}
              {threatStages.length < VALIDATION.maxThreatStages && (
                <button className="add-btn" onClick={addThreatStage}>+ Add Stage</button>
              )}
            </div>

            <div className="form-group">
              <label>Threat Advances When</label>
              <select value={threatAdvance} onChange={e => setThreatAdvance(e.target.value)}>
                {THREAT_ADVANCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* === NPCs === */}
        {currentSection === 'npcs' && (
          <div className="form-section">
            <p className="section-intro">Key characters the party will meet. Each needs a secret the party can discover.</p>

            {npcs.map((npc, i) => (
              <div key={i} className="sub-form-card">
                <div className="sub-form-header">
                  <span>NPC {i + 1}</span>
                  {npcs.length > VALIDATION.minNPCs && (
                    <button className="remove-btn" onClick={() => removeNpc(i)}>Remove</button>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={npc.name}
                      onChange={e => updateNpc(i, 'name', e.target.value)}
                      placeholder="e.g., Bramblewick"
                      maxLength={50}
                    />
                  </div>
                  <div className="form-group half">
                    <label>Species *</label>
                    <select value={npc.species || ''} onChange={e => updateNpc(i, 'species', e.target.value)}>
                      <option value="">Select species...</option>
                      {system.species.filter(s => s.name).map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Role * <span className="hint">(one phrase)</span></label>
                  <input
                    type="text"
                    value={npc.role}
                    onChange={e => updateNpc(i, 'role', e.target.value)}
                    placeholder="e.g., Hermit scholar in the Brambles"
                    maxLength={100}
                  />
                </div>

                <div className="form-group">
                  <label>Wants * <span className="hint">(what they're trying to achieve)</span></label>
                  <input
                    type="text"
                    value={npc.wants}
                    onChange={e => updateNpc(i, 'wants', e.target.value)}
                    placeholder="e.g., Protect his insect colony"
                    maxLength={200}
                  />
                </div>

                <div className="form-group">
                  <label>Secret * <span className="hint">(what they know or are hiding)</span></label>
                  <input
                    type="text"
                    value={npc.secret}
                    onChange={e => updateNpc(i, 'secret', e.target.value)}
                    placeholder="e.g., Knows the blight started at an old shrine"
                    maxLength={300}
                  />
                </div>
              </div>
            ))}

            {npcs.length < VALIDATION.maxNPCs && (
              <button className="add-btn" onClick={addNpc}>+ Add NPC</button>
            )}
          </div>
        )}

        {/* === LOCATIONS === */}
        {currentSection === 'locations' && (
          <div className="form-section">
            <p className="section-intro">Key places in your campaign. Tag what can be found there.</p>

            {locations.map((loc, i) => (
              <div key={i} className="sub-form-card">
                <div className="sub-form-header">
                  <span>Location {i + 1}</span>
                  {locations.length > VALIDATION.minLocations && (
                    <button className="remove-btn" onClick={() => removeLocation(i)}>Remove</button>
                  )}
                </div>

                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={loc.name}
                    onChange={e => updateLocation(i, 'name', e.target.value)}
                    placeholder="e.g., The Withered Clearing"
                    maxLength={50}
                  />
                </div>

                <div className="form-group">
                  <label>Vibe * <span className="hint">(one sentence atmosphere)</span></label>
                  <input
                    type="text"
                    value={loc.vibe}
                    onChange={e => updateLocation(i, 'vibe', e.target.value)}
                    placeholder="e.g., Dead center of the blight, air thick and wrong"
                    maxLength={200}
                  />
                </div>

                <div className="form-group">
                  <label>Contains * <span className="hint">(select at least one)</span></label>
                  <div className="tag-buttons">
                    {system.location_tags.filter(t => t.value && t.label).map(tag => (
                      <button
                        key={tag.value}
                        className={`tag-btn ${loc.contains.includes(tag.value) ? 'active' : ''}`}
                        onClick={() => toggleLocationTag(i, tag.value)}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {locations.length < VALIDATION.maxLocations && (
              <button className="add-btn" onClick={addLocation}>+ Add Location</button>
            )}
          </div>
        )}

        {/* === EPISODES === */}
        {currentSection === 'runs' && (
          <div className="form-section">
            <p className="section-intro">
              Story-beat episodes that advance the plot. The AI will generate journey/site details from your seeds.
            </p>

            {anchorRuns.map((run, i) => (
              <div key={i} className="sub-form-card">
                <div className="sub-form-header">
                  <span>Episode {i + 1}</span>
                  {anchorRuns.length > VALIDATION.minAnchorRuns && (
                    <button className="remove-btn" onClick={() => removeAnchorRun(i)}>Remove</button>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label>ID * <span className="hint">(lowercase, no spaces)</span></label>
                    <input
                      type="text"
                      value={run.id}
                      onChange={e => updateAnchorRun(i, 'id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                      placeholder="e.g., first_signs"
                      maxLength={30}
                    />
                  </div>
                  <div className="form-group half">
                    <label>Tone Override <span className="hint">(optional)</span></label>
                    <input
                      type="text"
                      value={run.tone || ''}
                      onChange={e => updateAnchorRun(i, 'tone', e.target.value)}
                      placeholder="Leave blank to use campaign tone"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Hook * <span className="hint">(the quest prompt shown to players)</span></label>
                  <textarea
                    value={run.hook}
                    onChange={e => updateAnchorRun(i, 'hook', e.target.value)}
                    placeholder="e.g., A farmer's child is sick. The healer needs bramble-root, but gatherers have gone missing."
                    rows={2}
                    maxLength={300}
                  />
                </div>

                <div className="form-group">
                  <label>Goal * <span className="hint">(what success looks like)</span></label>
                  <input
                    type="text"
                    value={run.goal}
                    onChange={e => updateAnchorRun(i, 'goal', e.target.value)}
                    placeholder="e.g., Retrieve bramble-root from the Brambles edge"
                    maxLength={200}
                  />
                </div>

                <div className="form-group">
                  <label>Must Include <span className="hint">(things the AI must weave in, up to 5)</span></label>
                  {run.must_include.map((item, j) => (
                    <div key={j} className="array-item">
                      <input
                        type="text"
                        value={item}
                        onChange={e => updateMustInclude(i, j, e.target.value)}
                        placeholder="e.g., Signs of the blight (blackened leaves)"
                        maxLength={200}
                      />
                      {run.must_include.length > 1 && (
                        <button className="remove-btn" onClick={() => removeMustInclude(i, j)}>×</button>
                      )}
                    </div>
                  ))}
                  {run.must_include.length < 5 && (
                    <button className="add-btn small" onClick={() => addMustInclude(i)}>+ Add Item</button>
                  )}
                </div>

                <div className="form-group">
                  <label>Reveal * <span className="hint">(what the party learns on success)</span></label>
                  <input
                    type="text"
                    value={run.reveal}
                    onChange={e => updateAnchorRun(i, 'reveal', e.target.value)}
                    placeholder="e.g., The Brambles themselves are sick — this isn't normal"
                    maxLength={300}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label>Available When</label>
                    <select
                      value={run.trigger.type}
                      onChange={e => updateRunTrigger(i, 'type', e.target.value)}
                    >
                      {TRIGGER_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {run.trigger.type === 'after_run' && (
                    <div className="form-group half">
                      <label>After Episode</label>
                      <select
                        value={run.trigger.value || ''}
                        onChange={e => updateRunTrigger(i, 'value', e.target.value)}
                      >
                        <option value="">Select episode...</option>
                        {anchorRuns.filter((r, j) => j !== i && r.id).map(r => (
                          <option key={r.id} value={r.id}>{r.id}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {run.trigger.type === 'after_runs_count' && (
                    <div className="form-group half">
                      <label>After X Episodes</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={run.trigger.value || ''}
                        onChange={e => updateRunTrigger(i, 'value', e.target.value)}
                      />
                    </div>
                  )}

                  {run.trigger.type === 'threat_stage' && (
                    <div className="form-group half">
                      <label>At Threat Stage</label>
                      <input
                        type="number"
                        min="0"
                        max={threatStages.length - 1}
                        value={run.trigger.value || ''}
                        onChange={e => updateRunTrigger(i, 'value', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {anchorRuns.length < VALIDATION.maxAnchorRuns && (
              <button className="add-btn" onClick={addAnchorRun}>+ Add Episode</button>
            )}
          </div>
        )}

        {/* === FILLER SEEDS === */}
        {currentSection === 'fillers' && (
          <div className="form-section">
            <p className="section-intro">
              One-liner prompts the AI can expand into full episodes between story beats.
              Each seed is used once, then removed from the pool.
            </p>

            {fillerSeeds.map((seed, i) => (
              <div key={i} className="array-item">
                <span className="array-index">{i + 1}.</span>
                <input
                  type="text"
                  value={seed}
                  onChange={e => updateFillerSeed(i, e.target.value)}
                  placeholder="e.g., Escort refugees fleeing the Brambles to safety"
                  maxLength={150}
                />
                {fillerSeeds.length > VALIDATION.minFillerSeeds && (
                  <button className="remove-btn" onClick={() => removeFillerSeed(i)}>×</button>
                )}
              </div>
            ))}

            {fillerSeeds.length < VALIDATION.maxFillerSeeds && (
              <button className="add-btn" onClick={addFillerSeed}>+ Add Filler Seed</button>
            )}
          </div>
        )}

        {/* === DM PREP === */}
        {currentSection === 'dm-prep' && campaignId && (
          <DMPrepSection
            campaignId={campaignId}
            npcs={npcs}
            locations={locations}
            runs={anchorRuns}
          />
        )}
        {currentSection === 'dm-prep' && !campaignId && (
          <div className="form-section">
            <p className="text-center" style={{ padding: '2rem', color: 'var(--slate-muted)' }}>
              DM Prep is available after saving the campaign. Save as draft first to access this feature.
            </p>
          </div>
        )}

      </div>

      {/* Form actions */}
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        {onSaveDraft && (
          <button className="btn btn-outline" onClick={handleSaveDraft}>
            Save Draft
          </button>
        )}
        <button className="btn btn-primary" onClick={handleSubmit}>
          {initialData ? 'Save Changes' : 'Create Campaign'}
        </button>
      </div>
    </div>
  )
}

export default CampaignForm
