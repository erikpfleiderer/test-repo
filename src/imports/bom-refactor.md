BOM SOURCE-OF-TRUTH REFRACTOR — Assembly 845-000112
Objective: Remove ALL fabricated parts and make all pages use the real BOM dataset only.

1) Create a single source of truth dataset:
CANONICAL_BOM_845_000112

IMPORTANT:
- Treat each row as a unique BOM line item using bomLineId.
- No page may reference any partNumber not present in CANONICAL_BOM_845_000112.

2) Replace existing BOM_DATA, OTS lists, Subsystem lists, CostInterventions references, PartAnalysis part pickers, and Geometry tables so they all derive from CANONICAL_BOM_845_000112 (or views computed from it).
- BOMAnalysis table = CANONICAL_BOM_845_000112 (1:1 line items)
- Purchased/OTS subsystem knownParts = all rows where makeBuy="Buy"
- SubsystemAnalysis cards = group by subsystem from BOM rows (no hardcoded lists)
- Any part not in BOM must be removed from all pages
- GeometryAnalysis joins STEP metrics by partNumber where available; otherwise show “STEP not provided” (—)

3) Populate CANONICAL_BOM_845_000112 with CHUNK A below:

CHUNK A (BOM line items 1–53):
[
{"bomLineId":1,"partNumber":"405-000001","name":"ADHESIVE, THREADLOCKING, LOCTITE 222","qty":1,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{"bomLineId":2,"partNumber":"405-000002","name":"ADHESIVE, THREADLOCKING, LOCTITE 243","qty":1,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{"bomLineId":3,"partNumber":"405-000008","name":"ADHESIVE, THREADLOCKING, LOCTITE 648","qty":1,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{"bomLineId":4,"partNumber":"410-000303","name":"BEARING, NEEDLE ROLLER, 1/4\”IN ID, 7/16\”IN OD, 1/4\"IN WIDTH","qty":4,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{"bomLineId":5,"partNumber":"410-000310","name":"BEARING, CROSSED ROLLER, SUPER THIN, 60ID, 76MM OD, 8MM WIDTH, FULL COMPLEMENT","qty":1,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{"bomLineId":6,"partNumber":"410-000311","name":"BEARING, 6207, 35MM ID, 44MM OD, 5MM WIDTH, STEEL, OPEN","qty":1,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{"bomLineId":7,"partNumber":"410-000313","name":"BEARING, FLANGED 6704ZZ, 20MM ID, 27MM OD, 4MM WIDTH, STEEL, SHIELDED","qty":2,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{"bomLineId":8,"partNumber":"410-000314","name":"BEARING, R3, 3/16\”IN ID, 1/2\"IN OD, 5/32\”IN WIDTH, STEEL, OPEN","qty":4,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{"bomLineId":9,"partNumber":"410-000315","name":"BEARING, NEEDLE ROLLER, 3/8\" ID, 9/16\"IN OD, 5/16\"IN WIDTH","qty":4,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{"bomLineId":10,"partNumber":"410-000316","name":"BEARING, NEEDLE ROLLER, 14MM ID, 17MM OD, 10MM WIDTH, CAGE ONLY”,"qty":1,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{"bomLineId":11,"partNumber":"410-000323","name":"BEARING, 6705, 25MM ID, 14MM OD, 4MM WIDTH, STEEL, OPEN”,”qty":1,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{“bomLineId”:12,”partNumber":"420-000003","name":"1.5X6 PIN 52100","qty":1,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{“bomLineId”:13,”partNumber":"420-0000015","name":"2X6 PIN 52100","qty":3,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{“bomLineId”:14,”partNumber”:"420-000024","name":"2.5X6 PIN 52100","qty":3,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},{"bomLineId":15,"partNumber":"430-002808","name":"RS320 HOUSING","qty":1,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Housing / Structure"},
{"bomLineId":16,"partNumber":"430-002809","name":"RS320 ROTOR FRAME","qty":1,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Housing / Structure"},
{"bomLineId":17,"partNumber":"430-002810","name":"RS320 CARRIER","qty":1,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Housing / Structure"},
{"bomLineId":18,"partNumber":"430-002811","name":"RS320 OUTPUT","qty":1,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Housing / Structure"},
{"bomLineId":19,"partNumber":"430-002812","name":"RS320 OUTPUT CLAMP - OUTER","qty":1,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Retention"},
{"bomLineId":20,"partNumber":"430-002813","name":"RS320 OUTPUT CLAMP - INNER","qty":1,"makeBuy":"Make","itemCategory":"Sheet metal","subsystem":"Retention"},
{"bomLineId":21,"partNumber":"430-002814","name":"RS320 BORE SHAFT","qty":1,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Shafting"},
{"bomLineId":22,"partNumber":"430-002816","name":"RS320 PLANET SHAFT","qty":4,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Shafting"},
{"bomLineId":23,"partNumber":"430-002817","name":"RS320 PLANET SLEEVE","qty":4,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Shafting"},
{"bomLineId":24,"partNumber":"430-002836","name":"RS320 SUN GEAR","qty":1,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Geartrain"},
{"bomLineId":25,"partNumber":"430-002837","name":"RS320 PLANET GEAR","qty":4,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Geartrain"},
{"bomLineId":26,"partNumber":"430-002838","name":"RS320 RING GEAR - STATIC","qty":1,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Geartrain"},
{"bomLineId":27,"partNumber":"430-002839","name":"RS320 RING GEAR - OUTPUT","qty":1,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Geartrain"},
{"bomLineId":28,"partNumber":"430-002916","name":"RS320 AXON CAP","qty":1,"makeBuy":"Make","itemCategory":"Machined","subsystem":"Housing / Structure"}
{"bomLineId":29,"partNumber":"432-001479","name":"RS320 CABLE COVER","qty":1,"makeBuy":"Make","itemCategory":"3D printed","subsystem":"Cable Management"},
{"bomLineId":30,"partNumber":"432-001480","name":"RS320 CABLE GRIP - INPUT","qty":1,"makeBuy":"Make","itemCategory":"3D printed","subsystem":"Cable Management"},
{"bomLineId":31,"partNumber":"432-001482","name":"RS320 CABLE RELIEF MOUNT","qty":1,"makeBuy":"Make","itemCategory":"3D printed","subsystem":"Cable Management"},
{"bomLineId":32,"partNumber":"432-001483","name":"RS320 CABLE RELIEF CLAMP","qty":1,"makeBuy":"Make","itemCategory":"3D printed","subsystem":"Cable Management"},
{"bomLineId":33,"partNumber":"432-001540","name":"RS320 OUTPUT GROMET","qty":1,"makeBuy":"Make","itemCategory":"3D printed","subsystem":"Cable Management"},
{“bomLineId”:34,”partNumber":"438-000008","name":"GREASE, GEARBOX, KLUBERSYNTH GE 46-1200”,”qty":1,"makeBuy":"Buy","itemCategory":"COTS, Standard Hardware","subsystem":"Purchased / OTS"},
{"bomLineId":35,"partNumber":"443-000021","name":"MAGNET, RING, DUAL TRACK, 65MM OD, FOR ICMU","qty":1,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":36,"partNumber":"443-000022","name":"MAGNET, RING, DUAL TRACK, 45MM OD, FOR ICMU","qty":1,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":37,"partNumber":"445-000499","name":"SPACER, M2.5, 4.5MM OD, 3MM LENGTH, ALUMINUM","qty":1,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":38,"partNumber":"447-000120","name":"TBM2G-07608C-ANSA-10","qty":1,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":39,"partNumber":"460-000001","name":"LIGHT PIPE, 2MM, CLEAR","qty":1,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":40,"partNumber":"470-000084","name":"RETAINING RING, 20MM, INVERTED EXTERNAL, STEEL","qty":1,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":41,"partNumber":"470-000085","name":"RETAINING RING, 17MM, INVERTED EXTERNAL, STEEL","qty":1,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":42,"partNumber":"470-000086","name":"RETAINING RING, 1/2\" INTERNAL, STEEL","qty":4,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":43,"partNumber":"472-000059","name":"M2X0.4X4 FH TORX 8.8","qty":4,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":44,"partNumber":"472-000089","name":"M3X0.5X6 FH TORX ZPS 8.8","qty":4,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":45,"partNumber":"472-000121","name":"M2X0.4X6 BH TORX 8.8","qty":2,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":46,"partNumber":"472-000131","name":"M2.5X0.45X5 BH TORX 8.8","qty":11,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":47,"partNumber":"472-000132","name":"M2.5X0.45X6 BH TORX 8.8","qty":28,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":48,"partNumber":"472-001813","name":"SCREW, M2.5 X 0.45MM X 14MM, BH TORX, 8.8","qty":4,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":49,"partNumber":"481-000005","name":"THERMAL PASTE, GAP FILLER PUTTY 607","qty":1,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":50,"partNumber":"481-000008","name":"THERMAL INTERFACE, HIGH STRENGTH EPOXY ADHESIVE, TC-2810","qty":1,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":51,"partNumber":"482-000005","name":"THREADED INSERT, TAPERED HEAT SET, M2 X 0.4MM X 2.9MM, 18-8 SST","qty":2,"makeBuy":"Buy","subsystem":"Purchased / OTS"},
{"bomLineId":52,"partNumber":"600-000019","name":"MFG RESOURCE PACKAGE, RS320","qty":1,"makeBuy":"Make","subsystem":"Other"},
{"bomLineId":53,"partNumber":"820-000122","name":"AXON 7 MEDIUM","qty":1,"makeBuy":"Buy","subsystem":"Purchased / OTS"}
]

After appending:
- Overview total parts must show 53
- BOMAnalysis must show 53 of 53 populated
- SubsystemAnalysis knownParts must reflect complete grouping
- Any part not in CANONICAL_BOM_845_000112 must be deleted everywhere
- All page cross-links must use bomLineId + partNumber (since duplicates exist)- Remove any fabricated parts immediately.