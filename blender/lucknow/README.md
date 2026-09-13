# LKO Open World - Street Greybox (Reference: lko-openworld.png)

Recreation of your Lucknow open-world greybox image (Clock Tower + Rumi Gate street).

## Reference Image
`reference_lko_openworld.png` (copied from `blender/lko-openworld.png`) - top-down tiled plaza, central Husainabad Clock Tower, Rumi Darwaza arch far +Z, shop rows L/R, grey car silhouettes, barriers, billboards.

## Source Blend
- **File:** `lko_openworld_grey.blend` (88 objects)
- **Location:** `blender/lko_openworld/lko_openworld_grey.blend` (saved via `bpy.ops.wm.save_as_mainfile`)
- **Blender:** `5.2 LTS` MCP `127.0.0.1:9876`
- **Collections:** `LKO_OpenWorld/{Ground,Roads,Buildings_Left,Buildings_Right,ClockTower,RumiGate,Props_Cars_Barriers,OutOfBounds}`
  - `Ground` 1x main `120x1x160` @ `y=-0.5` + OOB dark planes
  - `Roads` 4x main `18x140` spine + cross + footpaths
  - `Buildings_Left` 20x (6 shop blocks + 3 backs + awnings + arch arcade boxes)
  - `Buildings_Right` 16x (6 shops + 3 backs + `BANK` sign)
  - `ClockTower` 8x base `5x1x5`, shaft `3.5x16x3.5`, 4 faces, dome, spire `cylinder 0.07x8`
  - `RumiGate` 11x wings `18x12x6`, pillars `3x14x4`, lintel `19x2x4`, arch top, crown, minarets `1.5x16x1.5`
  - `Props_Cars_Barriers` 26x 9 cars (`2.2x1.4x4` @ y=0.7), 5 barriers, 2 billboards + stands, 8 human proxies `0.4x1.7x0.4`

## Exports

```
blender/lko_openworld/lko_openworld_grey.blend
  exports/monolith/lko_openworld_grey.glb          96,364 bytes 60 meshes (playable, no cars/humans)
  exports/monolith/lko_openworld_full_props.glb   136,740 bytes 86 meshes (with props)
  exports/monolith/preview_top.png                643KB EEVEE top view ( props hidden for clean)
  exports/kit/shop_small_12x7x10.glb etc. 7x ~2KB kit archetypes
public/models/worlds/lko_openworld_grey.glb  -> THREE GLTFWorldLoader / GLTFCollider
public/models/worlds/lko_openworld_full_props.glb
godot_game/assets/models/arena/lko_openworld/lko_openworld_grey.glb
godot_game/assets/models/arena/lko_openworld/lko_openworld_full_props.glb
  + kit/ 7 archetypes
```

## Dual-Engine Use (same GLB)

**THREE (`Mithuna/src/world/lko_openworld/`):**
```jsx
import { LkoOpenWorld } from "./world/lko_openworld/LkoOpenWorld"
import { LkoOpenWorldColliders } from "./world/lko_openworld/LkoOpenWorldColliders"
// in Scene.jsx <PhysicsWorld>:
<LkoOpenWorld />           // visual
<LkoOpenWorldColliders />  // trimesh physics
// or full with props: <LkoOpenWorldFull /> / <LkoOpenWorldFullColliders />
```

**Godot 4.6:**
- Scene `scenes/arenas/lko_openworld.tscn` -> script `scripts/arenas/lko_openworld.gd`
- `blockout.imported_prop(Vector3(0,0,5), Vector3(120,16,160), LKO_GREY)` single monolith, same origin as `lucknow_imambara` (ground top at y=0)
- Toggle `use_full_props` to compare with cars/humans. Kit samples at `kit/` like `shop_small_12x7x10.glb`.

## Iterate
- Edit `lko_openworld_grey.blend`, keep `Ground/Roads/Buildings_*` collections for clean `use_selection` export (`export_apply=True, yup=True, draco=False`).
- Re-run `blender_export_lko_openworld.py` (in `C:\Users\pc\AppData\Local\Temp\opencode\`) to re-export to all three roots.
- For detail: replace one `BL_01_Shop_Small` box with modeled shop, export only that kit piece (e.g. `shop_small_12x7x10.glb`) - engine picks up new mesh without touching monolith.

## Next Detail Pass
- Model Clock Tower chhatris/arches, Rumi Gate jali, shop shutters - replace current box placeholders.
- Add road markings (plane decal), pavement tiles texture vs grey material.
- Swap grey car boxes with `godot_game/assets/models/ambassador-car.glb` / `royal-enfield` instances.

Preview: `exports/monolith/preview_top.png`
Reference: `reference_lko_openworld.png`
