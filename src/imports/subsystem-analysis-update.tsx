Update SubsystemAnalysis.tsx to include ALL subsystems for Assembly 845-000112.

Create 6 subsystem cards (5 required + Purchased/OTS):

1) Housing / Structure
- costWeight: 10 (scale 1–10)
- primaryCostDrivers:
  - Multi-setup CNC machining (datums + deep pockets)
  - Bearing/locating bore finishing + CMM time
  - High material removal from billet
- recommendedLever:
  - “Near-net shaping (casting/forging) + finish machining only on datums/bores”
- parts (complete list):
  - 430-002808 — Housing
  - 430-002811 — Output Hub
  - 430-002810 — Planet Carrier

2) Geartrain
- costWeight: 8
- primaryCostDrivers:
  - Internal gear cutting (ring gear) and tooth finishing
  - Heat treatment + distortion management
  - Inspection (runout/backlash/contact pattern)
- recommendedLever:
  - “Powder metal or near-net gear manufacturing + targeted finishing/grind where needed”
- parts (complete list):
  - 430-002839 — Ring Gear
  - 430-002837 — Planet Gear
  - 430-002836 — Sun Gear

3) Cable Management
- costWeight: 6
- primaryCostDrivers:
  - 3D printing unit cost + slow throughput
  - Post-processing + iteration/fit changes
  - Multiple variants driving overhead
- recommendedLever:
  - “Injection molding at volume + DFM updates (draft, ribs, wall thickness)”
- parts:
  - 432-001540 — Cable Grommet

4) Retention
- costWeight: 4
- primaryCostDrivers:
  - Laser cut sheet cost + deburr + finishing
  - Flatness and hole position requirements
  - Small-batch inefficiency
- recommendedLever:
  - “Stamping/formed sheet at volume, reduce secondary ops, simplify hole pattern where possible”
- parts:
  - 430-002812 — Output Clamp Outer
  - 430-002813 — Output Clamp Inner

5) Shafting
- costWeight: 4
- primaryCostDrivers:
  - Turning/grinding time
  - Tight runout/journal tolerances
  - Heat treat (if required) + inspection
- recommendedLever:
  - “Optimize blank + minimize precision surfaces; relax non-critical runout; standardize diameters”
- parts:
  - 430-002816 — Planet Shaft
  - 430-002814 — Bore Shaft
  - (include any other shafts/pins from BOM once BOM is fully populated)

6) Purchased / OTS
- costWeight: 3
- primaryCostDrivers:
  - Supplier unit price, MOQ, lead time
  - Variant count
- recommendedLever:
  - “Consolidate fasteners/adhesives; reduce unique hardware SKUs”
- parts:
  - (auto-populate from BOM rows labeled OTS/COTS once BOM_DATA is complete)

Also: fix existing subsystem cards so Geartrain costWeight is not null.