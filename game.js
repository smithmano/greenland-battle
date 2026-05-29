const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game object
const game = {
    round: 0,
    gameStarted: false,
    gameOver: false,
    coins: 0,
    player: null,
    tower: null,
    enemies: [],
    allies: [],
    particles: [],
    keys: {},
    mousePos: { x: 0, y: 0 },
    camera: { x: 0, y: 0 },
    animationFrame: 0,
    
    upgrades: {
        maxHealthLevel: 1,
        meleeDamageLevel: 1,
        rangedDamageLevel: 1,
        
        upgradeMaxHealth() {
            const cost = 100 * this.maxHealthLevel;
            if (game.coins >= cost) {
                game.coins -= cost;
                this.maxHealthLevel++;
                const increase = 20;
                game.player.maxHealth += increase;
                game.player.health += increase;
                updateUI();
            }
        },
        
        upgradeMeleeDamage() {
            const cost = 100 * this.meleeDamageLevel;
            if (game.coins >= cost) {
                game.coins -= cost;
                this.meleeDamageLevel++;
                updateUI();
            }
        },
        
        upgradeRangedDamage() {
            const cost = 100 * this.rangedDamageLevel;
            if (game.coins >= cost) {
                game.coins -= cost;
                this.rangedDamageLevel++;
                updateUI();
            }
        }
    },
    
    upgradeManager: {
        selectedWeapons: ['sword'],
        unlockedAllies: {},
        
        toggleWeapon(weaponType) {
            const index = this.selectedWeapons.indexOf(weaponType);
            if (index > -1) {
                this.selectedWeapons.splice(index, 1);
            } else if (this.selectedWeapons.length < 3) {
                this.selectedWeapons.push(weaponType);
            }
            updateWeaponButtons();
        },
        
        unlockAlly(allyType) {
            const costs = {
                swordmanAlly: 200,
                archerAlly: 250,
                healerAlly: 300
            };
            const cost = costs[allyType];
            
            if (!this.unlockedAllies[allyType]) {
                this.unlockedAllies[allyType] = 0;
            }
            
            const nextCost = cost * (this.unlockedAllies[allyType] + 1);
            
            if (game.coins >= nextCost) {
                game.coins -= nextCost;
                this.unlockedAllies[allyType]++;
                updateUI();
            }
        }
    },
    
    openShop() {
        document.getElementById('shopModal').style.display = 'block';
    },
    
    closeShop() {
        document.getElementById('shopModal').style.display = 'none';
    }
};

// Particle system for visual effects
class Particle {
    constructor(x, y, vx, vy, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // gravity
        this.life--;
    }
    
    draw() {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.maxHealth = 100;
        this.health = 100;
        this.speed = 5;
        this.vx = 0;
        this.vy = 0;
        this.color = '#00FF00';
        this.damageColor = '#FF0000';
        this.isRed = false;
        this.redTimer = 0;
        this.lastHitTime = 0;
        this.healInterval = 3000;
        this.respawnTime = 20000;
        this.isDead = false;
        this.deathTime = 0;
        this.attackCooldown = 0;
        this.attackRange = 40;
        this.currentWeapon = 'sword';
        this.animationCounter = 0;
    }
    
    update() {
        if (this.isDead) {
            this.deathTime += 16;
            if (this.deathTime >= this.respawnTime) {
                this.respawn();
            }
            return;
        }
        
        this.vx = 0;
        this.vy = 0;
        
        if (game.keys['ArrowUp'] || game.keys['w'] || game.keys['W']) this.vy -= this.speed;
        if (game.keys['ArrowDown'] || game.keys['s'] || game.keys['S']) this.vy += this.speed;
        if (game.keys['ArrowLeft'] || game.keys['a'] || game.keys['A']) this.vx -= this.speed;
        if (game.keys['ArrowRight'] || game.keys['d'] || game.keys['D']) this.vx += this.speed;
        
        this.x += this.vx;
        this.y += this.vy;
        
        this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));
        this.y = Math.max(0, Math.min(this.y, canvas.height - this.height));
        
        if (Date.now() - this.lastHitTime > this.healInterval && this.health < this.maxHealth) {
            const healAmount = this.maxHealth * 0.01;
            this.health = Math.min(this.maxHealth, this.health + healAmount);
        }
        
        if (this.isRed) {
            this.redTimer -= 16;
            if (this.redTimer <= 0) {
                this.isRed = false;
            }
        }
        
        if (this.attackCooldown > 0) {
            this.attackCooldown -= 16;
        }
        
        this.animationCounter++;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.lastHitTime = Date.now();
        this.isRed = true;
        this.redTimer = 100;
        
        // Create damage particles
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5;
            const vx = Math.cos(angle) * 3;
            const vy = Math.sin(angle) * 3;
            game.particles.push(new Particle(this.x, this.y, vx, vy, '#FF0000', 30));
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        this.isDead = true;
        this.deathTime = 0;
    }
    
    respawn() {
        this.isDead = false;
        this.health = this.maxHealth;
        this.x = canvas.width / 2;
        this.y = 50;
    }
    
    draw() {
        if (this.isDead) {
            ctx.globalAlpha = 0.5;
        }
        
        const color = this.isRed ? this.damageColor : this.color;
        
        // Draw body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x - 8, this.y - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 8, this.y - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw mouth
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y + 3, 5, 0, Math.PI);
        ctx.stroke();
        
        // Draw weapon indicator
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw health bar
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 15, this.width, 4);
        ctx.fillStyle = '#00FF00';
        const healthPercent = this.health / this.maxHealth;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 15, this.width * healthPercent, 4);
        
        ctx.globalAlpha = 1;
    }
    
    attack(enemies) {
        if (this.attackCooldown > 0 || this.isDead) return;
        
        const weapons = game.upgradeManager.selectedWeapons;
        if (weapons.length === 0) return;
        
        const weapon = weapons[0];
        let damage, range, type;
        
        if (weapon === 'sword') {
            damage = Math.random() * 5 + 15 + (game.upgrades.meleeDamageLevel - 1) * 2;
            range = 50;
            type = 'melee';
        } else if (weapon === 'bow') {
            damage = Math.random() * 5 + 10 + (game.upgrades.rangedDamageLevel - 1) * 2;
            range = 200;
            type = 'ranged';
        } else if (weapon === 'spear') {
            damage = Math.random() * 4 + 12 + (game.upgrades.meleeDamageLevel - 1) * 2;
            range = 80;
            type = 'melee';
        } else if (weapon === 'battleAxe') {
            damage = Math.random() * 7 + 18 + (game.upgrades.meleeDamageLevel - 1) * 3;
            range = 60;
            type = 'melee';
        } else if (weapon === 'crossbow') {
            damage = Math.random() * 5 + 13 + (game.upgrades.rangedDamageLevel - 1) * 2;
            range = 220;
            type = 'ranged';
        }
        
        for (let enemy of enemies) {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < range) {
                enemy.takeDamage(damage);
                this.attackCooldown = 300;
            }
        }
    }
}

class Enemy {
    constructor(x, y, type, round) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.round = round;
        this.width = 25;
        this.height = 25;
        this.color = '#FF0000';
        this.vx = 0;
        this.vy = 0;
        this.attackCooldown = 0;
        this.isBoss = false;
        this.auraAlpha = 0;
        this.animationCounter = 0;
        
        this.initializeStats();
    }
    
    initializeStats() {
        const multiplier = 1 + (this.round - 1) * 0.08;
        
        const baseStats = {
            swordman: { health: 100, minDamage: 10, maxDamage: 14, speed: 0.8, range: 40, special: 'melee', color: '#FF4444' },
            archer: { health: 80, minDamage: 7, maxDamage: 12, speed: 0.8, range: 180, special: 'ranged', color: '#FF6633' },
            shieldmen: { health: 85, minDamage: 3, maxDamage: 4, shieldHealth: 80, speed: 0.6, range: 40, special: 'shield', color: '#FF9944' },
            rusher: { health: 50, minDamage: 7, maxDamage: 9, speed: 1.2, range: 40, special: 'rusher', towerDamageMultiplier: 4, color: '#FF2222' },
            spearman: { health: 115, minDamage: 9, maxDamage: 12, speed: 0.7, range: 60, special: 'melee', color: '#FF5555' },
            fireman: { health: 65, minDamage: 10, maxDamage: 13, speed: 0.9, range: 150, special: 'fire', burnDamage: 1, burnDuration: 4000, color: '#FF8800' },
            assassin: { health: 70, minDamage: 30, maxDamage: 13, speed: 0.8, range: 40, special: 'assassin', firstHit: 30, normalDamage: 10, towerDamageMultiplier: 3, color: '#330033' },
            bomber: { health: 30, minDamage: 0, maxDamage: 0, speed: 0.9, range: 40, special: 'bomber', explodeDamage: 130, explodeRange: 100, color: '#CC3300' },
            maceman: { health: 140, minDamage: 13, maxDamage: 19, speed: 0.6, range: 40, special: 'maceman', color: '#DD4444' },
            healer: { health: 60, minDamage: 5, maxDamage: 5, speed: 0.8, range: 150, special: 'healer', healAmount: 5, color: '#FF0099' },
            flagguy: { health: 90, minDamage: 0, maxDamage: 0, speed: 0.9, range: 150, special: 'flagguy', speedBoost: 3, color: '#FF1111' },
            knight: { health: 150, minDamage: 13, maxDamage: 17, shieldHealth: 135, speed: 0.7, range: 40, special: 'knight', rushRange: 100, stun: 0.5, color: '#FF7777' },
            longswordman: { health: 100, minDamage: 12, maxDamage: 16, shieldHealth: 15, speed: 0.8, range: 70, special: 'melee', color: '#FF5555' },
            axeman: { health: 95, minDamage: 14, maxDamage: 18, speed: 0.9, range: 40, special: 'axeman', color: '#CC2222' },
            crossbowmen: { health: 90, minDamage: 11, maxDamage: 13, speed: 0.6, range: 200, special: 'ranged', color: '#FF8844' },
            horseknight: { health: 125, minDamage: 18, maxDamage: 22, shieldHealth: 150, speed: 1.0, range: 40, special: 'horseknight', color: '#FF6666' },
            magician: { health: 70, minDamage: 4, maxDamage: 8, speed: 0.7, range: 180, special: 'magician', stun: 0.8, color: '#9933FF' },
            giant: { health: 400, minDamage: 45, maxDamage: 55, speed: 0.5, range: 60, special: 'giant', color: '#CC0000' }
        };
        
        const stats = baseStats[this.type] || baseStats.swordman;
        this.maxHealth = Math.floor(stats.health * multiplier);
        this.health = this.maxHealth;
        this.minDamage = Math.floor(stats.minDamage * multiplier);
        this.maxDamage = Math.floor(stats.maxDamage * multiplier);
        this.speed = stats.speed;
        this.range = stats.range;
        this.special = stats.special;
        this.color = stats.color;
        
        if (stats.shieldHealth) {
            this.shieldHealth = Math.floor(stats.shieldHealth * multiplier);
            this.maxShieldHealth = this.shieldHealth;
        }
        
        Object.keys(stats).forEach(key => {
            if (key !== 'health' && key !== 'minDamage' && key !== 'maxDamage' && key !== 'speed' && key !== 'range' && key !== 'special' && key !== 'shieldHealth' && key !== 'color') {
                this[key] = stats[key];
            }
        });
    }
    
    update() {
        const target = game.player;
        
        if (!target || target.isDead) {
            const dx = game.tower.x - this.x;
            const dy = game.tower.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 1) {
                this.vx = (dx / dist) * this.speed;
                this.vy = (dy / dist) * this.speed;
            }
        } else {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < this.range) {
                this.vx = 0;
                this.vy = 0;
                if (this.attackCooldown <= 0) {
                    this.attack(target);
                }
            } else {
                if (dist > 1) {
                    this.vx = (dx / dist) * this.speed;
                    this.vy = (dy / dist) * this.speed;
                }
            }
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.attackCooldown > 0) {
            this.attackCooldown -= 16;
        }
        
        this.animationCounter++;
    }
    
    attack(target) {
        let damage;
        
        if (this.special === 'assassin') {
            if (!this.hasHit) {
                damage = this.firstHit;
                this.hasHit = true;
            } else {
                damage = Math.random() * (this.maxDamage - this.minDamage) + this.minDamage;
            }
        } else {
            damage = Math.random() * (this.maxDamage - this.minDamage) + this.minDamage;
        }
        
        target.takeDamage(damage);
        this.attackCooldown = 800;
    }
    
    takeDamage(amount) {
        if (this.shieldHealth && this.shieldHealth > 0) {
            this.shieldHealth -= amount;
            if (this.shieldHealth < 0) {
                this.health += this.shieldHealth;
                this.shieldHealth = 0;
            }
        } else {
            this.health -= amount;
        }
        
        // Create damage particles
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const vx = Math.cos(angle) * 2;
            const vy = Math.sin(angle) * 2;
            game.particles.push(new Particle(this.x, this.y, vx, vy, '#FFAA00', 20));
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        game.coins += 10;
        
        // Create death particles
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10;
            const vx = Math.cos(angle) * 4;
            const vy = Math.sin(angle) * 4;
            game.particles.push(new Particle(this.x, this.y, vx, vy, this.color, 40));
        }
        
        game.enemies = game.enemies.filter(e => e !== this);
    }
    
    draw() {
        // Draw body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes based on type
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(this.x - 6, this.y - 4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 6, this.y - 4, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw special effects
        if (this.special === 'fire') {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2 + 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.shieldHealth && this.shieldHealth > 0) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2 + 8, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw health bar
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, this.width, 3);
        ctx.fillStyle = '#00FF00';
        const healthPercent = this.health / this.maxHealth;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, this.width * healthPercent, 3);
        
        // Draw boss aura
        if (this.isBoss) {
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(game.animationFrame * 0.05) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2 + 15, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

class Ally {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 25;
        this.height = 25;
        this.color = '#00FF00';
        this.vx = 0;
        this.vy = 0;
        this.attackCooldown = 0;
        this.animationCounter = 0;
        
        const stats = {
            swordmanAlly: { health: 80, minDamage: 8, maxDamage: 12, speed: 2, range: 40, color: '#00DD00' },
            archerAlly: { health: 60, minDamage: 6, maxDamage: 10, speed: 2, range: 150, color: '#00FF88' },
            healerAlly: { health: 50, minDamage: 0, maxDamage: 0, speed: 1.5, range: 200, healAmount: 8, color: '#00FFFF' }
        };
        
        const stat = stats[type] || stats.swordmanAlly;
        this.maxHealth = stat.health;
        this.health = stat.health;
        this.minDamage = stat.minDamage;
        this.maxDamage = stat.maxDamage;
        this.speed = stat.speed;
        this.range = stat.range;
        this.healAmount = stat.healAmount || 0;
        this.color = stat.color;
        this.spawnTime = Date.now();
    }
    
    update() {
        const enemies = game.enemies;
        
        if (enemies.length === 0) return;
        
        let target = enemies[0];
        let minDist = Math.hypot(target.x - this.x, target.y - this.y);
        
        for (let enemy of enemies) {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < minDist) {
                target = enemy;
                minDist = dist;
            }
        }
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < this.range) {
            this.vx = 0;
            this.vy = 0;
            if (this.attackCooldown <= 0) {
                this.attack(target);
            }
        } else {
            if (dist > 1) {
                this.vx = (dx / dist) * this.speed;
                this.vy = (dy / dist) * this.speed;
            }
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.attackCooldown > 0) {
            this.attackCooldown -= 16;
        }
        
        if (this.health <= 0 && Date.now() - this.spawnTime > 30000) {
            this.health = this.maxHealth;
            this.x = canvas.width / 2;
            this.y = 50;
            this.spawnTime = Date.now();
        }
        
        this.animationCounter++;
    }
    
    attack(target) {
        if (this.healAmount > 0) {
            for (let ally of game.allies) {
                const dist = Math.hypot(ally.x - this.x, ally.y - this.y);
                if (dist < this.range && ally !== this) {
                    ally.health = Math.min(ally.maxHealth, ally.health + this.healAmount);
                    // Create heal particles
                    for (let i = 0; i < 3; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const vx = Math.cos(angle);
                        const vy = Math.sin(angle);
                        game.particles.push(new Particle(ally.x, ally.y, vx, vy, '#00FF00', 20));
                    }
                }
            }
        } else {
            const damage = Math.random() * (this.maxDamage - this.minDamage) + this.minDamage;
            target.takeDamage(damage);
        }
        this.attackCooldown = 600;
    }
    
    takeDamage(amount) {
        this.health -= amount;
    }
    
    draw() {
        if (this.health <= 0) return;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 5, this.y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw health bar
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, this.width, 3);
        ctx.fillStyle = '#00FF00';
        const healthPercent = this.health / this.maxHealth;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, this.width * healthPercent, 3);
    }
}

class Tower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 60;
        this.maxHealth = 1000;
        this.health = 1000;
        this.color = '#4CAF50';
        this.animationCounter = 0;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            game.gameOver = true;
        }
    }
    
    draw() {
        // Draw tower base
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        // Draw tower outline
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        // Draw tower details
        ctx.fillStyle = '#66BB6A';
        ctx.fillRect(this.x - this.width / 4, this.y - this.height / 4, this.width / 2, this.height / 2);
        
        // Draw tower spikes
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i;
            const px = this.x + Math.cos(angle) * (this.width / 2);
            const py = this.y + Math.sin(angle) * (this.height / 2);
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw health bar
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - this.width / 2 - 40, this.y + this.height / 2 + 10, 120, 10);
        ctx.fillStyle = '#00FF00';
        const healthPercent = this.health / this.maxHealth;
        ctx.fillRect(this.x - this.width / 2 - 40, this.y + this.height / 2 + 10, 120 * healthPercent, 10);
        
        // Draw tower glow when low health
        if (this.health < this.maxHealth * 0.3) {
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(this.animationCounter * 0.05) * 0.2})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2 + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        this.animationCounter++;
    }
}

class StartButton {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 40;
        this.color = '#00FF00';
        this.animationCounter = 0;
    }
    
    contains(x, y) {
        return x > this.x - this.width / 2 && x < this.x + this.width / 2 &&
               y > this.y - this.height / 2 && y < this.y + this.height / 2;
    }
    
    draw() {
        // Draw button glow
        ctx.fillStyle = `rgba(0, 255, 0, ${0.2 + Math.sin(this.animationCounter * 0.05) * 0.1})`;
        ctx.fillRect(this.x - this.width / 2 - 5, this.y - this.height / 2 - 5, this.width + 10, this.height + 10);
        
        // Draw button
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        // Draw button border
        ctx.strokeStyle = '#00AA00';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        // Draw text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('START', this.x, this.y);
        
        this.animationCounter++;
    }
}

// Map decorations
class MapDecorations {
    constructor() {
        this.trees = this.generateTrees();
        this.rocks = this.generateRocks();
        this.grass = this.generateGrass();
    }
    
    generateTrees() {
        const trees = [];
        for (let i = 0; i < 15; i++) {
            trees.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 20 + 15
            });
        }
        return trees;
    }
    
    generateRocks() {
        const rocks = [];
        for (let i = 0; i < 20; i++) {
            rocks.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 8 + 3
            });
        }
        return rocks;
    }
    
    generateGrass() {
        const grass = [];
        for (let i = 0; i < 100; i++) {
            grass.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 3 + 1
            });
        }
        return grass;
    }
    
    draw() {
        // Draw grass
        ctx.fillStyle = '#3d6b1f';
        this.grass.forEach(g => {
            ctx.fillRect(g.x, g.y, g.size, g.size);
        });
        
        // Draw rocks
        ctx.fillStyle = '#555555';
        this.rocks.forEach(r => {
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
        
        // Draw trees
        ctx.fillStyle = '#228B22';
        this.trees.forEach(t => {
            // Trunk
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(t.x - 5, t.y, 10, t.size / 2);
            // Leaves
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.arc(t.x, t.y - t.size / 3, t.size / 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

let startButton = null;
let mapDecorations = null;

function initGame() {
    game.player = new Player(canvas.width / 2, canvas.height / 2);
    game.tower = new Tower(canvas.width / 2, canvas.height / 2);
    startButton = new StartButton(canvas.width / 2, canvas.height - 50);
    mapDecorations = new MapDecorations();
    game.round = 0;
    game.coins = 0;
    game.gameStarted = false;
    game.gameOver = false;
    game.enemies = [];
    game.allies = [];
}

function startRound() {
    game.gameStarted = true;
    game.round++;
    startButton = null;
    spawnEnemies();
}

function spawnEnemies() {
    const enemyTypes = [];
    
    if (game.round >= 1) enemyTypes.push('swordman', 'archer');
    if (game.round >= 2) enemyTypes.push('shieldmen', 'rusher');
    if (game.round >= 3) enemyTypes.push('spearman');
    if (game.round >= 4) enemyTypes.push('fireman');
    if (game.round >= 6) enemyTypes.push('assassin');
    if (game.round >= 7) enemyTypes.push('bomber');
    if (game.round >= 8) enemyTypes.push('maceman', 'healer');
    if (game.round >= 9) enemyTypes.push('flagguy', 'knight');
    if (game.round >= 11) enemyTypes.push('longswordman', 'axeman');
    if (game.round >= 12) enemyTypes.push('crossbowmen');
    if (game.round >= 13) enemyTypes.push('horseknight', 'magician');
    if (game.round >= 14) enemyTypes.push('giant');
    
    const totalEnemies = 50;
    const enemiesPerSide = totalEnemies / 2;
    
    for (let i = 0; i < enemiesPerSide; i++) {
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        
        const enemy1 = new Enemy(-30, Math.random() * canvas.height, type, game.round);
        if (game.round % 5 === 0 && i === 0) {
            enemy1.isBoss = true;
            enemy1.maxHealth *= 2.5;
            enemy1.health = enemy1.maxHealth;
        }
        game.enemies.push(enemy1);
        
        const enemy2 = new Enemy(canvas.width + 30, Math.random() * canvas.height, type, game.round);
        if (game.round % 5 === 0 && i === 0) {
            enemy2.isBoss = true;
            enemy2.maxHealth *= 2.5;
            enemy2.health = enemy2.maxHealth;
        }
        game.enemies.push(enemy2);
    }
}

function updateUI() {
    document.getElementById('roundNum').textContent = game.round;
    document.getElementById('playerHealth').textContent = Math.ceil(game.player.health);
    document.getElementById('playerMaxHealth').textContent = game.player.maxHealth;
    document.getElementById('coins').textContent = game.coins;
    document.getElementById('enemyCount').textContent = game.enemies.length;
    document.getElementById('towerHealth').textContent = Math.max(0, Math.ceil(game.tower.health));
    
    document.getElementById('maxHealthCost').textContent = 100 * game.upgrades.maxHealthLevel;
    document.getElementById('meleeDamageCost').textContent = 100 * game.upgrades.meleeDamageLevel;
    document.getElementById('rangedDamageCost').textContent = 100 * game.upgrades.rangedDamageLevel;
    document.getElementById('maxHealthLevel').textContent = `Lv.${game.upgrades.maxHealthLevel}`;
    document.getElementById('meleeDamageLevel').textContent = `Lv.${game.upgrades.meleeDamageLevel}`;
    document.getElementById('rangedDamageLevel').textContent = `Lv.${game.upgrades.rangedDamageLevel}`;
}

function updateWeaponButtons() {
    const weapons = ['sword', 'bow', 'spear', 'battleAxe', 'crossbow'];
    weapons.forEach(weapon => {
        const btn = document.getElementById(weapon + 'Btn');
        if (game.upgradeManager.selectedWeapons.includes(weapon)) {
            btn.textContent = 'Selected';
            btn.style.background = '#2196F3';
        } else {
            btn.textContent = 'Select';
            btn.style.background = '#4CAF50';
        }
    });
}

function update() {
    if (!game.player) initGame();
    
    if (game.gameStarted && !game.gameOver) {
        game.player.update();
        game.player.attack(game.enemies);
        
        game.enemies.forEach(enemy => enemy.update());
        game.allies.forEach(ally => ally.update());
        
        game.enemies = game.enemies.filter(enemy => {
            const dist = Math.hypot(enemy.x - game.tower.x, enemy.y - game.tower.y);
            if (dist < 50) {
                let damage = Math.random() * (enemy.maxDamage - enemy.minDamage) + enemy.minDamage;
                
                if (enemy.special === 'rusher') damage *= 4;
                if (enemy.special === 'assassin') damage *= 3;
                
                game.tower.takeDamage(damage);
                return false;
            }
            return true;
        });
        
        if (game.enemies.length === 0 && game.gameStarted) {
            game.gameStarted = false;
            startButton = new StartButton(canvas.width / 2, canvas.height - 50);
        }
    }
    
    if (game.gameOver) {
        game.gameStarted = false;
    }
    
    // Update particles
    game.particles = game.particles.filter(p => {
        p.update();
        return p.life > 0;
    });
    
    game.animationFrame++;
    updateUI();
}

function draw() {
    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a4d0a');
    gradient.addColorStop(1, '#2d5016');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw map decorations
    mapDecorations.draw();
    
    // Draw all game objects
    if (game.tower) game.tower.draw();
    
    if (startButton) startButton.draw();
    
    if (game.player) game.player.draw();
    
    game.enemies.forEach(enemy => enemy.draw());
    
    game.allies.forEach(ally => ally.draw());
    
    // Draw particles
    game.particles.forEach(p => p.draw());
    
    if (game.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '40px Arial';
        ctx.fillText('Tower Destroyed!', canvas.width / 2, canvas.height / 2 + 40);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (e) => {
    game.keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    game.keys[e.key] = false;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (startButton && startButton.contains(x, y)) {
        startRound();
    }
});

document.getElementById('shopButton').addEventListener('click', () => {
    game.openShop();
});

const joystick = document.getElementById('joystick');
const joystickHandle = document.getElementById('joystickHandle');
let isJoystickActive = false;

if (window.innerWidth <= 768) {
    joystick.classList.add('active');
}

joystick.addEventListener('touchstart', (e) => {
    isJoystickActive = true;
    handleJoystickMove(e);
});

document.addEventListener('touchmove', (e) => {
    if (isJoystickActive) {
        handleJoystickMove(e);
    }
});

document.addEventListener('touchend', () => {
    isJoystickActive = false;
    joystickHandle.style.transform = 'translate(-50%, -50%)';
});

function handleJoystickMove(e) {
    const touch = e.touches[0];
    const joystickRect = joystick.getBoundingClientRect();
    const centerX = joystickRect.left + joystickRect.width / 2;
    const centerY = joystickRect.top + joystickRect.height / 2;
    
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const maxDistance = joystickRect.width / 2 - 25;
    
    if (distance > maxDistance) {
        const angle = Math.atan2(dy, dx);
        joystickHandle.style.transform = `translate(calc(-50% + ${Math.cos(angle) * maxDistance}px), calc(-50% + ${Math.sin(angle) * maxDistance}px))`;
        game.player.vx = Math.cos(angle) * game.player.speed;
        game.player.vy = Math.sin(angle) * game.player.speed;
    } else {
        joystickHandle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        game.player.vx = (dx / maxDistance) * game.player.speed;
        game.player.vy = (dy / maxDistance) * game.player.speed;
    }
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

initGame();
gameLoop();
updateWeaponButtons();
