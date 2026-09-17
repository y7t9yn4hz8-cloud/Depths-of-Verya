# Dungeon Knowledge — 0.9.9

## Upload

Upload these three files together to the repository root, replacing the existing files where applicable:

- `index.html` — modified game integration and controls.
- `dungeon-knowledge.js` — new knowledge system; required by index.html.
- `sw.js` — cache version 0.9.9, including the new script.

The ZIP contains these files at its root, plus this document and optional `dungeon-knowledge.test.cjs`. Upload extracted files, not the ZIP itself. Keep the existing map, images, manifest and other files. No changes were pushed to GitHub.

After deployment, close all game tabs and the installed app, then reopen while online so the waiting service worker can activate. Reopen once more if the header still shows 0.9.8. Keep the same site/browser to retain its local save; do not clear site storage.

## Changelog

- Preserves the existing persistent `visited` map and save key. Adds saved, floor-specific hazard, landmark and doorway knowledge plus a saved Lost flag.
- Known hazards remain marked with a red `!`; discovery warnings occur only once. Trigger consequences can still occur on revisits: knowing a hazard does not disarm it.
- High Perception automatically checks the facing direction on movement, turns and dungeon entry. LOOK deliberately checks the adjacent tile. Both stop at walls and closed doors, use the strongest conscious member, and respect hazard difficulty.
- Hazards reveal their source before damage, falling/teleporting or rotation. While Lost, new discoveries are remembered internally but not placed at precise map coordinates until rediscovered or visited with bearings restored.
- Rotators turn the party and cause Lost. Coordinates/facing become `???`, the position arrow disappears, auto-centering stops, and new explored tiles/doorways are not plotted. Existing map knowledge remains visible, including across save/load.
- Returning to a previously known entrance, fountain interaction tile or stair tile restores bearings. `reorientParty(true)` is the hook for a future ability after its own eligibility/cost check. Unknown landmarks do not immediately cure Lost. Travel while Lost is not retroactively mapped.
- Normal and reinforced doors automatically open for the instantaneous movement step and close before the next rendered view. There is no separate opening animation or extra movement turn. Known doorway edges remain gold on the map. Previously opened ordinary doors close when an old save loads.
- Replaces the ordinary OPEN control with LOOK. A contextual action remains for drinking, descending, exiting and special barriers. Locked, sealed, jammed and scripted barriers are not automatically bypassed; special-door opening state persists.
- Updates offline caching to include the new script. Existing combat, loot, encounter placement, artwork, fountain healing and level progression are unchanged.

## Current map and balance boundaries

The reviewed repository has one playable floor, no hazard objects, no Perception attribute or growth rules, and no implemented unlocking/puzzle subsystem. Its game logic is inline in `index.html`; `sw.js` is only the service worker. No `saw.js` exists.

To preserve the authored layout and gameplay, this update does **not** invent hazard placements or new floors. The system is integrated and tested with hazard fixtures, ready for authored hazards. Floor 02 remains unbuilt. Cross-floor falls require a floor-loading implementation in the `resolveTileHazards` relocation callback; unavailable destinations leave the party on the source tile and report that limitation.

Starting/migrated Perception is 10 for all classes; existing numeric Perception values are retained. The provisional automatic threshold is 16 with range two tiles. LOOK adds 6 to Perception for a deterministic check one tile ahead. Individual hazards can set `detection`; default 16. These tuneable constants live in `DungeonKnowledge.defaults`. No random reroll spam or new class growth rules were introduced. High-Perception behavior is tested with Perception 16; the current prototype has no gameplay method for increasing this new stat yet.

## Authoring hazards and landmarks

Add a `hazards` array to a floor's JSON, using unique stable IDs, valid walkable zero-based tile coordinates, numeric nonnegative damage and numeric detection difficulty. Supported types: `pit`, `trap`, `teleporter`, `rotator`. Hazards may alternatively be placed in `objects`; use only one location for each hazard.

Example schema (coordinates are illustrative, not a proposed change to Floor 01):

```json
{
  "hazards": [
    {"id":"pit_01", "type":"pit", "tile":[2,37], "detection":16, "damage":2,
     "destination":{"floor":1,"tile":[2,36]}},
    {"id":"rotator_01", "type":"rotator", "tile":[2,35], "detection":16}
  ]
}
```

Damage is optional and affects each conscious member; a same-floor destination is optional. Teleporters use the same destination schema. Do not overlap hazards unless intentionally triggering every hazard on the source tile. Arrival hazards at a relocation destination are not recursively triggered, avoiding teleport loops. Rotators rotate by one to three quarter turns. Hazard markers are on the automap; this update does not add 3D hazard artwork.

Custom landmarks use an object with a unique `id`, `landmark:true`, and `tile:[x,y]` or `interaction_tiles`. Doors with `locked`, `sealed`, `jammed`, `broken`, `scripted` or `requiresInteraction` set are excluded from automatic passage. The existing `openedDoors[id]` remains the explicit physical state for special barriers; a future unlocking/script handler can update it. This update does not invent key consumption or puzzle solutions.

## Testing

Run with Node.js:

```text
node dungeon-knowledge.test.cjs
```

**Result: 18 checks passed.** Both inline scripts also compile. Tests cover legacy and JSON save migration; low/high Perception; facing and blockers; unconscious observers; fall source/damage; rotator direction and Lost; knowledge preserved while Lost; known versus unknown landmark recovery; ability recovery; door migration; actual game movement through standard/reinforced doors in both directions; special-door blocking; actual closed-door detection; Lost map labels/marker and loading; repeated consequences without repeated discovery warnings; preventing door knowledge leaks on reload; and contextual fountain/exit/stair actions.

The integration checks execute the actual inline game code in Node with a small DOM adapter. They do not run the canvas renderer, a full browser, iPhone Safari, or service-worker lifecycle. Those visual/device checks remain manual:

1. Continue an existing save; confirm party, inventory, gold and explored tiles remain.
2. Pass a normal/reinforced door, turn around, and see its closed artwork. Pass back without OPEN. Check the map retains both tiles and the doorway.
3. Confirm LOOK is present and DRINK, DESCEND and EXIT appear at the existing landmarks. Confirm combat/search still behave normally.
4. In a disposable test map/save, add the hazard fixtures. Perception 10 plus LOOK discovers a default-difficulty adjacent hazard; Perception 16 auto-detects within two tiles. A closed door blocks either check.
5. Trigger a rotator, walk into unknown space, save/load, and check no new map tiles or position marker appear. Return to a previously known landmark; plotting resumes without filling the Lost route.
6. Trigger a pit and verify the source marker, damage and destination. Revisit: no repeated discovery warning, but consequences still apply.
7. Reopen the deployed app online to update the offline cache, then verify it launches offline with the new header.

## Reviewed baseline

Repository: https://github.com/y7t9yn4hz8-cloud/Depths-of-Verya, main branch retrieved September 16, 2026.

Reviewed source blob IDs: `index.html` b2355bc0f4d4e9a260ac7e748ccfad69da465f90; `sw.js` 0eb0ca6e628d83f03bbd814a12a7510bc9ee23cb; unchanged map 227067cb808f9cbbe43794e2ddfe38e68e209feb. The package changes only the runtime files listed above and adds tests/documentation.
