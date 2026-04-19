Update PartAnalysis.tsx to fully populate the analysis objects for:

A) 430-002839 — Ring Gear (currently empty fields)
Set:
- designIntent:
  "Internal ring gear for planetary reduction; preserves tooth geometry/backlash for NVH and life. Primary torque path component."
- costDrivers:
  ["Internal gear cutting", "Heat treatment + distortion management", "Inspection (runout/backlash/contact pattern)"]
- requiredDesignChanges (for Powder Metal option):
  [
    "Confirm tooth form feasibility for PM (module/DP, root fillet, tip relief allowances)",
    "Add/adjust stock allowance if selective finishing is required",
    "Define datum strategy for post-sinter finishing and inspection",
    "Update drawing tolerances: keep gear tooth tolerances tight, relax non-mating faces"
  ]
- assemblyImpact:
  "Must maintain backlash/contact pattern. No assembly sequence change, but may require updated shim/selection strategy if distortion differs."
- validationRequired:
  [
    "Contact pattern and backlash measurement across tolerance stack",
    "NVH / acoustic test under load",
    "Endurance life testing + wear inspection",
    "Dimensional stability after heat treat / sinter (as applicable)"
  ]
- engineeringDifficulty: "Medium"
- riskLevel: "Medium"
- confidenceLevel: "High"

B) 430-002808 — Housing (missing assessment badges)
Set:
- engineeringDifficulty: "Medium"
- riskLevel: "Low"
- confidenceLevel: "High"

C) 430-002811 — Output Hub (missing required changes/impact/validation)
Set:
- requiredDesignChanges:
  [
    "If material change 7075→6061: increase fillet radii at stress risers, verify minimum wall thickness at torque features",
    "Localize tight tolerances to bearing fits and mating datums only",
    "Remove non-functional chamfers/edge breaks where possible"
  ]
- assemblyImpact:
  "No change to assembly sequence if interfaces unchanged. Verify runout/bearing fit and torque interface remains within spec."
- validationRequired:
  [
    "FEA (torque + bearing loads) comparing 7075 vs 6061",
    "Runout measurement at bearing journals",
    "Torque-to-yield / slip test at torque interface"
  ]
Also set badges:
- engineeringDifficulty: "Low"
- riskLevel: "Low"
- confidenceLevel: "Medium"

D) 432-001540 — Cable Grommet (mostly empty)
Set:
- designIntent:
  "Cable routing and strain relief; prevents abrasion and maintains bend radius through housing pass-through."
- material: "ABS" (current) and note candidate materials: "PA6/PA66, TPE overmold, or glass-filled nylon depending on stiffness needs"
- process: "3D printed (current) → Injection molding at volume"
- costDrivers:
  ["3D print unit cost", "slow throughput", "post-processing/fit iteration"]
- requiredDesignChanges:
  [
    "Add 1–3° draft on all pull faces",
    "Target 2–3 mm nominal wall thickness with ribs instead of thick walls",
    "Add fillets at rib roots, avoid sharp internal corners",
    "Define parting line + gating location away from sealing/critical surfaces",
    "Add consistent snap/fastener features if currently relying on friction fit"
  ]
- assemblyImpact:
  "Should be drop-in if envelope and attachment preserved. May improve consistency; verify cable routing clearance and insertion force."
- validationRequired:
  [
    "Cable pull/strain relief test",
    "Thermal/UV/environmental conditioning (if outdoor)",
    "Fit check with housing + harness"
  ]
Badges:
- engineeringDifficulty: "Low"
- riskLevel: "Low"
- confidenceLevel: "High"

E) Add NEW PartAnalysis pages:
- 430-002837 — Planet Gear
- 430-002836 — Sun Gear

For both set:
- designIntent: torque transfer gear element in planetary set; tooth form/runout critical
- costDrivers: gear cutting, heat treat, inspection
- recommendedIntervention: powder metal / near-net gears (if volume supports) or optimize heat treat/finishing strategy
- validationRequired: contact pattern, NVH, endurance, dimensional stability
Badges:
- engineeringDifficulty: "Medium"
- riskLevel: "Medium"
- confidenceLevel: "Medium"