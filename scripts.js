/************ Инициализация Канваса и Контекста ************/
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/************ Получение Элементов Интерфейса ************/
const overlay = document.getElementById('overlay');
const overlayMessage = document.getElementById('overlayMessage');
const startButton = document.getElementById('startButton');
const multiplayerButton = document.getElementById('multiplayerButton');
const continueButton = document.getElementById('continueButton');
const restartButton = document.getElementById('restartButton');
const mainMenuButton = document.getElementById('mainMenuButton');
const themeSelect = document.getElementById('themeSelect');

const multiplayerSetup = document.getElementById('multiplayerSetup');
const player1ColorsDiv = document.getElementById('player1Colors');
const player2ColorsDiv = document.getElementById('player2Colors');
const startMultiplayerButton = document.getElementById('startMultiplayerButton');

/************ Переменные Игрового Состояния ************/
let players = [];
let asteroids = [];
let bullets = [];
let bonuses = [];
let keys = {};
let scores = [0, 0]; // Счётчики для двух игроков
let gameOver = false;
let isPaused = false;
let gameState = 'mainMenu';

let level = 1;
let nextLevelScore = 1000;
let asteroidSpeedMultiplier = 1;
let scoreMultiplier = 1;
let levelUpMessageTime = 0;
let nextWeaponUpgradeScore = 500;

let currentTheme = 'dark';
let asteroidColor = 'gray';
let bonusColor = 'green';
let backgroundColor = '#000';
let textColor = '#fff';

let lastFrameTime = performance.now();
let asteroidSpawnTimer = 0;

const availableColors = ['yellow', 'green', 'red', 'blue', 'gray', 'cyan', 'purple'];
let selectedColors = {};

let currentMode = 'single'; // 'single' или 'multi'

/************ Маппинг Русских Клавиш на Английские ************/
const keyMap = {
    'ф': 'a',
    'в': 'd',
    'Ф': 'A',
    'В': 'D'
};

/************ Классы Объектов Игры ************/

/**
 * Класс Игрока
 */
class Player {
    constructor(x, controls, color, index) {
        this.x = x;
        this.y = canvas.height - 50;
        this.width = 40;
        this.height = 40;
        this.speed = 300; // пикселей в секунду
        this.weaponLevel = 1;
        this.hasBonus = false;
        this.bonusEndTime = 0;
        this.controls = controls;
        this.color = color;
        this.bulletColor = color;
        this.index = index;
        this.lives = 3; // Количество жизней
        this.isShielded = false; // Флаг наличия щита
        this.shieldEndTime = 0; // Время окончания действия щита
    }

    /**
     * Отрисовка игрока
     */
    draw() {
        if (this.lives <= 0) return; // Не рисуем, если нет жизней

        // Рисуем игрока
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Если щит активен, рисуем вокруг игрока круг
        if (this.isShielded) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    /**
     * Движение игрока
     * @param {number} dt - Разница во времени в секундах
     */
    move(dt) {
        if (this.lives <= 0) return; // Не двигаемся, если нет жизней

        let leftPressed = this.controls.left.some(key => keys[key.toLowerCase()]);
        let rightPressed = this.controls.right.some(key => keys[key.toLowerCase()]);

        if (leftPressed && this.x > 0) {
            this.x -= this.speed * dt;
        }
        if (rightPressed && this.x + this.width < canvas.width) {
            this.x += this.speed * dt;
        }
    }

    /**
     * Стрельба
     */
    shoot() {
        if (this.lives <= 0) return; // Не стреляем, если нет жизней

        if (this.hasBonus) {
            let bulletLeft = new Bullet(this.x, this.y, this.weaponLevel, this.bulletColor, this.index);
            let bulletRight = new Bullet(this.x + this.width, this.y, this.weaponLevel, this.bulletColor, this.index);
            bullets.push(bulletLeft, bulletRight);
        } else {
            let bullet = new Bullet(this.x + this.width / 2, this.y, this.weaponLevel, this.bulletColor, this.index);
            bullets.push(bullet);
        }
    }
}

/**
 * Класс Астероида
 */
class Asteroid {
    constructor() {
        this.size = Math.random() * 30 + 20;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        this.speed = (Math.random() * 60 + 30) * asteroidSpeedMultiplier; // пикселей в секунду
        this.health = Math.ceil(this.size / 10);
    }

    /**
     * Отрисовка астероида
     */
    draw() {
        ctx.fillStyle = asteroidColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Движение астероида
     * @param {number} dt - Разница во времени в секундах
     */
    move(dt) {
        this.y += this.speed * dt;
    }
}

/**
 * Класс Пули
 */
class Bullet {
    constructor(x, y, level, color, ownerIndex) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 10;
        this.speed = 420; // пикселей в секунду
        this.damage = level;
        this.color = color;
        this.ownerIndex = ownerIndex;
    }

    /**
     * Отрисовка пули
     */
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    }

    /**
     * Движение пули
     * @param {number} dt - Разница во времени в секундах
     */
    move(dt) {
        this.y -= this.speed * dt;
    }
}

/**
 * Класс Бонуса
 */
class Bonus {
    constructor() {
        this.size = 30;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        this.speed = 90 * asteroidSpeedMultiplier; // пикселей в секунду
    }

    /**
     * Отрисовка бонуса
     */
    draw() {
        ctx.fillStyle = bonusColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Движение бонуса
     * @param {number} dt - Разница во времени в секундах
     */
    move(dt) {
        this.y += this.speed * dt;
    }
}

/************ Функции Управления Темой ************/

/**
 * Применение выбранной темы
 * @param {string} theme - Название темы ('dark' или 'light')
 */
function applyTheme(theme) {
    if (theme === 'dark') {
        backgroundColor = '#000';
        textColor = '#fff';
        asteroidColor = 'gray';
        bonusColor = 'green';
        document.body.style.backgroundColor = backgroundColor;
        document.body.style.color = textColor;
        canvas.style.backgroundColor = backgroundColor;
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.borderColor = '#fff';
        overlay.style.color = textColor;
    } else if (theme === 'light') {
        backgroundColor = '#fff';
        textColor = '#000';
        asteroidColor = '#666';
        bonusColor = 'orange';
        document.body.style.backgroundColor = backgroundColor;
        document.body.style.color = textColor;
        canvas.style.backgroundColor = backgroundColor;
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        overlay.style.borderColor = '#000';
        overlay.style.color = textColor;
    }
}

// Обработчик изменения темы
themeSelect.addEventListener('change', () => {
    currentTheme = themeSelect.value;
    applyTheme(currentTheme);
});

/************ Функции Генерации и Обработки Объектов ************/

/**
 * Создание астероидов и бонусов
 * @param {number} dt - Разница во времени в секундах
 */
function createAsteroids(dt) {
    asteroidSpawnTimer += dt;
    const asteroidSpawnInterval = 0.5; // Интервал в секундах
    if (asteroidSpawnTimer >= asteroidSpawnInterval) {
        asteroidSpawnTimer -= asteroidSpawnInterval;
        if (Math.random() < 0.05) {
            let bonus = new Bonus();
            bonuses.push(bonus);
        } else {
            let asteroid = new Asteroid();
            asteroids.push(asteroid);
        }
    }
}

/**
 * Обработка столкновений между объектами
 */
function handleCollisions() {
    // Обработка столкновений пуль и астероидов
    bullets.forEach((bullet, bIndex) => {
        asteroids.forEach((asteroid, aIndex) => {
            let dx = bullet.x - asteroid.x;
            let dy = bullet.y - asteroid.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < asteroid.size / 2) {
                asteroid.health -= bullet.damage;
                bullets.splice(bIndex, 1);

                if (asteroid.health <= 0) {
                    let playerIndex = bullet.ownerIndex;
                    if (playerIndex !== undefined) {
                        scores[playerIndex] += Math.floor(asteroid.size * 5 * scoreMultiplier);
                    }

                    asteroids.splice(aIndex, 1);

                    // Проверка достижения следующего уровня
                    if (scores[playerIndex] >= nextLevelScore) {
                        level += 1;
                        nextLevelScore += 1000;

                        asteroidSpeedMultiplier *= 1.1;
                        scoreMultiplier *= 1.15;
                    }

                    // Проверка улучшения оружия
                    if (scores[playerIndex] >= nextWeaponUpgradeScore) {
                        players[playerIndex].weaponLevel += 1;
                        nextWeaponUpgradeScore += 500;
                    }
                }
            }
        });
    });

    // Обработка столкновений астероидов с игроками
    asteroids.forEach((asteroid, aIndex) => {
        players.forEach(player => {
            if (player.lives <= 0) return; // Пропускаем мертвых игроков

            let closestX = Math.max(player.x, Math.min(asteroid.x, player.x + player.width));
            let closestY = Math.max(player.y, Math.min(asteroid.y, player.y + player.height));

            let dx = asteroid.x - closestX;
            let dy = asteroid.y - closestY;

            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < asteroid.size / 2) {
                if (!player.isShielded && player.lives > 0) {
                    player.lives -= 1;
                    if (player.lives < 0) player.lives = 0; // Предотвращаем отрицательные жизни
                    player.isShielded = true;
                    player.shieldEndTime = Date.now() + 3000; // Щит на 3 секунды
                    asteroids.splice(aIndex, 1); // Убираем астероид при столкновении

                    if (player.lives <= 0) {
                        // Проверяем, есть ли живые игроки
                        let alivePlayers = players.filter(p => p.lives > 0);
                        if (alivePlayers.length === 0) {
                            gameOver = true;
                        }
                    }
                }
            }
        });
    });
}

/**
 * Обработка столкновений бонусов с игроками
 */
function handleBonusCollisions() {
    bonuses.forEach((bonus, index) => {
        players.forEach(player => {
            if (player.lives <= 0) return; // Пропускаем мертвых игроков

            let dx = player.x + player.width / 2 - bonus.x;
            let dy = player.y + player.height / 2 - bonus.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < bonus.size / 2 + player.width / 2) {
                bonuses.splice(index, 1);
                player.hasBonus = true;
                player.bonusEndTime = Date.now() + 5000;
            }
        });
    });
}

/************ Утилитарные Функции ************/

/**
 * Форматирование счёта с ведущими нулями
 * @param {number} score - Счёт игрока
 * @returns {string} - Отформатированный счёт
 */
function formatScore(score) {
    return score.toString().padStart(8, '0');
}

/************ Игровой Цикл ************/

/**
 * Главный игровой цикл
 * @param {number} currentTime - Текущее время
 */
function gameLoop(currentTime) {
    if (gameOver) {
        if (currentMode === 'multi') {
            // Определяем победителя
            let alivePlayers = players.filter(p => p.lives > 0);
            if (alivePlayers.length === 0) {
                // Если все игроки потеряли жизни, определяем победителя по очкам
                let winnerIndex = scores[0] > scores[1] ? 0 : 1;
                overlayMessage.textContent = `Игра окончена. Победил Игрок ${winnerIndex + 1}!`;
            }
        } else {
            overlayMessage.textContent = 'Игра окончена';
        }
        startButton.style.display = 'none';
        continueButton.style.display = 'none';
        restartButton.style.display = 'block';
        mainMenuButton.style.display = 'block';
        themeSelect.style.display = 'none';
        multiplayerButton.style.display = 'none'; // Скрываем кнопку "Играть вместе"
        multiplayerSetup.style.display = 'none';
        overlay.style.display = 'block';
        gameState = 'gameOver';
        return;
    }

    if (isPaused) {
        overlayMessage.textContent = 'Пауза';
        startButton.style.display = 'none';
        continueButton.style.display = 'block';
        restartButton.style.display = 'block';
        mainMenuButton.style.display = 'block';
        themeSelect.style.display = 'none';
        multiplayerButton.style.display = 'none'; // Скрываем кнопку "Играть вместе"
        multiplayerSetup.style.display = 'none';
        overlay.style.display = 'block';
        return;
    } else {
        overlay.style.display = 'none';
    }

    let dt = (currentTime - lastFrameTime) / 1000; // Разница во времени в секундах
    lastFrameTime = currentTime;

    // Обновление состояния игроков
    players.forEach(player => {
        if (player.hasBonus && Date.now() > player.bonusEndTime) {
            player.hasBonus = false;
        }
        if (player.isShielded && Date.now() > player.shieldEndTime) {
            player.isShielded = false;
        }
    });

    // Очистка канваса
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Отрисовка и движение игроков
    players.forEach(player => {
        player.draw();
        player.move(dt);
    });

    // Отрисовка и движение пуль
    bullets.forEach((bullet, index) => {
        bullet.draw();
        bullet.move(dt);
        if (bullet.y < 0) {
            bullets.splice(index, 1);
        }
    });

    // Отрисовка и движение астероидов
    asteroids.forEach((asteroid, index) => {
        asteroid.draw();
        asteroid.move(dt);
        if (asteroid.y > canvas.height + asteroid.size) {
            asteroids.splice(index, 1);
        }
    });

    // Отрисовка и движение бонусов
    bonuses.forEach((bonus, index) => {
        bonus.draw();
        bonus.move(dt);
        if (bonus.y > canvas.height) {
            bonuses.splice(index, 1);
        }
    });

    // Генерация новых астероидов и бонусов
    createAsteroids(dt);

    // Обработка столкновений
    handleCollisions();
    handleBonusCollisions();

    // Отображение счёта и жизней
    ctx.fillStyle = textColor;
    ctx.font = '20px Arial';
    ctx.fillText('Игрок 1 Очки: ' + formatScore(scores[0]), 10, 20);
    ctx.fillText('Жизни: ' + Math.max(players[0].lives, 0), 10, 50);
    if (players.length > 1) {
        let textWidth = ctx.measureText('Игрок 2 Очки: ' + formatScore(scores[1])).width;
        ctx.fillText('Игрок 2 Очки: ' + formatScore(scores[1]), canvas.width - textWidth - 10, 20);
        ctx.fillText('Жизни: ' + Math.max(players[1].lives, 0), canvas.width - 100, 50);
    }

    // Отображение оставшегося времени бонусов
    players.forEach((player, index) => {
        if (player.hasBonus) {
            let remainingTime = Math.ceil((player.bonusEndTime - Date.now()) / 1000);
            ctx.fillStyle = textColor;
            ctx.font = '20px Arial';
            if (index === 0) {
                ctx.fillText('Бонус: ' + remainingTime + 'с', 10, 80);
            } else {
                ctx.fillText('Бонус: ' + remainingTime + 'с', canvas.width - 150, 80);
            }
        }
    });

    // Продолжение игрового цикла, если игра продолжается
    if (gameState === 'playing') {
        requestAnimationFrame(gameLoop);
    }
}

/************ Обработчики Событий Клавиатуры ************/

// Обработчик нажатия клавиш
document.addEventListener('keydown', (e) => {
    let key = e.key;
    // Маппинг русских клавиш на английские
    if (keyMap[key]) {
        key = keyMap[key];
    }
    keys[key.toLowerCase()] = true;

    // Обработка стрельбы для каждого игрока
    players.forEach(player => {
        if (player.lives > 0 && player.controls.shoot.includes(e.key)) {
            player.shoot();
        }
    });

    // Обработка паузы
    if (e.key === 'Escape') {
        if (gameState === 'playing') {
            isPaused = true;
            gameState = 'paused';
        } else if (gameState === 'paused') {
            isPaused = false;
            gameState = 'playing';
            overlay.style.display = 'none';
            lastFrameTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    }
});

// Обработчик отпускания клавиш
document.addEventListener('keyup', (e) => {
    let key = e.key;
    if (keyMap[key]) {
        key = keyMap[key];
    }
    keys[key.toLowerCase()] = false;
});

/************ Обработчики Событий Интерфейса ************/

// Начало игры (одиночный режим)
startButton.addEventListener('click', () => {
    resetGame();
    currentMode = 'single';
    setupSinglePlayer();
    overlay.style.display = 'none';
    gameState = 'playing';
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
});

// Переход к настройке мультиплеера
multiplayerButton.addEventListener('click', () => {
    resetGame();
    currentMode = 'multi';
    overlayMessage.textContent = 'Настройка игры';
    startButton.style.display = 'none';
    multiplayerButton.style.display = 'none';
    themeSelect.style.display = 'none';
    multiplayerSetup.style.display = 'block';
    setupColorSelectors();
});

// Начало игры в мультиплеере после выбора цветов
startMultiplayerButton.addEventListener('click', () => {
    resetGame();
    currentMode = 'multi';
    setupMultiplayer();
    overlay.style.display = 'none';
    gameState = 'playing';
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
});

// Продолжение игры после паузы
continueButton.addEventListener('click', () => {
    overlay.style.display = 'none';
    gameState = 'playing';
    isPaused = false;
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
});

// Перезапуск игры
restartButton.addEventListener('click', () => {
    resetGame();
    if (currentMode === 'single') {
        setupSinglePlayer();
    } else if (currentMode === 'multi') {
        setupMultiplayer();
    }
    overlay.style.display = 'none';
    gameState = 'playing';
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
});

// Возврат в главное меню
mainMenuButton.addEventListener('click', () => {
    resetGame();
    currentMode = 'single'; // Сброс режима игры
    selectedColors = {}; // Сбрасываем выбор цветов
    overlayMessage.textContent = 'Главное меню';
    startButton.style.display = 'block';
    multiplayerButton.style.display = 'block';
    themeSelect.style.display = 'block';
    continueButton.style.display = 'none';
    restartButton.style.display = 'none';
    mainMenuButton.style.display = 'none';
    multiplayerSetup.style.display = 'none';
    overlay.style.display = 'block';
    gameState = 'mainMenu';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

/************ Функции Инициализации и Настройки Игры ************/

/**
 * Сброс игрового состояния
 */
function resetGame() {
    players = [];
    asteroids = [];
    bullets = [];
    bonuses = [];
    scores = [0, 0];
    gameOver = false;
    isPaused = false;
    level = 1;
    nextLevelScore = 1000;
    asteroidSpeedMultiplier = 1;
    scoreMultiplier = 1;
    levelUpMessageTime = 0;
    nextWeaponUpgradeScore = 500;
    lastFrameTime = performance.now();
    asteroidSpawnTimer = 0;
    keys = {};
    // Не сбрасываем selectedColors, чтобы сохранить выбор цвета
}

/**
 * Настройка одиночного игрока
 */
function setupSinglePlayer() {
    currentTheme = themeSelect.value;
    applyTheme(currentTheme);
    let player = new Player(canvas.width / 2 - 20, {
        left: ['ArrowLeft'],
        right: ['ArrowRight'],
        shoot: [' ']
    }, currentTheme === 'dark' ? 'white' : 'black', 0);
    players.push(player);
}

/**
 * Настройка мультиплеера
 */
function setupMultiplayer() {
    currentTheme = themeSelect.value;
    applyTheme(currentTheme);

    let player1Controls = {
        left: ['a', 'ф', 'A', 'Ф'],
        right: ['d', 'в', 'D', 'В'],
        shoot: [' ']
    };
    let player2Controls = {
        left: ['ArrowLeft'],
        right: ['ArrowRight'],
        shoot: ['Control']
    };

    let player1 = new Player(canvas.width / 4 - 20, player1Controls, selectedColors['player1'], 0);
    let player2 = new Player(3 * canvas.width / 4 - 20, player2Controls, selectedColors['player2'], 1);
    players.push(player1, player2);
}

/**
 * Настройка селекторов цветов для мультиплеера
 */
function setupColorSelectors() {
    createColorButtons(player1ColorsDiv, 'player1');
    createColorButtons(player2ColorsDiv, 'player2');
}

/**
 * Создание кнопок выбора цвета
 * @param {HTMLElement} container - Контейнер для кнопок
 * @param {string} player - Идентификатор игрока ('player1' или 'player2')
 */
function createColorButtons(container, player) {
    container.innerHTML = '';
    availableColors.forEach(color => {
        let colorButton = document.createElement('div');
        colorButton.classList.add('color-button');
        colorButton.style.backgroundColor = color;
        colorButton.addEventListener('click', () => {
            selectColor(player, color);
        });
        container.appendChild(colorButton);
    });
}

/**
 * Выбор цвета игрока
 * @param {string} player - Идентификатор игрока ('player1' или 'player2')
 * @param {string} color - Выбранный цвет
 */
function selectColor(player, color) {
    if (Object.values(selectedColors).includes(color)) return;
    selectedColors[player] = color;
    updateSelectedColors();
    if (selectedColors['player1'] && selectedColors['player2']) {
        startMultiplayerButton.style.display = 'block';
        startMultiplayerButton.disabled = false; // Активируем кнопку
    } else {
        startMultiplayerButton.disabled = true; // Деактивируем кнопку
    }
}

/**
 * Обновление состояния кнопок выбора цвета
 */
function updateSelectedColors() {
    updateColorButtons(player1ColorsDiv, 'player1');
    updateColorButtons(player2ColorsDiv, 'player2');
}

/**
 * Обновление визуального состояния кнопок выбора цвета
 * @param {HTMLElement} container - Контейнер с кнопками
 * @param {string} player - Идентификатор игрока ('player1' или 'player2')
 */
function updateColorButtons(container, player) {
    let buttons = container.querySelectorAll('.color-button');
    buttons.forEach(button => {
        button.classList.remove('selected');
        let color = button.style.backgroundColor;
        if (selectedColors[player] === color) {
            button.classList.add('selected');
        } else if (Object.values(selectedColors).includes(color)) {
            button.style.opacity = '0.5';
            button.style.pointerEvents = 'none';
        } else {
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
        }
    });
}

/************ Применение Начальной Темы ************/
applyTheme(currentTheme);