const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth * 2;
canvas.height = window.innerHeight * 2;

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
    enemySpawnQueue: [],
    enemySpawnTimer: 0,
    enemySpawnInterval: 300, // Spawn an enemy every 300ms
    
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

class Particle {
    constructor(x, y, vx, vy, color, life = 1000) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 3 + 2;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // gravity
        this.life -= 16;
    }
    
    draw() {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
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
        this.kills = 0;
        this.level = 1;
        this.exp = 0;
        this.expNeeded = 100;
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
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.lastHitTime = Date.now();
        this.isRed = true;
        this.redTimer = 100;
        
        // Create damage particles
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 1;
            game.particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#FF0000',
                600
            ));
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
        this.y = canvas.height / 2;
    }
    
    gainExp(amount) {
        this.exp += amount;
        if (this.exp >= this.expNeeded) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.exp -= this.expNeeded;
        this.expNeeded = Math.floor(this.expNeeded * 1.1);
        this.maxHealth += 10;
        this.health = this.maxHealth;
        this.speed += 0.5;
        
        // Level up particles
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 2;
            game.particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#FFD700',
                800
            ));
        }
    }
    
    draw() {
        const color = this.isRed ? this.damageColor : this.color;
        ctx.fillStyle = color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        // Draw level indicator
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv${this.level}`, this.x, this.y - this.height / 2 - 15);
        
        // Health bar
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, this.width, 5);
        ctx.fillStyle = '#00FF00';
        const healthPercent = this.health / this.maxHealth;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, this.width * healthPercent, 5);
        
        // EXP bar
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 4, this.width, 2);
        ctx.fillStyle = '#00FFFF';
        const expPercent = this.exp / this.expNeeded;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 4, this.width * expPercent, 2);
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
        this.floatOffset = 0;
        this.floatDirection = 1;
        
        this.initializeStats();
    }
    
    initializeStats() {
        const multiplier = 1 + (this.round - 1) * 0.08;
        
        const baseStats = {
            swordman: { health: 100, minDamage: 10, maxDamage: 14, speed: 0.5, range: 40, special: 'melee' },
            archer: { health: 80, minDamage: 7, maxDamage: 12, speed: 0.5, range: 180, special: 'ranged' },
            shieldmen: { health: 85, minDamage: 3, maxDamage: 4, shieldHealth: 80, speed: 0.375, range: 40, special: 'shield' },
            rusher: { health: 50, minDamage: 7, maxDamage: 9, speed: 0.75, range: 40, special: 'rusher', towerDamageMultiplier: 4 },
            spearman: { health: 115, minDamage: 9, maxDamage: 12, speed: 0.45, range: 60, special: 'melee' },
            fireman: { health: 65, minDamage: 10, maxDamage: 13, speed: 0.55, range: 150, special: 'fire', burnDamage: 1, burnDuration: 4000 },
            assassin: { health: 70, minDamage: 30, maxDamage: 13, speed: 0.5, range: 40, special: 'assassin', firstHit: 30, normalDamage: 10, towerDamageMultiplier: 3 },
            bomber: { health: 30, minDamage: 0, maxDamage: 0, speed: 0.55, range: 40, special: 'bomber', explodeDamage: 130, explodeRange: 100 },
            maceman: { health: 140, minDamage: 13, maxDamage: 19, speed: 0.375, range: 40, special: 'maceman' },
            healer: { health: 60, minDamage: 5, maxDamage: 5, speed: 0.5, range: 150, special: 'healer', healAmount: 5 },
            flagguy: { health: 90, minDamage: 0, maxDamage: 0, speed: 0.55, range: 150, special: 'flagguy', speedBoost: 3 },
            knight: { health: 150, minDamage: 13, maxDamage: 17, shieldHealth: 135, speed: 0.45, range: 40, special: 'knight', rushRange: 100, stun: 0.5 },
            longswordman: { health: 100, minDamage: 12, maxDamage: 16, shieldHealth: 15, speed: 0.5, range: 70, special: 'melee' },
            axeman: { health: 95, minDamage: 14, maxDamage: 18, speed: 0.55, range: 40, special: 'axeman' },
            crossbowmen: { health: 90, minDamage: 11, maxDamage: 13, speed: 0.375, range: 200, special: 'ranged' },
            horseknight: { health: 125, minDamage: 18, maxDamage: 22, shieldHealth: 150, speed: 0.625, range: 40, special: 'horseknight' },
            magician: { health: 70, minDamage: 4, maxDamage: 8, speed: 0.45, range: 180, special: 'magician', stun: 0.8 },
            giant: { health: 400, minDamage: 45, maxDamage: 55, speed: 0.3, range: 60, special: 'giant' }
        };
        
        const stats = baseStats[this.type] || baseStats.swordman;
        this.maxHealth = Math.floor(stats.health * multiplier);
        this.health = this.maxHealth;
        this.minDamage = Math.floor(stats.minDamage * multiplier);
        this.maxDamage = Math.floor(stats.maxDamage * multiplier);
        this.speed = stats.speed;
        this.range = stats.range;
        this.special = stats.special;
        
        if (stats.shieldHealth) {
            this.shieldHealth = Math.floor(stats.shieldHealth * multiplier);
            this.maxShieldHealth = this.shieldHealth;
        }
        
        Object.keys(stats).forEach(key => {
            if (key !== 'health' && key !== 'minDamage' && key !== 'maxDamage' && key !== 'speed' && key !== 'range' && key !== 'special' && key !== 'shieldHealth') {
                this[key] = stats[key];
            }
        });
    }
    
    update() {
        // Floating animation
        this.floatOffset += 0.05 * this.floatDirection;
        if (this.floatOffset > 3 || this.floatOffset < -3) {
            this.floatDirection *= -1;
        }
        
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
        
        // Damage particles
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 1.5 + 0.5;
            game.particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#FFAA00',
                400
            ));
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        game.coins += 10;
        game.player.gainExp(20);
        
        // Death particles
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            game.particles.push(new Particle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#FF4444',
                600
            ));
        }
        
        game.enemies = game.enemies.filter(e => e !== this);
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 + this.floatOffset, this.width, this.height);
        
        if (this.shieldHealth && this.shieldHealth > 0) {
            ctx.fillStyle = '#FFFF00';
            const shieldPercent = this.shieldHealth / this.maxShieldHealth;
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 + this.floatOffset - 15, this.width * shieldPercent, 3);
        }
        
        // Health bar
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 + this.floatOffset - 8, this.width, 4);
        ctx.fillStyle = '#00FF00';
        const healthPercent = this.health / this.maxHealth;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 + this.floatOffset - 8, this.width * healthPercent, 4);
        
        // Boss aura
        if (this.isBoss) {
            ctx.strokeStyle = `rgba(255, 100, 0, 0.6)`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y + this.floatOffset, this.width / 2 + 15, 0, Math.PI * 2);
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
        this.floatOffset = 0;
        this.floatDirection = 1;
        
        const stats = {
            swordmanAlly: { health: 80, minDamage: 8, maxDamage: 12, speed: 2, range: 40 },
            archerAlly: { health: 60, minDamage: 6, maxDamage: 10, speed: 2, range: 150 },
            healerAlly: { health: 50, minDamage: 0, maxDamage: 0, speed: 1.5, range: 200, healAmount: 8 }
        };
        
        const stat = stats[type] || stats.swordmanAlly;
        this.maxHealth = stat.health;
        this.health = stat.health;
        this.minDamage = stat.minDamage;
        this.maxDamage = stat.maxDamage;
        this.speed = stat.speed;
        this.range = stat.range;
        this.healAmount = stat.healAmount || 0;
        this.spawnTime = Date.now();
    }
    
    update() {
        // Floating animation
        this.floatOffset += 0.04 * this.floatDirection;
        if (this.floatOffset > 2 || this.floatOffset < -2) {
            this.floatDirection *= -1;
        }
        
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
            this.y = canvas.height / 2;
            this.spawnTime = Date.now();
        }
    }
    
    attack(target) {
        if (this.healAmount > 0) {
            for (let ally of game.allies) {
                const dist = Math.hypot(ally.x - this.x, ally.y - this.y);
                if (dist < this.range && ally !== this) {
                    ally.health = Math.min(ally.maxHealth, ally.health + this.healAmount);
                    
                    // Heal particles
                    for (let i = 0; i < 3; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 1.5 + 0.5;
                        game.particles.push(new Particle(
                            ally.x,
                            ally.y,
                            Math.cos(angle) * speed,
                            Math.sin(angle) * speed,
                            '#00FF00',
                            500
                        ));
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
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 + this.floatOffset, this.width, this.height);
        
        // Health bar
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 + this.floatOffset - 8, this.width, 4);
        ctx.fillStyle = '#00FF00';
        const healthPercent = this.health / this.maxHealth;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 + this.floatOffset - 8, this.width * healthPercent, 4);
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
        this.rotationAngle = 0;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            game.gameOver = true;
        }
    }
    
    update() {
        this.rotationAngle += 0.02;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width / 2, this.height / 2);
        
        ctx.restore();
        
        // Health bar
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - this.width / 2 - 40, this.y + this.height / 2 + 10, 120, 10);
        ctx.fillStyle = '#00FF00';
        const healthPercent = this.health / this.maxHealth;
        ctx.fillRect(this.x - this.width / 2 - 40, this.y + this.height / 2 + 10, 120 * healthPercent, 10);
    }
}

class StartButton {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 40;
        this.color = '#00FF00';
        this.hoverScale = 1;
    }
    
    contains(x, y) {
        return x > this.x - this.width / 2 && x < this.x + this.width / 2 &&
               y > this.y - this.height / 2 && y < this.y + this.height / 2;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        // Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('START', this.x, this.y);
    }
}

let startButton = null;

function initGame() {
    game.player = new Player(canvas.width / 2, canvas.height / 2);
    game.tower = new Tower(canvas.width / 2, canvas.height / 2);
    startButton = new StartButton(canvas.width / 2, canvas.height - 50);
    game.round = 0;
    game.coins = 0;
    game.gameStarted = false;
    game.gameOver = false;
    game.enemies = [];
    game.allies = [];
    game.particles = [];
    game.enemySpawnQueue = [];
    game.enemySpawnTimer = 0;
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
    
    // Clear the queue
    game.enemySpawnQueue = [];
    
    // Queue all enemies
    for (let i = 0; i < enemiesPerSide; i++) {
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        
        const enemy1Data = { type, isBoss: game.round % 5 === 0 && i === 0, x: -30 };
        const enemy2Data = { type, isBoss: game.round % 5 === 0 && i === 0, x: canvas.width + 30 };
        
        game.enemySpawnQueue.push(enemy1Data);
        game.enemySpawnQueue.push(enemy2Data);
    }
    
    game.enemySpawnTimer = 0;
}

function spawnNextEnemy() {
    if (game.enemySpawnQueue.length === 0) return;
    
    const enemyData = game.enemySpawnQueue.shift();
    const enemy = new Enemy(enemyData.x, Math.random() * canvas.height, enemyData.type, game.round);
    
    if (enemyData.isBoss) {
        enemy.isBoss = true;
        enemy.maxHealth *= 2.5;
        enemy.health = enemy.maxHealth;
    }
    
    game.enemies.push(enemy);
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
        // Handle enemy spawning
        game.enemySpawnTimer += 16;
        if (game.enemySpawnTimer >= game.enemySpawnInterval) {
            spawnNextEnemy();
            game.enemySpawnTimer = 0;
        }
        
        game.player.update();
        game.player.attack(game.enemies);
        game.tower.update();
        
        game.enemies.forEach(enemy => enemy.update());
        game.allies.forEach(ally => ally.update());
        
        // Update and clean particles
        game.particles = game.particles.filter(p => p.life > 0);
        game.particles.forEach(p => p.update());
        
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
        
        if (game.enemies.length === 0 && game.gameStarted && game.enemySpawnQueue.length === 0) {
            game.gameStarted = false;
            startButton = new StartButton(canvas.width / 2, canvas.height - 50);
        }
    }
    
    if (game.gameOver) {
        game.gameStarted = false;
    }
    
    updateUI();
}

function draw() {
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 100) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 100) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    if (game.tower) game.tower.draw();
    
    if (startButton) startButton.draw();
    
    if (game.player) game.player.draw();
    
    game.enemies.forEach(enemy => enemy.draw());
    
    game.allies.forEach(ally => ally.draw());
    
    // Draw particles
    game.particles.forEach(p => p.draw());
    
    if (game.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '30px Arial';
        ctx.fillText('Tower Destroyed!', canvas.width / 2, canvas.height / 2 + 60);
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
    const x = (e.clientX - rect.left) * 2;
    const y = (e.clientY - rect.top) * 2;
    
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
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
});

initGame();
gameLoop();
updateWeaponButtons();
