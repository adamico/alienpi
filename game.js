'use strict';

// import LittleJS module
import * as LJS from './node_modules/littlejsengine/dist/littlejs.esm.js';
const {vec2, rgb, rand, randInt, drawCircle, drawLine, drawTextScreen} = LJS;

let playerAngle = 0;
let bullets = [];
let enemies = [];
let spawnTimer = 0;

// --- SHOOTING COOLDOWN ---
let shootCooldown = 10; // frames (CONFIGURABLE)
let shootTimer = 0;

// --- WAVE SYSTEM ---
let wave = 1;
let enemiesToSpawn = 10;
let enemiesSpawned = 0;
let waveTimer = 0;
let waveClearedTimer = 0;

const radius = 8;

function startWave()
{
    enemiesToSpawn = 8 + wave * 4;
    enemiesSpawned = 0;
    waveTimer = 120;
    waveClearedTimer = 0;
}

function gameInit()
{
    LJS.setCanvasFixedSize(vec2(1920,1080));
    LJS.setCameraPos(vec2(0,0));
    LJS.setCameraScale(60);
    startWave();
}

function gameUpdate()
{
    const input = LJS.keyDirection();
    playerAngle -= input.x * .05;

    const playerPos = vec2().setAngle(playerAngle, radius);

    // update shoot timer
    if (shootTimer > 0)
        shootTimer--;

    // shoot toward center with cooldown
    if (LJS.keyIsDown('Space') && shootTimer <= 0)
    {
        const dirToCenter = playerPos.normalize(-1);
        bullets.push({
            pos: playerPos.copy(),
            vel: dirToCenter.scale(.3)
        });

        shootTimer = shootCooldown; // reset cooldown
    }

    // bullets
    bullets.forEach(b=> b.pos = b.pos.add(b.vel));
    bullets = bullets.filter(b=> b.pos.length() > .5);

    // --- PATTERN SPAWNING ---
let currentPattern = [];
let patternIndex = 0;
let patternTimer = 0;

function createPattern()
{
    const count = 5 + randInt(6); // 5–10 enemies
    const baseAngle = rand(0, 6.28);
    const spacing = 0.4;

    const type = randInt(3);
    currentPattern = [];

    for (let i = 0; i < count; i++)
    {
        currentPattern.push({
            type,
            angle: baseAngle + (i - count/2) * spacing
        });
    }

    patternIndex = 0;
    patternTimer = 0;
}

// spawn patterns instead of single enemies
if (waveTimer > 0)
    waveTimer--;
else
{
    // create new pattern if needed
    if (!currentPattern.length || patternIndex >= currentPattern.length)
    {
        if (enemiesSpawned < enemiesToSpawn)
            createPattern();
    }

    // spawn next enemy in pattern
    if (currentPattern.length && patternIndex < currentPattern.length)
    {
        patternTimer--;
        if (patternTimer <= 0)
        {
            patternTimer = 8; // spacing between enemies in pattern

            const data = currentPattern[patternIndex++];
            enemiesSpawned++;

            const angle = data.angle;

            if (data.type === 0)
            {
                const pos = vec2().setAngle(angle, 12);
                enemies.push({pos, vel: pos.normalize(-(.02 + wave*0.002))});
            }
            else if (data.type === 1)
            {
                const pos = vec2(0,0);
                const vel = vec2().setAngle(angle, .05 + wave*0.002);
                enemies.push({pos, vel});
            }
            else
            {
                const pos = vec2().setAngle(angle, 12);
                const vel = pos.normalize(-(.015 + wave*0.002));
                enemies.push({pos, vel, angle, spin:.03 + wave*0.002});
            }
        }
    }
}

    // update enemies
    enemies.forEach(e=>{
        if (e.spin)
        {
            e.angle += e.spin;
            const spiral = vec2().setAngle(e.angle, .02);
            e.pos = e.pos.add(e.vel).add(spiral);
        }
        else
            e.pos = e.pos.add(e.vel);
    });

    // collisions
    enemies = enemies.filter(e=>{
        for (let b of bullets)
        {
            if (e.pos.distance(b.pos) < .6)
                return false;
        }
        return true;
    });

    enemies = enemies.filter(e => e.pos.length() < 20);

    // --- WAVE CLEAR CHECK ---
    if (enemiesSpawned >= enemiesToSpawn && enemies.length === 0 && waveTimer <= 0)
    {
        if (waveClearedTimer <= 0)
            waveClearedTimer = 120;

        waveClearedTimer--;

        if (waveClearedTimer <= 0)
        {
            wave++;
            startWave();
        }
    }
}

function gameUpdatePost(){}

function gameRender()
{
    drawCircle(vec2(0,0), 2, rgb(1,.5,0));

    const playerPos = vec2().setAngle(playerAngle, radius);

    drawCircle(vec2(0,0), radius*2, rgb(.2,.2,.2));

    drawCircle(playerPos, 1, rgb(.3,1,.3));

    const centerDir = playerPos.normalize(-1);
    const tip = playerPos.add(centerDir.scale(1.5));
    drawLine(playerPos, tip, .2, rgb(.6,1,.6));

    bullets.forEach(b=> drawCircle(b.pos, .3, rgb(1,1,0)));
    enemies.forEach(e=> drawCircle(e.pos, .8, rgb(1,.2,.2)));
}

function gameRenderPost()
{
    drawTextScreen(`Wave ${wave}`, vec2(100, 50), 40);

    const remaining = Math.max(0, enemiesToSpawn - enemiesSpawned + enemies.length);

    if (waveTimer <= 0 && !(enemiesSpawned >= enemiesToSpawn && enemies.length === 0))
    {
        drawTextScreen(`Enemies Remaining: ${remaining}`, vec2(180, 120), 30);
    }

    if (waveClearedTimer > 0)
        drawTextScreen('WAVE CLEARED', LJS.mainCanvasSize.scale(.5), 60);
}

LJS.engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
