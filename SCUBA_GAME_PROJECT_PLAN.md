# Scuba Explorer — Localhost Game Project Plan

## 1. Project concept

A single-player scuba exploration game for a school project. The player explores underwater environments, manages oxygen and physical effort, completes missions, and returns safely to earn points. Earned points purchase better tanks, suits, and other equipment. Completing objectives unlocks deeper and more challenging maps.

The game uses **2.5D presentation: a 3D underwater world viewed through a fixed side camera**, with player movement limited to left, right, up, and down. This provides the appearance of a 3D sea while keeping controls and level design as simple as a 2D game.

The educational focus is cause and effect: swimming harder increases fatigue and heart rate, which increases oxygen consumption. Planning a return trip and managing resources should produce better results than diving recklessly.

All physiology values and formulas below are simplified game rules, not medical models or real diving instructions.

## 2. Project scope and localhost setup

- Platform: desktop web browser, running from a local development server.
- Initial mode: offline single-player, with no account or multiplayer requirement.
- Presentation: 3D models, lighting, and scenery with a side-on camera.
- Controls: keyboard movement and interaction buttons.
- Persistence: local browser storage for purchased equipment, points, settings, and map unlocks.
- Runtime: the frontend handles gameplay; a database and backend are unnecessary for the first version.
- Assets: bundle models, textures, audio, and fonts locally so gameplay does not depend on internet access.
- Development workflow: install dependencies once, start the project's development server, and open the localhost address it prints. Exact commands will be documented after the application framework is selected.

Keep rendering, simulation, interface, and save data separate. Choose a browser-compatible 3D renderer during implementation; use simple placeholder shapes before detailed assets.

## 3. Main gameplay loop

1. Start at the dock and choose an unlocked map.
2. Review the mission, equipment, and map difficulty.
3. Equip a tank, suit, and fins.
4. Enter the water and explore within the map boundaries.
5. Manage oxygen, stamina, heart rate, fatigue, and health.
6. Collect mission items, document wildlife, and reach depth checkpoints.
7. Return to the marked exit before resources run out.
8. Receive a results summary and bank earned points.
9. Purchase upgrades and unlock the next map.

A normal dive should last approximately 3–6 minutes for an accessible classroom demonstration.

## 4. Player resources and their relationships

| Resource | Meaning in the game | What changes it | Gameplay consequence |
| --- | --- | --- | --- |
| Oxygen | Remaining usable breathing-gas supply, displayed as a percentage | Time, depth, effort, elevated heart rate, tank size | Forces the player to plan a return |
| Stamina | Short-term strength for swimming and carrying objects | Fast swimming and heavy tasks consume it; gentle movement restores it | Limits sprinting and demanding interactions |
| Heart rate | A visible indicator of exertion and stress | Effort, hazards, low oxygen, and fatigue raise it; calm movement lowers it | Higher values increase oxygen use |
| Fatigue | Accumulated tiredness across one dive | Sustained effort and heavy loads increase it | Slows stamina recovery and reduces movement efficiency |
| Health | Remaining ability to finish the dive | Collisions, hazards, and oxygen depletion reduce it | Reaching zero ends the attempt |
| Depth | Distance below the water surface | Vertical movement | Increases challenge and awards one-time depth milestones |

Use stamina for the user's requested “strength” system. Avoid a second strength bar in the first version because it would overlap with stamina. Equipment can separately control carrying capacity.

### Example simulation rules

These are starting balance values to adjust through playtesting. They must be calculated using elapsed time so different frame rates produce similar outcomes.

```text
dt = elapsed simulation time in seconds
effort = 0.0 while resting, 0.4 while swimming, 1.0 while sprinting
depthFactor = 1 + depthMeters / 30
heartFactor = 1 + max(0, heartRate - 80) / 160

oxygenUsed = baseUse * depthFactor * (1 + effort) * heartFactor * dt
oxygenRemaining = clamp(oxygenRemaining - oxygenUsed, 0, tankCapacity)
oxygenPercent = 100 * oxygenRemaining / tankCapacity

targetHeartRate = clamp(75 + 55 * effort + 0.25 * fatigue + stress, 60, 180)
heartRate += (targetHeartRate - heartRate) * min(1, 0.8 * dt)

if sprinting:
    stamina -= 18 * dt
    fatigue += 1.5 * dt
else if gentlySwimmingOrResting:
    stamina += 10 * (1 - fatigue / 150) * dt
    fatigue -= 0.4 * dt

stamina = clamp(stamina, 0, 100)
fatigue = clamp(fatigue, 0, 100)
```

- Oxygen uses fictional resource units. Set the starter tank to 100 units and initially test `baseUse = 0.18` units per second.
- Greater tank capacity extends a dive without changing the consumption formula.
- Begin with `stress = 0` normally and `stress = 20` while a nearby hazard or critical oxygen warning is active; do not stack stress repeatedly each frame.
- Disable sprint below 10 stamina and re-enable it above 20 to prevent rapid on/off switching.
- At zero oxygen, reduce health over time; at zero health, end the dive once.
- Rest can improve stamina and fatigue, but oxygen continues decreasing underwater.
- Pause stops the simulation. Resume must not count time spent paused.

## 5. Real-life-inspired scenarios

| Scenario | Player decision | Logic demonstrated |
| --- | --- | --- |
| Swimming against a current | Sprint through it or find a sheltered route | More effort costs more oxygen and stamina |
| Carrying recovered equipment | Carry it immediately or return after exploring | Heavy loads reduce speed and increase effort |
| Low oxygen far from the exit | Stop exploring and return along the known route | Remaining resources constrain decisions |
| Sustained fast swimming | Slow down before stamina is exhausted | Short-term speed can create long-term fatigue |
| Contact with a hazardous animal | Give it space and change route | Observation and avoidance protect health |
| A coral passage | Navigate through the opening carefully | Position, collision, and environmental awareness |
| A deeper mission | Buy suitable equipment and select a manageable route | Preparation affects available opportunities |

For the initial release, use currents, carrying weight, and low oxygen. Add more complex scenarios after the core loop works. Detailed decompression, gas mixtures, and medical emergency simulation are outside the school-project scope.

## 6. Points, rewards, and upgrades

### Reward rules

Exploring deeper should earn more points, but repeatedly moving up and down must not generate unlimited rewards.

| Achievement | Initial reward |
| --- | ---: |
| First visit to a depth checkpoint during the dive | 50 points |
| Recover a mission item | 100 points |
| Document a unique wildlife species during the dive | 30 points |
| Finish the map's main objective | 250 points |
| Return with the objective complete and at least 25% oxygen | 100 points |

- Track checkpoint and wildlife IDs in sets so each reward is counted once per dive.
- Use four depth checkpoints per map, making a maximum of 200 depth points per dive.
- Keep rewards as provisional dive points until the player reaches the exit.
- A successful return banks provisional points once. Failure loses provisional points but preserves previously banked currency and equipment.
- Maintain lifetime earned points separately from spendable points so shopping does not reduce achievement progress.
- Do not award points merely for waiting underwater or touching the exit.
- Allow replaying completed maps to earn more currency; collectable objects respawn only when a new dive begins.
- Reward cleanup and observation rather than collecting or damaging living coral.

### Initial shop balance

| Equipment | Price | Effect |
| --- | ---: | --- |
| Starter tank | Free | 100 oxygen units |
| Improved tank | 600 | 140 oxygen units |
| Advanced tank | 1,200 | 180 oxygen units |
| Starter suit | Free | Standard protection |
| Reinforced suit | 700 | Reduces collision damage by 20% |
| Exploration suit | 1,400 | Reduces collision damage by 30% and fatigue gain by 15% |
| Efficient fins | 500 | Reduces swimming effort cost by 10% |
| Dive light | 400 | Improves visibility in darker maps |

Only one item per equipment slot can be equipped. Equipment effects replace the previous item in that slot; they do not stack through repeated purchases. Owned equipment remains available permanently. The shop must reject purchases when points are insufficient and prevent duplicate charges.

## 7. Map progression, locks, and boundaries

| Map | Visual identity | Main objective | Unlock requirement | Main challenge |
| --- | --- | --- | --- | --- |
| 1. Training Lagoon | Bright shallow water, sand, seagrass, small coral groups | Recover three training markers and return | Available immediately | Learn resource management |
| 2. Coral Reef | Dense coral formations, fish schools, rock arches | Document three species and retrieve a sensor | Successfully complete Training Lagoon | Currents and narrow routes |
| 3. Sunken Wreck | Ship sections, scattered cargo, darker water | Recover the research log | Complete Coral Reef and own Improved Tank or better | Longer return route and carrying weight |
| 4. Deep Research Zone | Steep seabed, darker background, research equipment | Repair two sensor stations and return | Complete Sunken Wreck, own Advanced Tank and Dive Light | High oxygen demand and demanding navigation |

Map 1 is the minimum playable deliverable. Maps 2–4 are expansion milestones.

### Boundary design

- Give every level explicit left, right, surface, and bottom limits.
- Use rock walls, seabed slopes, buoys, or visible ropes to explain playable boundaries.
- Keep coral and decorative objects behind or in front of the movement plane unless they are intended obstacles.
- Mark impassable obstacles consistently and use simple collision shapes that match their visible outline.
- Show locked maps in the selection screen with their exact requirements.
- Validate requirements when launching a dive, as well as when drawing the selection screen.
- Keep the exit reachable throughout the dive; upgrades must not trap a player already inside a map.
- Cap current strength so ordinary swimming can escape it in the starting map.

## 8. Underwater visual design

Aim for believable shape, depth, and atmosphere using a manageable number of assets.

- Fixed side camera with a slight angle to show the volume of the diver and scenery.
- Layered foreground coral, playable middle area, and distant background terrain.
- Uneven sandy seabed, rock ledges, reef clusters, and seagrass rather than a flat floor.
- Blue-green water that becomes darker with depth.
- Soft light rays near the surface, underwater haze, and subtle floating particles.
- Bubbles from the diver and simple fish movement for a living environment.
- Gentle plant movement and restrained ambient sound.
- Strong visual contrast around the player, exits, mission items, and hazards.
- Reuse coral and rock models with varied scale and rotation to reduce asset workload.

Start with low-detail models and simple lighting. Add shadows and other expensive effects only after checking performance on the laptop used for the school demonstration.

## 9. Controls and interface

| Input | Action |
| --- | --- |
| WASD or arrow keys | Swim horizontally and vertically |
| Shift | Swim faster while stamina allows |
| E | Interact with an object or exit |
| Escape | Pause or resume |

Normalize diagonal movement so it is not faster than horizontal movement. Prevent gameplay keys from scrolling the browser page while the game has focus.

### Main screens

1. Main menu: New Game, Continue, Settings, and How to Play.
2. Dock: map selection, equipment slots, shop, and spendable points.
3. Dive: gameplay and resource HUD.
4. Pause: controls, resume, and abandon dive.
5. Results: objective progress, deepest point, reward breakdown, and banked total.

### Dive HUD

- Oxygen as the largest resource indicator, with number and bar.
- Stamina, fatigue, health, and heart rate clearly labeled.
- Current depth, provisional points, and current mission.
- A direction marker toward the exit.
- Oxygen warnings at 30% and 15%, using text and icons as well as color.
- Brief cause-and-effect messages such as “Fast swimming increases oxygen use.”

Provide mute controls and reduced camera motion. A simulated heartbeat sound can accompany exertion, but it should remain optional.

## 10. Suggested project organization

```text
scuba-explorer/
  public/
    assets/
      models/
      textures/
      audio/
  src/
    game/           # Game loop, state transitions, pause behavior
    player/         # Movement, interactions, resource simulation
    world/          # Camera, scenery, collisions, currents
    missions/       # Objectives and completion rules
    economy/        # Rewards, shop purchases, equipment effects
    progression/    # Unlock requirements and completion records
    ui/             # Menus, HUD, warnings, results
    data/           # Map definitions, item catalog, balance values
    storage/        # Save loading, validation, and migration
  tests/            # Logic and integration checks
  README.md
```

Use configuration data for equipment prices, oxygen capacity, map limits, hazards, and mission requirements. This lets the team tune the game without rewriting its systems.

### Persistent save data

```json
{
  "saveVersion": 1,
  "spendablePoints": 0,
  "lifetimePoints": 0,
  "ownedEquipment": ["starter_tank", "starter_suit", "starter_fins"],
  "equipped": {
    "tank": "starter_tank",
    "suit": "starter_suit",
    "fins": "starter_fins",
    "light": null
  },
  "completedMaps": [],
  "bestDepthByMap": {},
  "settings": { "soundEnabled": true, "reducedMotion": false }
}
```

Derive map unlocks from completion records and equipment ownership. Save after a purchase, equipment change, completed dive, or settings change. Validate loaded values and recover safely from malformed saves. Explain that browser storage is local to the browser and may be lost when its data is cleared.

Do not save an active dive in the first version. Reloading during a dive returns to the dock without banking provisional rewards. Warn before replacing an existing save with New Game.

## 11. Development milestones

### Milestone 1 — Playable movement prototype

- Create the browser application and local development workflow.
- Add a placeholder diver, fixed camera, and simple underwater scene.
- Implement movement, collisions, map limits, and a marked exit.
- Deliverable: the player can explore one bounded area and return.

### Milestone 2 — Resource simulation

- Implement oxygen, stamina, heart rate, fatigue, and health.
- Add the HUD, warnings, pause, and failure state.
- Deliverable: different movement choices visibly change resource usage.

### Milestone 3 — Complete one-dive loop

- Add the training mission, depth checkpoints, provisional rewards, and results.
- Bank rewards only after a successful exit.
- Deliverable: one complete, replayable Training Lagoon dive.

### Milestone 4 — Economy and progression

- Add the dock, shop, equipment effects, local saves, and map locks.
- Build Coral Reef using the existing systems.
- Deliverable: earn points, buy a tank, reload, and continue progression.

### Milestone 5 — Presentation and expansion

- Replace placeholders with coral, rocks, fish, diver, and seabed models.
- Add atmosphere, audio, and a short tutorial.
- Add the wreck and deep zone only if the first two maps are stable.
- Deliverable: a polished demonstration build with a documented feature list.

### Milestone 6 — Classroom preparation

- Check the complete progression on the demonstration laptop.
- Verify that locally bundled assets work without internet after setup.
- Prepare startup instructions, screenshots, and a short explanation of formulas.
- Deliverable: a reliable localhost demonstration and project documentation.

## 12. Verification and acceptance criteria

### Logic checks

- Equal-duration simulations at different frame rates consume approximately equal oxygen.
- Sprinting consumes more oxygen than gentle swimming at the same depth.
- Greater depth increases oxygen use for otherwise identical conditions.
- An upgraded tank lasts longer under identical conditions.
- Stamina, fatigue, oxygen, and health remain within valid bounds.
- Pausing does not change player resources or mission time.
- Repeated contact with the same depth checkpoint does not duplicate its reward.
- Successful exit banks rewards once; failure banks none.
- Purchases deduct the correct amount once and persist after reload.
- Locked maps cannot be launched until their requirements are met.
- Corrupt or missing save data does not crash the game.

### Playability checks

- A new player can complete Training Lagoon using starter equipment.
- The player can identify the exit and understand oxygen warnings.
- Boundaries and coral collisions do not trap the player.
- The normal route allows a reasonable oxygen margin for the return trip.
- The HUD remains readable at the classroom laptop's resolution.
- The complete dock → dive → results → shop loop works repeatedly.
- Aim for at least 30 frames per second on the demonstration laptop; lower visual detail if needed.

## 13. School presentation outline

1. Explain the problem: balancing exploration rewards against limited resources.
2. Demonstrate how sprinting affects stamina, heart rate, and oxygen.
3. Show how depth changes oxygen consumption in the game's model.
4. Complete a mission and return to bank points.
5. Buy a better tank and demonstrate its effect.
6. Show a locked map and explain its logical requirements.
7. Explain the programming concepts: variables, conditions, game loops, formulas, collision checks, sets, and persistent data.
8. State which real-life relationships inspired the mechanics and which values were simplified for gameplay.

## 14. Minimum submission target

The minimum complete school project is **one visually coherent underwater map, a controllable diver, the six resource indicators, one mission, safe-return scoring, a working tank upgrade, a locked second-map preview, and persistent local progress**.

Finish this complete loop before expanding the world. The final expanded target is four maps with progressively harder missions and meaningful equipment choices.
