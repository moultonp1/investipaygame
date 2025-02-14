import React, { useEffect, useRef } from 'react';

const FPSGame = () => {
  const canvasRef = useRef(null);
  const gameStateRef = useRef({
    score: 0,
    level: 1,
    highScore: 0,
    gameState: 'playing',
    lastTime: 0,
    playerHealth: 100,
    aimX: 0,
    aimY: 0,
    playerX: 300, // Set initial position
    playerY: 350, // Set initial position
    bullets: [],
    targets: [],
    keys: {},
    shootCooldown: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const state = gameStateRef.current;

    function getDifficultyParams(level) {
      return {
        targetSpeed: 0.2 + (level * 0.1),
        enemyBulletSpeed: 150 + (level * 25),
        targetCount: 3 + Math.min(7, Math.floor(level * 0.5)),
        shootInterval: Math.max(50, 150 - (level * 10)),
        playerSpeed: 5,
        bulletSpeed: 400,
        enemyHealth: 1 + Math.floor(level / 5)
      };
    }

    function createTargets() {
      const params = getDifficultyParams(state.level);
      state.targets = [];
      
      for (let i = 0; i < params.targetCount; i++) {
        state.targets.push({
          x: Math.random() * (WIDTH - 40) + 20,
          y: Math.random() * (HEIGHT/3) + 20,
          dx: (Math.random() - 0.5) * params.targetSpeed,
          dy: (Math.random() - 0.5) * params.targetSpeed,
          shootTimer: Math.random() * 100,
          health: params.enemyHealth
        });
      }
    }

    function resetGame() {
      state.playerHealth = 100;
      state.playerX = WIDTH / 2;
      state.playerY = HEIGHT - 50;
      state.bullets = [];
      state.level = 1;
      state.score = 0;
      state.gameState = 'playing';
      state.aimX = 0;
      state.aimY = 0;
      createTargets();
    }

    // Initial target creation
    createTargets();

    function updateGame(deltaTime) {
      if (state.playerHealth <= 0) {
        state.gameState = 'gameOver';
        if (state.score > state.highScore) {
          state.highScore = state.score;
        }
        return;
      }

      if (state.gameState !== 'playing') return;

      const params = getDifficultyParams(state.level);

      // Update player movement (Arrow Keys)
      if (state.keys['ArrowLeft'] && state.playerX > 0) state.playerX -= params.playerSpeed;
      if (state.keys['ArrowRight'] && state.playerX < WIDTH) state.playerX += params.playerSpeed;
      if (state.keys['ArrowUp'] && state.playerY > 0) state.playerY -= params.playerSpeed;
      if (state.keys['ArrowDown'] && state.playerY < HEIGHT) state.playerY += params.playerSpeed;

      // Update aim direction (WASD)
      const aimSpeed = 200;
      if (state.keys['KeyA']) state.aimX -= aimSpeed * deltaTime;
      if (state.keys['KeyD']) state.aimX += aimSpeed * deltaTime;
      if (state.keys['KeyW']) state.aimY -= aimSpeed * deltaTime;
      if (state.keys['KeyS']) state.aimY += aimSpeed * deltaTime;

      // Normalize aim direction
      const aimLength = Math.sqrt(state.aimX * state.aimX + state.aimY * state.aimY);
      if (aimLength > 0) {
        state.aimX = state.aimX / aimLength;
        state.aimY = state.aimY / aimLength;
      }

      // Handle shooting
      if (state.shootCooldown > 0) {
        state.shootCooldown -= deltaTime;
      }
      
      if (state.keys['Space'] && state.shootCooldown <= 0 && (state.aimX !== 0 || state.aimY !== 0)) {
        state.bullets.push({
          x: state.playerX,
          y: state.playerY,
          dx: state.aimX * params.bulletSpeed,
          dy: state.aimY * params.bulletSpeed,
          friendly: true
        });
        state.shootCooldown = 0.2;
      }

      // Update bullets
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];
        
        bullet.x += bullet.dx * deltaTime;
        bullet.y += bullet.dy * deltaTime;

        if (bullet.x < 0 || bullet.x > WIDTH || bullet.y < 0 || bullet.y > HEIGHT) {
          state.bullets.splice(i, 1);
          continue;
        }

        if (!bullet.friendly) {
          const dx = bullet.x - state.playerX;
          const dy = bullet.y - state.playerY;
          if (dx * dx + dy * dy < 225) {
            state.playerHealth = Math.max(0, state.playerHealth - 10);
            state.bullets.splice(i, 1);
            continue;
          }
        } else {
          for (let j = state.targets.length - 1; j >= 0; j--) {
            const target = state.targets[j];
            if (bullet.x > target.x && bullet.x < target.x + 30 &&
                bullet.y > target.y && bullet.y < target.y + 30) {
              target.health--;
              state.bullets.splice(i, 1);
              
              if (target.health <= 0) {
                state.targets.splice(j, 1);
                state.score += state.level * 100;
                
                if (state.targets.length === 0) {
                  state.level++;
                  state.gameState = 'levelComplete';
                  state.playerHealth = Math.min(100, state.playerHealth + 20);
                  setTimeout(() => {
                    state.gameState = 'playing';
                    createTargets();
                  }, 2000);
                }
              }
              break;
            }
          }
        }
      }

      // Update targets
      state.targets.forEach(target => {
        target.x += target.dx;
        target.y += target.dy;

        if (target.x <= 0 || target.x + 30 >= WIDTH) target.dx *= -1;
        if (target.y <= 0 || target.y + 30 >= HEIGHT) target.dy *= -1;

        target.shootTimer--;
        if (target.shootTimer <= 0) {
          const dx = state.playerX - target.x;
          const dy = state.playerY - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          state.bullets.push({
            x: target.x + 15,
            y: target.y + 15,
            dx: (dx / dist) * params.enemyBulletSpeed,
            dy: (dy / dist) * params.enemyBulletSpeed,
            friendly: false
          });
          target.shootTimer = params.shootInterval + Math.random() * 50;
        }
      });
    }

    function draw() {
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Draw player with health bar
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(state.playerX, state.playerY, 15, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(state.playerX - 20, state.playerY - 30, 40, 5);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(state.playerX - 20, state.playerY - 30, (state.playerHealth/100) * 40, 5);

      // Draw bullets
      ctx.beginPath();
      state.bullets.forEach(bullet => {
        ctx.fillStyle = bullet.friendly ? '#ffffff' : '#ff0000';
        ctx.moveTo(bullet.x + 3, bullet.y);
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      });
      ctx.fill();

      // Draw targets with health bars
      ctx.fillStyle = '#ff69b4';
      state.targets.forEach(target => {
        ctx.fillRect(target.x, target.y, 30, 30);
        
        const params = getDifficultyParams(state.level);
        if (params.enemyHealth > 1) {
          const healthPercent = target.health / params.enemyHealth;
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(target.x, target.y - 5, 30, 3);
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(target.x, target.y - 5, 30 * healthPercent, 3);
          ctx.fillStyle = '#ff69b4';
        }
      });

      // Draw aim direction indicator
      if (state.gameState === 'playing' && (state.aimX !== 0 || state.aimY !== 0)) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(state.playerX, state.playerY);
        ctx.lineTo(
          state.playerX + state.aimX * 30,
          state.playerY + state.aimY * 30
        );
        ctx.stroke();
      }

      // Draw HUD
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.fillText(`Score: ${state.score}`, 10, 30);
      ctx.fillText(`Level: ${state.level}`, 10, 60);
      ctx.fillText(`Health: ${state.playerHealth}%`, 10, 90);
      ctx.fillText(`High Score: ${state.highScore}`, WIDTH - 150, 30);

      if (state.gameState === 'levelComplete') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, HEIGHT/2 - 50, WIDTH, 100);
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Level ${state.level-1} Complete!`, WIDTH/2, HEIGHT/2);
        ctx.font = '20px Arial';
        ctx.fillText('Get ready for next level...', WIDTH/2, HEIGHT/2 + 40);
      } else if (state.gameState === 'gameOver') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, HEIGHT/2 - 100, WIDTH, 200);
        ctx.fillStyle = '#ff0000';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', WIDTH/2, HEIGHT/2 - 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${state.score}`, WIDTH/2, HEIGHT/2 + 20);
        ctx.font = '20px Arial';
        ctx.fillText('Press R to play again', WIDTH/2, HEIGHT/2 + 60);
      }
      ctx.textAlign = 'left';
    }

    function gameLoop(timestamp) {
      if (!state.lastTime) state.lastTime = timestamp;
      const deltaTime = (timestamp - state.lastTime) / 1000;
      state.lastTime = timestamp;

      updateGame(deltaTime);
      draw();
      requestAnimationFrame(gameLoop);
    }

    const handleKeyDown = (e) => {
      state.keys[e.code] = true;
      if (e.code === 'KeyR' && state.gameState === 'gameOver') {
        resetGame();
      }
    };

    const handleKeyUp = (e) => {
      state.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Start the game loop
    requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="bg-black border-2 border-gray-600 rounded-lg"
      />
      <div className="text-sm text-gray-600">
        Arrow Keys to move | WASD to aim | Space to shoot | R to restart
      </div>
    </div>
  );
};

export default FPSGame;
