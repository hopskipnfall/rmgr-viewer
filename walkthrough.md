# Walkthrough: Original Character Illustrations for Remix Fighters & Preview Screen

## Summary of Accomplishments

We implemented complete support for previewing and rendering original N64 low-poly character illustrations for **all 31 non-polygon Smash Remix fighters** (plus Bowser). We excluded all Fighting Polygon Team characters (`0x0e`-`0x19`, `0x4d`-`0x60`) per user instruction.

### 1. Character Preview Screen (`http://localhost:5183/#/preview`)

- Updated `#previewCharSelect` in [`src/preview/characterPreview.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/preview/characterPreview.ts) to display fighters organized into `<optgroup>` categories:
  - **Original 12**: Mario, Fox, Donkey Kong, Samus, Luigi, Link, Yoshi, Captain Falcon, Kirby, Pikachu, Jigglypuff, Ness
  - **Smash Remix Fighters**: Bowser, Falco, Ganondorf, Young Link, Dr. Mario, Wario, Dark Samus, Lucas, Giga Bowser, Mad Piano, Wolf, Conker, Mewtwo, Marth, Sonic, Sandbag, Super Sonic, Sheik, Marina, King Dedede, Goemon, Peppy Hare, Slippy Toad, Banjo & Kazooie, Metal Luigi, Ebisumaru, Dragon King, Crash Bandicoot, Peach, Roy, Dr. Luigi, Lanky Kong
  - **Fighting Polygon Team**
  - **Bosses & Special Characters**
  - **Regional Variants (JP/EU)**
- Added specialized action state definitions for Bowser and key Remix fighters (e.g., Fire Bird with angle controls for Falco, Ganondorf's dark magic, Wario's shoulder bash, etc.).

### 2. Original Character Polygon Illustrations (31 Remix Fighters)

Created modular, maintainable batch drawing files in `src/characters/remix/`:

- [`src/characters/remix/common.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/characters/remix/common.ts): Shared theme resolution, bland/grayscale color mapping, and hitstun/landing shockwave aura rendering (`drawCharacterStateAuras`).
- [`src/characters/remix/remixBatch1.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/characters/remix/remixBatch1.ts):
  - **Falco** (`0x1d`): Blue plumage, yellow beak/talons, flight jacket, communicator headset, holstered blaster.
  - **Ganondorf** (`0x1e`): Gerudo King armor, flowing cape, flaming orange mane, glowing yellow eyes, golden chest jewel.
  - **Young Link** (`0x1f`): Kokiri green tunic, long elven cap, Deku Shield with red swirl, and Kokiri Sword.
  - **Dr. Mario** (`0x20`): White doctor's lab coat, stethoscope, head mirror, red tie, and dual-colored Megavitamin pill.
  - **Wario** (`0x21`): Yellow shirt, purple denim overalls, green shoes, jagged zigzag moustache, and cleft chin.
  - **Dark Samus** (`0x22`): Phazon-infused biomechanical Power Suit, eerie cyan glowing vents, visor, and arm cannon.
  - **Lucas** (`0x26`): Yellow/red striped shirt, denim shorts, swooping golden hair, and rope snake.
  - **Giga Bowser** (`0x35`): Demonic gargantuan King of Koopas, colossal spiked horns, jagged shell spikes, and razor fangs.
- [`src/characters/remix/remixBatch2.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/characters/remix/remixBatch2.ts):
  - **Marth** (`0x3a`): Hero-King navy tunic, gold trim, tiara, cape with crimson lining, and silver Falchion blade.
  - **Roy** (`0x4a`): Fiery red hair, golden headband, royal purple tunic, shoulder pauldrons, and blazing Sword of Seals.
  - **Mewtwo** (`0x39`): Slender psychic silhouette, purple underbelly/tail curling behind, three-digit pads, and horns.
  - **Sheik** (`0x3e`): Sheikah ninja garb, wrapped face/turban, crimson Sheikah eye crest, and arm wraps.
  - **Peach** (`0x49`): Flowing pink royal gown, dark pink panniers, golden crown, sapphire earrings, and parasol.
  - **Sonic** (`0x3b`): Cobalt blue hedgehog, three aerodynamic quills, tan muzzle/belly, and red power sneakers with white buckles.
  - **Super Sonic** (`0x3d`): Glowing golden quills swept upward, golden body, crimson red eyes, and power aura.
- [`src/characters/remix/remixBatch3.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/characters/remix/remixBatch3.ts):
  - **Wolf** (`0x37`): Fox/Falco rival with grey fur, jagged fur collar, plum pilot jacket, eyepatch with red glint, and blaster.
  - **King Dedede** (`0x40`): Regal blue penguin, scarlet robe with fluffy white trim, yellow beak/feet, crown beanie, and wooden star hammer.
  - **Banjo & Kazooie** (`0x44`): Honey bear with yellow shorts, blue backpack, shark tooth necklace, and Kazooie popping out with crest feathers.
  - **Crash Bandicoot** (`0x48`): Bright orange bandicoot, wild spiky mohawk crest, toothy grin, denim shorts, and big red sneakers.
  - **Conker** (`0x38`): Amber red squirrel, blue zip-up hoodie with yellow zipper pull, giant bushy curled squirrel tail, and blue sneakers.
  - **Sandbag** (`0x3c`): Burlap canvas punchbag, tied top grommet knot, stitched seams, innocent bead eyes, and comical squash/stretch.
  - **Mad Piano** (`0x36`): SM64 haunted grand piano, glossy black cabinet, brass pedals, deep crimson felt maw, and razor predator teeth.
- [`src/characters/remix/remixBatch4.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/characters/remix/remixBatch4.ts):
  - **Marina Liteyears** (`0x3f`): Mischief Makers robotic heroine, silver/purple suit, red belt, yellow antenna ears, and dual rocket thrusters.
  - **Goemon** (`0x41`): Mystical Ninja hero, huge blue spiky hair, white headband, blue haori vest, red kimono, and giant smoking pipe (kiseru).
  - **Peppy Hare** (`0x42`): Star Fox veteran hare, long upright rabbit ears with pink inner ears, flight suit, pilot vest, and communicator headset.
  - **Slippy Toad** (`0x43`): Amphibian mechanic, bulbous frog eyes atop head, blue flight cap, red vest, and tool belt.
  - **Metal Luigi** (`0x45`): Luigi's tall slender silhouette rendered with specular polished chrome and steel facets.
  - **Dr. Luigi** (`0x4b`): Luigi in white lab doctor's coat, green tie, head mirror reflector, and holding an "L"-shaped Megavitamin.
  - **Ebisumaru** (`0x46`): Jolly chubby ninja, round belly, topknot on shaved head, purple garb, and golden folding fan.
  - **Dragon King** (`0x47`): Prototype Smash 64 fighter mannequin from "Kakuto-Geemu: Ryuoh", blocky wireframe facets, and crosshair target visor.
  - **Lanky Kong** (`0x4c`): DK64 orangutan, comical ultra-long stretching arms touching the ground, blue overalls, and red clown nose.

### 3. Renderer Integration & SVG Generation

- **Renderer Dispatch**: Updated [`src/renderer.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/renderer.ts) to dispatch each Remix fighter ID directly to its respective drawing method, preserving fallback compatibility for original 12 variants.
- **SVG Generation**: Updated [`scripts/generateCharacterSvgs.ts`](file:///Users/ness/workspaces/rmgr-viewer/scripts/generateCharacterSvgs.ts) with all 31 Remix fighters and regenerated SVGs into `public/characters/` and `characters-svg/`.
- **Character Sizes & Icons**: Updated [`src/characterSizes.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/characterSizes.ts) and [`src/characterIcons.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/characterIcons.ts) with accurate size constants and icon mappings.

## Verification & Test Results

- **Automated Tests**: 399 unit tests passing across 20 test suites (`vitest run`).
  - Added dedicated test coverage in [`src/renderer.test.ts`](file:///Users/ness/workspaces/rmgr-viewer/src/renderer.test.ts) verifying all 31 Remix fighters render without errors across Mountain, Autumn, and Grid themes, as well as under opponent desaturation/hitstun/taunt states.
- **Static Checks**:
  - `npm run typecheck`: 0 TypeScript errors.
  - `npm run lint`: 0 ESLint errors/warnings.
  - `npm run format`: All files correctly formatted with Prettier.
  - `npm run build`: Production bundle built successfully.
