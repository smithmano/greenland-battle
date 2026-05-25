# Greenland Battle - Tower Defense Game

A full-featured tower defense game built with pure HTML5 Canvas and JavaScript.

## Features

### Player
- **Full Movement**: WASD or Arrow keys to move around the Greenland map
- **Multiple Weapons**: Choose up to 3 weapons (Sword, Bow, Spear, Battle Axe, Crossbow)
- **Health System**: 100 HP with auto-heal (1% per 3 seconds without damage)
- **Respawn System**: Respawn after 20 seconds when defeated
- **Damage Indicator**: Character turns red for 0.1s when taking damage

### Tower
- **Starting Health**: 1000 HP
- **Game Over**: When tower is destroyed, the game ends
- **Protection**: Defend it from enemy waves

### Enemies (25+ Types)
Enemies get progressively stronger each round (+8% health and damage):

**Round 1+**: Swordman, Archer
**Round 2+**: Shieldmen, Rusher (4x damage to tower)
**Round 3+**: Spearman
**Round 4+**: Fireman (DoT burn damage)
**Round 6+**: Assassin (3x damage to tower)
**Round 7+**: Bomber (explosion on approach)
**Round 8+**: Maceman, Healer
**Round 9+**: Flagguy (speed boost), Knight (stun)
**Round 11+**: Longswordman, Axeman
**Round 12+**: Crossbowmen
**Round 13+**: Horseknight, Magician (stun)
**Round 14+**: Giant (multi-hit), Boss enemies every 5 rounds

### Ally System
- **Swordman Ally**: Melee fighter (200 coins)
- **Archer Ally**: Ranged attacker (250 coins)
- **Healer Ally**: Heals nearby allies (300 coins)
- **Respawn**: 30 seconds after defeat
- **Spawn Location**: Top middle of the map

### Shop System
- **Stat Upgrades**: Max Health, Melee Damage, Ranged Damage
- **Weapon Selection**: Choose up to 3 weapons
- **Ally Unlock**: Purchase and unlock different ally types
- **Dynamic Pricing**: Prices increase with each upgrade level

### Controls

**Desktop**:
- WASD or Arrow Keys - Move
- Click on enemies to attack
- Right-click to open shop

**Mobile**:
- Joystick in bottom-left corner for movement
- Tap button to open shop

### Progression

1. **Stand on Green Start Button** to begin a round
2. **Survive enemy waves** and defeat all enemies to end the round
3. **Earn coins** by killing enemies and defeating bosses
4. **Upgrade stats and weapons** in the shop
5. **Unlock allies** to help in battle
6. **Reach higher rounds** to unlock new enemy types

### Game Stats Displayed
- Current Round
- Player Health
- Coins earned
- Active Enemies
- Tower Health

---

## How to Play

1. Open `index.html` in a modern web browser
2. Click the green START button at the bottom to begin Round 1
3. Use WASD/Arrows to move and attack nearby enemies
4. Defend the green tower in the center
5. Click SHOP button to upgrade and purchase items
6. Survive all rounds and progress!

## Files

- `index.html` - Main game interface
- `game.js` - Complete game logic and mechanics
- `README.md` - This file

---

Enjoy the game! 🎮⚔️
