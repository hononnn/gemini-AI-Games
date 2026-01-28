// 游戏基本参数
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

// 游戏状态
let gameRunning = false;
let gamePaused = false;
let score = 0;
let timeLeft = 60;
let gameLoopId;
let timerId;

// 浮动奖励文字数组
let floatingTexts = [];

// 首页飘落装饰
let homeDecorations = [];
let homeDecorationInterval;

// 创建财神图片对象
const caiShenImage = new Image();
caiShenImage.src = '财神图片.png';

// 玩家（财神）
const player = {
    x: width / 2 - 40,
    y: height - 100,
    width: 100,
    height: 100,
    speed: 8,
    movingLeft: false,
    movingRight: false
};

// 游戏物品数组（统一管理元宝、红包、炸弹）
let items = [];
let itemSpawnRate = 800; // 物品生成间隔（毫秒）
let lastItemSpawn = 0;

// 物品类型
const ITEM_TYPES = {
    INGOT: 'ingot', // 元宝
    RED_PACKET: 'red_packet', // 红包
    BOMB: 'bomb' // 炸弹
};

// 物品类型概率
const ITEM_PROBABILITIES = {
    [ITEM_TYPES.INGOT]: 0.4, // 40%概率生成元宝
    [ITEM_TYPES.RED_PACKET]: 0.5, // 50%概率生成红包
    [ITEM_TYPES.BOMB]: 0.1 // 10%概率生成炸弹
};

// 按键控制
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        player.movingLeft = true;
    } else if (e.key === 'ArrowRight') {
        player.movingRight = true;
    } else if (e.key === ' ' || e.key === 'Enter') {
        // 空格键或回车键控制游戏开始/暂停
        if (!gameRunning) {
            startGame();
        } else {
            togglePause();
        }
    } else if (e.key === 'r' || e.key === 'R') {
        // R键重置游戏
        resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') {
        player.movingLeft = false;
    } else if (e.key === 'ArrowRight') {
        player.movingRight = false;
    }
});

// 游戏手柄支持
let gamepads = {};
let currentFocusIndex = 0;
let focusableElements = [];
let focusMap = {}; // 聚焦区域映射，记录元素间的导航关系
let currentFocusElement = null;
let isInGame = false; // 标记是否在游戏进行中
let joystickThreshold = 0.7; // 摇杆阈值，超过该值才触发导航
let lastJoystickTime = 0; // 上次摇杆操作时间，用于防止频繁触发
let joystickCooldown = 200; // 摇杆操作冷却时间（毫秒）

// 创建聚焦区域导航映射
function createFocusMap() {
    const gameHome = document.getElementById('gameHome');
    const gameContainer = document.getElementById('gameContainer');
    
    focusMap = {};
    
    if (gameHome.style.display !== 'none') {
        // 首页聚焦区域映射（二维结构）
        const homeShareBtn = document.getElementById('homeShareBtn');
        const homeStartBtn = document.getElementById('homeStartBtn');
        
        if (homeShareBtn && homeStartBtn) {
            focusableElements = [homeShareBtn, homeStartBtn];
            
            // 构建导航映射：element -> { up, down, left, right }
            focusMap[homeShareBtn.id] = {
                element: homeShareBtn,
                up: null,
                down: homeStartBtn,
                left: null,
                right: null
            };
            
            focusMap[homeStartBtn.id] = {
                element: homeStartBtn,
                up: homeShareBtn,
                down: null,
                left: null,
                right: null
            };
        }
        
        isInGame = false;
    } else if (gameContainer.style.display !== 'none') {
        // 游戏界面聚焦区域映射
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        const elements = [startBtn, pauseBtn, resetBtn];
        
        // 如果游戏结束，添加分享按钮
        const gameOverShareContainer = document.getElementById('gameOverShareContainer');
        const gameOverShareBtn = document.getElementById('gameOverShareBtn');
        
        if (gameOverShareContainer && gameOverShareContainer.style.display !== 'none' && gameOverShareBtn) {
            elements.splice(1, 0, gameOverShareBtn);
        }
        
        // 过滤掉不存在或不可见的元素
        focusableElements = elements.filter(element => 
            element && element.style.display !== 'none'
        );
        
        // 根据元素在屏幕上的实际位置构建导航映射
        if (startBtn && pauseBtn && resetBtn) {
            // 构建导航映射（只包含按键元素）
            if (gameOverShareBtn) {
                focusMap[gameOverShareBtn.id] = {
                    element: gameOverShareBtn,
                    up: null,
                    down: startBtn,
                    left: null,
                    right: null
                };
            }
            
            focusMap[startBtn.id] = {
                element: startBtn,
                up: gameOverShareBtn || null,
                down: null,
                left: null,
                right: pauseBtn
            };
            
            focusMap[pauseBtn.id] = {
                element: pauseBtn,
                up: gameOverShareBtn || null,
                down: null,
                left: startBtn,
                right: resetBtn
            };
            
            focusMap[resetBtn.id] = {
                element: resetBtn,
                up: gameOverShareBtn || null,
                down: null,
                left: pauseBtn,
                right: null
            };
        }
        
        isInGame = true;
    }
}

// 更新可聚焦元素列表
function updateFocusableElements() {
    createFocusMap();
    
    // 从focusMap中提取所有可聚焦元素
    focusableElements = Object.values(focusMap).map(item => item.element);
    
    // 确保当前焦点索引在有效范围内
    if (currentFocusIndex >= focusableElements.length) {
        currentFocusIndex = focusableElements.length - 1;
    }
    if (currentFocusIndex < 0) {
        currentFocusIndex = 0;
    }
    
    // 设置当前焦点
    focusElement(currentFocusIndex);
}

// 设置元素焦点
function focusElement(index) {
    if (focusableElements[index]) {
        // 移除所有元素的自定义焦点样式
        focusableElements.forEach(el => {
            el.classList.remove('focused');
        });
        
        // 设置新的焦点元素
        const element = focusableElements[index];
        element.focus();
        element.classList.add('focused');
        currentFocusElement = element;
        currentFocusIndex = index;
    }
}

// 设置元素焦点（通过元素对象）
function focusElementByElement(element) {
    if (element) {
        // 移除所有元素的自定义焦点样式
        focusableElements.forEach(el => {
            el.classList.remove('focused');
        });
        
        // 设置新的焦点元素
        element.focus();
        element.classList.add('focused');
        currentFocusElement = element;
        currentFocusIndex = focusableElements.indexOf(element);
    }
}

// 手柄连接事件
window.addEventListener('gamepadconnected', (e) => {
    console.log('🎮 游戏手柄已连接:', e.gamepad.id);
    console.log('   手柄索引:', e.gamepad.index);
    console.log('   按钮数量:', e.gamepad.buttons.length);
    console.log('   摇杆数量:', e.gamepad.axes.length);
    gamepads[e.gamepad.index] = e.gamepad;
    
    // 更新可聚焦元素列表
    updateFocusableElements();
    
    // 显示连接提示
    alert('游戏手柄已连接！\n\n可用按钮:\n- 左摇杆/方向键: 移动财神（游戏中）或导航界面（菜单）\n- A按钮: 确认/开始/暂停游戏\n- B按钮: 重置游戏\n- X按钮: 分享功能\n- 上下键: 导航菜单');
});

// 手柄断开事件
window.addEventListener('gamepaddisconnected', (e) => {
    console.log('🎮 游戏手柄已断开:', e.gamepad.id);
    delete gamepads[e.gamepad.index];
});

// 手柄输入处理
function handleGamepadInput() {
    // 获取所有连接的手柄
    const connectedGamepads = navigator.getGamepads();
    const now = Date.now();
    
    for (let i = 0; i < connectedGamepads.length; i++) {
        const gamepad = connectedGamepads[i];
        if (gamepad && gamepad.connected) {
            // 检测按钮按下事件
            const buttonsPressed = [];
            for (let j = 0; j < gamepad.buttons.length; j++) {
                if (gamepad.buttons[j].pressed) {
                    buttonsPressed.push(j);
                }
            }
            
            // 游戏进行中 - 控制角色移动
            if (isInGame && gameRunning && !gamePaused) {
                // 左摇杆X轴控制左右移动
                const leftRight = gamepad.axes[0] || 0;
                
                // 方向键控制左右移动
                const dpadLeft = gamepad.buttons[14].pressed;
                const dpadRight = gamepad.buttons[15].pressed;
                
                if (leftRight < -0.5 || dpadLeft) {
                    player.movingLeft = true;
                } else {
                    player.movingLeft = false;
                }
                
                if (leftRight > 0.5 || dpadRight) {
                    player.movingRight = true;
                } else {
                    player.movingRight = false;
                }
            } 
            // 菜单导航模式
            else {
                // 检查当前是否有焦点元素
                if (!currentFocusElement && focusableElements.length > 0) {
                    focusElement(0);
                }
                
                if (currentFocusElement) {
                    const currentElementId = currentFocusElement.id;
                    const navigationInfo = focusMap[currentElementId];
                    
                    if (navigationInfo) {
                        // 检查摇杆输入
                        const leftStickX = gamepad.axes[0] || 0;
                        const leftStickY = gamepad.axes[1] || 0;
                        
                        // 检查是否可以处理摇杆输入（冷却时间）
                        const canProcessJoystick = (now - lastJoystickTime) > joystickCooldown;
                        
                        // 上方向导航
                        if (gamepad.buttons[12].pressed || (canProcessJoystick && leftStickY < -joystickThreshold)) {
                            if (navigationInfo.up) {
                                focusElementByElement(navigationInfo.up);
                                lastJoystickTime = now;
                            }
                        }
                        
                        // 下方向导航
                        if (gamepad.buttons[13].pressed || (canProcessJoystick && leftStickY > joystickThreshold)) {
                            if (navigationInfo.down) {
                                focusElementByElement(navigationInfo.down);
                                lastJoystickTime = now;
                            }
                        }
                        
                        // 左方向导航
                        if (gamepad.buttons[14].pressed || (canProcessJoystick && leftStickX < -joystickThreshold)) {
                            if (navigationInfo.left) {
                                focusElementByElement(navigationInfo.left);
                                lastJoystickTime = now;
                            }
                        }
                        
                        // 右方向导航
                        if (gamepad.buttons[15].pressed || (canProcessJoystick && leftStickX > joystickThreshold)) {
                            if (navigationInfo.right) {
                                focusElementByElement(navigationInfo.right);
                                lastJoystickTime = now;
                            }
                        }
                    }
                }
            }
            
            // 按钮状态跟踪，用于避免重复触发
            const aButtonPressed = buttonsPressed.includes(0);
            const bButtonPressed = buttonsPressed.includes(1);
            const lastButtonState = gamepad.lastButtonState || {};
            
            // A按钮（通常是0号按钮）- 确认/点击当前聚焦的按钮
            if (aButtonPressed && !lastButtonState.a) {
                if (currentFocusElement) {
                    // 添加视觉反馈
                    currentFocusElement.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        if (currentFocusElement) {
                            currentFocusElement.style.transform = 'scale(1.05)';
                        }
                    }, 100);
                    
                    // 模拟点击事件
                    currentFocusElement.click();
                } else if (!isInGame) {
                    // 如果没有聚焦元素但在首页，默认点击开始游戏
                    const startBtn = document.getElementById('homeStartBtn');
                    if (startBtn) {
                        startBtn.click();
                    }
                } else if (!gameRunning) {
                    // 在游戏界面但未开始，点击开始游戏
                    startGame();
                } else {
                    // 游戏进行中，暂停游戏
                    togglePause();
                }
            }
            
            // B按钮（通常是1号按钮）- 取消/返回/重置
            if (bButtonPressed && !lastButtonState.b) {
                if (isInGame) {
                    // 游戏中按B键重置
                    resetGame();
                } else {
                    // 在首页按B键可以返回（如果有多个菜单的话）
                    console.log('B按钮在首页被按下（取消/返回）');
                    // 这里可以添加返回功能，例如回到主菜单
                }
            }
            
            // 保存按钮状态
            gamepad.lastButtonState = {
                a: aButtonPressed,
                b: bButtonPressed
            };
            
            // X按钮（通常是2号按钮）- 分享功能
            if (buttonsPressed.includes(2)) {
                if (isInGame) {
                    // 如果游戏结束，分享战绩
                    const gameOverShareBtn = document.getElementById('gameOverShareBtn');
                    if (gameOverShareBtn && gameOverShareBtn.style.display !== 'none') {
                        gameOverShareBtn.click();
                    } else {
                        // 游戏进行中，分享游戏
                        shareGame('home');
                    }
                } else {
                    // 在首页分享游戏
                    const homeShareBtn = document.getElementById('homeShareBtn');
                    if (homeShareBtn) homeShareBtn.click();
                }
            }
            
            // Y按钮（通常是3号按钮）- 额外功能（可以根据需要添加）
            if (buttonsPressed.includes(3)) {
                console.log('Y按钮被按下');
            }
            
            // 开始按钮（通常是9号按钮）- 开始/暂停游戏
            if (buttonsPressed.includes(9)) {
                if (isInGame) {
                    if (!gameRunning) {
                        startGame();
                    } else {
                        togglePause();
                    }
                }
            }
            
            // 选择按钮（通常是8号按钮）- 显示帮助/菜单
            if (buttonsPressed.includes(8)) {
                console.log('选择按钮被按下');
            }
        }
    }
}

// 移动端按钮控制
window.addEventListener('load', () => {
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    
    if (leftBtn && rightBtn) {
        // 鼠标事件
        leftBtn.addEventListener('mousedown', () => {
            player.movingLeft = true;
        });
        
        leftBtn.addEventListener('mouseup', () => {
            player.movingLeft = false;
        });
        
        leftBtn.addEventListener('mouseleave', () => {
            player.movingLeft = false;
        });
        
        rightBtn.addEventListener('mousedown', () => {
            player.movingRight = true;
        });
        
        rightBtn.addEventListener('mouseup', () => {
            player.movingRight = false;
        });
        
        rightBtn.addEventListener('mouseleave', () => {
            player.movingRight = false;
        });
        
        // 触摸事件
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault(); // 防止默认的触摸行为
            player.movingLeft = true;
        });
        
        leftBtn.addEventListener('touchend', (e) => {
            e.preventDefault(); // 防止默认的触摸行为
            player.movingLeft = false;
        });
        
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault(); // 防止默认的触摸行为
            player.movingRight = true;
        });
        
        rightBtn.addEventListener('touchend', (e) => {
            e.preventDefault(); // 防止默认的触摸行为
            player.movingRight = false;
        });
    }
});

// 按钮控制 - 游戏首页
document.getElementById('homeStartBtn').addEventListener('click', () => {
    stopHomeDecorations();
    document.getElementById('gameHome').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    initGame();
    // 更新可聚焦元素列表
    setTimeout(updateFocusableElements, 100);
});

// 按钮控制 - 游戏主界面
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('resetBtn').addEventListener('click', resetGame);

// 生成首页飘落装饰
function spawnHomeDecoration() {
    const decorations = ['💰', '🧧', '🎊', '🎉', '🎈'];
    const decoration = {
        text: decorations[Math.floor(Math.random() * decorations.length)],
        x: Math.random() * 400,
        y: -20,
        size: Math.random() * 20 + 10,
        speed: Math.random() * 2 + 1,
        opacity: Math.random() * 0.8 + 0.2
    };
    homeDecorations.push(decoration);
}

// 绘制首页飘落装饰
function drawHomeDecorations() {
    const homeCanvas = document.getElementById('homeCanvas');
    if (!homeCanvas) return;
    
    const homeCtx = homeCanvas.getContext('2d');
    homeCtx.clearRect(0, 0, homeCanvas.width, homeCanvas.height);
    
    homeDecorations.forEach(decoration => {
        homeCtx.font = `${decoration.size}px Arial`;
        homeCtx.fillStyle = `rgba(255, 215, 0, ${decoration.opacity})`;
        homeCtx.fillText(decoration.text, decoration.x, decoration.y);
        
        // 更新位置
        decoration.y += decoration.speed;
        
        // 添加左右摇摆效果
        decoration.x += Math.sin(decoration.y / 20) * 0.5;
    });
    
    // 移除超出画布的装饰
    homeDecorations = homeDecorations.filter(decoration => decoration.y < homeCanvas.height);
}

// 启动首页装饰动画
function startHomeDecorations() {
    homeDecorations = [];
    homeDecorationInterval = setInterval(() => {
        spawnHomeDecoration();
        drawHomeDecorations();
    }, 100);
}

// 停止首页装饰动画
function stopHomeDecorations() {
    clearInterval(homeDecorationInterval);
    homeDecorations = [];
}

// 游戏初始化
function initGame() {
    score = 0;
    timeLeft = 60;
    gameRunning = false;
    gamePaused = false;
    items = [];
    player.x = width / 2 - 25;
    player.movingLeft = false;
    player.movingRight = false;
    updateScore();
    updateTime();
    drawGame();
}

// 开始游戏
function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        lastItemSpawn = Date.now();
        // 隐藏游戏结束分享按钮
        document.getElementById('gameOverShareContainer').style.display = 'none';
        gameLoop();
        startTimer();
    }
}

// 暂停/继续游戏
function togglePause() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        if (gamePaused) {
            clearInterval(timerId);
            cancelAnimationFrame(gameLoopId);
        } else {
            lastItemSpawn = Date.now();
            gameLoop();
            startTimer();
        }
    }
}

// 重置游戏
function resetGame() {
    gameRunning = false;
    gamePaused = false;
    clearInterval(timerId);
    cancelAnimationFrame(gameLoopId);
    initGame();
}

// 游戏主循环
function gameLoop() {
    // 无论游戏是否运行，都处理手柄输入（用于菜单导航）
    handleGamepadInput();
    
    if (!gameRunning || gamePaused) {
        // 如果游戏未运行或暂停，仍然绘制游戏画面
        drawGame();
        gameLoopId = requestAnimationFrame(gameLoop);
        return;
    }
    
    updateGame();
    drawGame();
    gameLoopId = requestAnimationFrame(gameLoop);
}

// 更新游戏状态
function updateGame() {
    // 更新玩家位置
    if (player.movingLeft && player.x > 0) {
        player.x -= player.speed;
    }
    if (player.movingRight && player.x < width - player.width) {
        player.x += player.speed;
    }
    
    // 生成物品
    const now = Date.now();
    if (now - lastItemSpawn > itemSpawnRate) {
        spawnItem();
        lastItemSpawn = now;
    }
    
    // 更新物品位置并检查碰撞
    for (let i = items.length - 1; i >= 0; i--) {
        items[i].y += items[i].speed;
        
        // 检查是否落地
        if (items[i].y > height) {
            items.splice(i, 1);
        } 
        // 检查碰撞
        else if (checkCollision(player, items[i])) {
            handleItemCollision(items[i]);
            items.splice(i, 1);
        }
    }
    
    // 更新浮动文字
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const text = floatingTexts[i];
        // 向上移动
        text.y -= text.speed;
        // 逐渐降低透明度
        text.opacity -= 0.015;
        // 减少生命周期
        text.lifetime--;
        
        // 移除生命周期结束或透明度为0的文字
        if (text.lifetime <= 0 || text.opacity <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
    
    // 检查游戏结束
    if (timeLeft <= 0) {
        endGame();
    }
}

// 根据概率随机选择物品类型
function getRandomItemType() {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [type, probability] of Object.entries(ITEM_PROBABILITIES)) {
        cumulative += probability;
        if (rand < cumulative) {
            return type;
        }
    }
    
    return ITEM_TYPES.INGOT; // 默认返回元宝
}

// 生成物品
function spawnItem() {
    const itemType = getRandomItemType();
    const x = Math.random() * (width - 30);
    const speed = Math.random() * 3 + 3;
    
    let item;
    switch (itemType) {
        case ITEM_TYPES.INGOT:
            item = {
                type: ITEM_TYPES.INGOT,
                x: x,
                y: 0,
                width: 30,
                height: 35,
                speed: speed
            };
            break;
        case ITEM_TYPES.RED_PACKET:
            // 红包奖励在元宝的50%-200%之间（5-20分）
            const ingotValue = 10;
            const minPacketValue = Math.floor(ingotValue * 0.5);
            const maxPacketValue = Math.floor(ingotValue * 2.0);
            item = {
                type: ITEM_TYPES.RED_PACKET,
                x: x,
                y: 0,
                width: 25,
                height: 30,
                speed: speed + 1,
                value: Math.floor(Math.random() * (maxPacketValue - minPacketValue + 1)) + minPacketValue
            };
            break;
        case ITEM_TYPES.BOMB:
            item = {
                type: ITEM_TYPES.BOMB,
                x: x,
                y: 0,
                width: 30,
                height: 30,
                speed: speed + 2
            };
            break;
    }
    
    items.push(item);
}

// 处理物品碰撞
function handleItemCollision(item) {
    switch (item.type) {
        case ITEM_TYPES.INGOT:
            score += 10;
            // 添加浮动文字
            floatingTexts.push({
                text: '+10',
                x: player.x + player.width / 2,
                y: player.y - 10,
                opacity: 1,
                size: 24,
                speed: 3,
                lifetime: 60, // 存在帧数
                color: '#ffd700' // 金色
            });
            break;
        case ITEM_TYPES.RED_PACKET:
            score += item.value;
            // 添加浮动文字
            floatingTexts.push({
                text: `+${item.value}`,
                x: player.x + player.width / 2,
                y: player.y - 10,
                opacity: 1,
                size: 24,
                speed: 3,
                lifetime: 60, // 存在帧数
                color: '#ff5733' // 红色
            });
            break;
        case ITEM_TYPES.BOMB:
            score -= 10;
            if (score < 0) score = 0; // 分数不能为负
            // 添加浮动文字
            floatingTexts.push({
                text: '-10',
                x: player.x + player.width / 2,
                y: player.y - 10,
                opacity: 1,
                size: 24,
                speed: 3,
                lifetime: 60, // 存在帧数
                color: '#333333' // 黑色
            });
            break;
    }
    updateScore();
}

// 绘制游戏
function drawGame() {
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景
    drawBackground();
    
    // 绘制玩家（财神）
    drawPlayer();
    
    // 绘制所有物品
    drawItems();
    
    // 绘制浮动奖励文字
    floatingTexts.forEach(text => {
        ctx.font = `bold ${text.size}px Arial`;
        ctx.fillStyle = `rgba(${hexToRgb(text.color)}, ${text.opacity})`;
        ctx.textAlign = 'center';
        ctx.fillText(text.text, text.x, text.y);
    });
    
    // 如果游戏暂停，显示暂停提示
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏暂停', width / 2, height / 2);
    }
}

// 绘制所有物品
function drawItems() {
    for (const item of items) {
        switch (item.type) {
            case ITEM_TYPES.INGOT:
                drawIngot(item);
                break;
            case ITEM_TYPES.RED_PACKET:
                drawRedPacket(item);
                break;
            case ITEM_TYPES.BOMB:
                drawBomb(item);
                break;
        }
    }
}

// 绘制元宝
function drawIngot(ingot) {
    // 元宝主体
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(ingot.x + 15, ingot.y);
    ctx.lineTo(ingot.x + 30, ingot.y + 15);
    ctx.lineTo(ingot.x + 30, ingot.y + 25);
    ctx.lineTo(ingot.x + 15, ingot.y + 35);
    ctx.lineTo(ingot.x, ingot.y + 25);
    ctx.lineTo(ingot.x, ingot.y + 15);
    ctx.closePath();
    ctx.fill();
    
    // 元宝中间线
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ingot.x, ingot.y + 20);
    ctx.lineTo(ingot.x + 30, ingot.y + 20);
    ctx.stroke();
    
    // 高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(ingot.x + 20, ingot.y + 10, 3, 0, Math.PI * 2);
    ctx.fill();
}

// 绘制红包
function drawRedPacket(packet) {
    // 红包主体
    ctx.fillStyle = '#c70039';
    ctx.fillRect(packet.x, packet.y + 5, packet.width, packet.height - 10);
    
    // 红包顶部和底部
    ctx.fillStyle = '#ff5733';
    ctx.fillRect(packet.x + 5, packet.y, packet.width - 10, 5);
    ctx.fillRect(packet.x + 5, packet.y + packet.height - 5, packet.width - 10, 5);
    
    // 红包上的装饰
    ctx.fillStyle = '#ffd700';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('福', packet.x + packet.width / 2, packet.y + packet.height / 2 + 5);
    
    // 红包上的线条
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(packet.x + packet.width / 2, packet.y + 5);
    ctx.lineTo(packet.x + packet.width / 2, packet.y + packet.height - 5);
    ctx.stroke();
}

// 绘制炸弹
function drawBomb(bomb) {
    // 炸弹主体
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(bomb.x + bomb.width / 2, bomb.y + bomb.height / 2, bomb.width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 炸弹导火索
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(bomb.x + bomb.width / 2 - 2, bomb.y, 4, 10);
    
    // 炸弹火焰
    ctx.fillStyle = '#ff5733';
    ctx.beginPath();
    ctx.arc(bomb.x + bomb.width / 2, bomb.y - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffc300';
    ctx.beginPath();
    ctx.arc(bomb.x + bomb.width / 2, bomb.y - 5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 炸弹上的条纹
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bomb.x, bomb.y + bomb.height / 2);
    ctx.lineTo(bomb.x + bomb.width, bomb.y + bomb.height / 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(bomb.x + bomb.width / 2, bomb.y + bomb.height / 2, bomb.width / 2, 0, Math.PI);
    ctx.stroke();
}

// 绘制背景
function drawBackground() {
    // 天空背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(1, '#e0f7fa');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 云朵
    drawCloud(50, 100);
    drawCloud(200, 150);
    drawCloud(300, 80);
}

// 绘制云朵
function drawCloud(x, y) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 25, y, 30, 0, Math.PI * 2);
    ctx.arc(x + 50, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 35, y - 20, 20, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
}

// 绘制玩家（财神）
function drawPlayer() {
    // 绘制财神图片
    ctx.drawImage(caiShenImage, player.x, player.y, player.width, player.height);
}



// 碰撞检测
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// 更新分数
function updateScore() {
    document.getElementById('score').textContent = score;
}

// 更新时间
function updateTime() {
    document.getElementById('time').textContent = timeLeft;
}

// 开始计时器
function startTimer() {
    timerId = setInterval(() => {
        if (gameRunning && !gamePaused) {
            timeLeft--;
            updateTime();
            if (timeLeft <= 0) {
                endGame();
            }
        }
    }, 1000);
}

// 游戏结束
function endGame() {
    gameRunning = false;
    clearInterval(timerId);
    
    // 显示游戏结束信息
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', width / 2, height / 2 - 30);
    ctx.font = '20px Arial';
    ctx.fillText(`最终分数: ${score}`, width / 2, height / 2 + 10);
    ctx.font = '16px Arial';
    ctx.fillText('点击"开始游戏"重新开始', width / 2, height / 2 + 40);
    
    // 显示游戏结束分享按钮
    document.getElementById('gameOverShareContainer').style.display = 'block';
    
    // 更新可聚焦元素列表，添加分享按钮
    setTimeout(updateFocusableElements, 100);
    
    // 继续游戏循环以处理手柄输入
    gameLoopId = requestAnimationFrame(gameLoop);
}

// 初始化首页Canvas
function initHomeCanvas() {
    const homeCanvas = document.getElementById('homeCanvas');
    if (homeCanvas) {
        const container = document.getElementById('gameHome');
        homeCanvas.width = container.clientWidth;
        homeCanvas.height = container.clientHeight;
        startHomeDecorations();
    }
}

// 页面加载完成后初始化
window.addEventListener('load', () => {
    initHomeCanvas();
    
    // 监听窗口大小变化，调整首页Canvas尺寸
    window.addEventListener('resize', initHomeCanvas);
    
    // 初始化分享按钮事件
    initShareButtons();
    
    // 初始化焦点系统
    updateFocusableElements();
    
    // 调试：添加手柄测试功能（按T键）
    document.addEventListener('keydown', (e) => {
        if (e.key === 't' || e.key === 'T') {
            testGamepadSupport();
        }
        
        // 调试：使用WASD键模拟手柄摇杆输入，测试聚焦系统
        if (e.key === 'w' || e.key === 'W') {
            // 上
            simulateJoystickInput(0, -1);
        } else if (e.key === 's' || e.key === 'S') {
            // 下
            simulateJoystickInput(0, 1);
        } else if (e.key === 'a' || e.key === 'A') {
            // 左
            simulateJoystickInput(-1, 0);
        } else if (e.key === 'd' || e.key === 'D') {
            // 右
            simulateJoystickInput(1, 0);
        } else if (e.key === 'j' || e.key === 'J') {
            // 模拟A键
            simulateButtonInput(0);
        } else if (e.key === 'k' || e.key === 'K') {
            // 模拟B键
            simulateButtonInput(1);
        }
    });
    
    // 模拟摇杆输入
    function simulateJoystickInput(x, y) {
        if (!isInGame || (isInGame && !gameRunning)) {
            // 只在菜单模式下模拟
            const now = Date.now();
            if ((now - lastJoystickTime) > joystickCooldown) {
                if (currentFocusElement) {
                    const currentElementId = currentFocusElement.id;
                    const navigationInfo = focusMap[currentElementId];
                    
                    if (navigationInfo) {
                        if (y < -joystickThreshold && navigationInfo.up) {
                            focusElementByElement(navigationInfo.up);
                        } else if (y > joystickThreshold && navigationInfo.down) {
                            focusElementByElement(navigationInfo.down);
                        } else if (x < -joystickThreshold && navigationInfo.left) {
                            focusElementByElement(navigationInfo.left);
                        } else if (x > joystickThreshold && navigationInfo.right) {
                            focusElementByElement(navigationInfo.right);
                        }
                    }
                    lastJoystickTime = now;
                }
            }
        }
    }
    
    // 模拟按钮输入
    function simulateButtonInput(buttonIndex) {
        if (buttonIndex === 0) {
            // A键
            if (currentFocusElement) {
                currentFocusElement.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    if (currentFocusElement) {
                        currentFocusElement.style.transform = 'scale(1.05)';
                    }
                }, 100);
                currentFocusElement.click();
            } else if (!isInGame) {
                const startBtn = document.getElementById('homeStartBtn');
                if (startBtn) startBtn.click();
            } else if (!gameRunning) {
                startGame();
            } else {
                togglePause();
            }
        } else if (buttonIndex === 1) {
            // B键
            if (isInGame) {
                resetGame();
            } else {
                console.log('B按钮在首页被按下（取消/返回）');
            }
        }
    }
});

// 测试游戏手柄支持
function testGamepadSupport() {
    if ('getGamepads' in navigator) {
        console.log('✅ 浏览器支持游戏手柄API');
        
        // 显示当前连接的手柄信息
        const connectedGamepads = navigator.getGamepads();
        let found = false;
        
        for (let i = 0; i < connectedGamepads.length; i++) {
            const gamepad = connectedGamepads[i];
            if (gamepad && gamepad.connected) {
                found = true;
                console.log('🎮 已连接的手柄:');
                console.log('   ID:', gamepad.id);
                console.log('   索引:', gamepad.index);
                console.log('   按钮数量:', gamepad.buttons.length);
                console.log('   摇杆数量:', gamepad.axes.length);
                
                // 显示按钮状态
                console.log('   按钮状态:');
                for (let j = 0; j < gamepad.buttons.length; j++) {
                    if (gamepad.buttons[j].pressed) {
                        console.log('      按钮', j, ': 按下');
                    }
                }
                
                // 显示摇杆状态
                console.log('   摇杆状态:');
                for (let j = 0; j < gamepad.axes.length; j += 2) {
                    console.log('      摇杆', Math.floor(j/2), ': X=', gamepad.axes[j].toFixed(2), ', Y=', gamepad.axes[j+1].toFixed(2));
                }
            }
        }
        
        if (!found) {
            console.log('❌ 没有检测到已连接的游戏手柄');
            alert('没有检测到已连接的游戏手柄\n\n请确保手柄已正确连接并已开启');
        }
    } else {
        console.log('❌ 浏览器不支持游戏手柄API');
        alert('您的浏览器不支持游戏手柄API\n\n请尝试使用Chrome、Firefox或Edge浏览器');
    }
}

// 初始化分享按钮
function initShareButtons() {
    // 首页分享按钮
    const homeShareBtn = document.getElementById('homeShareBtn');
    if (homeShareBtn) {
        homeShareBtn.addEventListener('click', () => {
            shareGame('home');
        });
    }
    
    // 游戏结束分享按钮
    const gameOverShareBtn = document.getElementById('gameOverShareBtn');
    if (gameOverShareBtn) {
        gameOverShareBtn.addEventListener('click', () => {
            shareGame('gameOver');
        });
    }
}

// 分享功能实现
function shareGame(shareType) {
    // 在实际项目中，这里可以调用原生分享API或集成第三方分享SDK
    // 以下是一个简单的分享提示示例
    let shareMessage = '我在玩财神接元宝游戏，快来一起玩吧！';
    
    if (shareType === 'gameOver') {
        shareMessage = `我在财神接元宝游戏中获得了${score}分，快来挑战我吧！`;
    }
    
    // 尝试使用Web Share API（如果浏览器支持）
    if (navigator.share) {
        navigator.share({
            title: '财神接元宝',
            text: shareMessage,
            url: window.location.href
        }).catch(err => {
            console.log('分享失败:', err);
            alert(shareMessage);
        });
    } else {
        // 如果不支持Web Share API，显示提示信息
        alert(`分享内容：\n${shareMessage}\n\n可以复制链接分享给好友哦！`);
    }
}

// 十六进制颜色转RGB函数
function hexToRgb(hex) {
    // 移除#号
    hex = hex.replace('#', '');
    
    // 解析RGB值
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
}

// 初始化游戏
initGame();