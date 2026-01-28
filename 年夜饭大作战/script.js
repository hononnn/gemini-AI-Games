class Spring2048 {
    constructor() {
        this.size = 4;
        this.board = [];
        this.score = 0;
        this.bestScore = localStorage.getItem('spring2048-best') || 0;
        this.history = [];
        this.tileImages = {
            2: '1-小麦.png',
            4: '2-面粉.png',
            8: '3-肉.png',
            16: '4-肉馅.png',
            32: '5-饺子.png',
            64: '6-煮饺子.png',
            128: '7-一盘饺子.png',
            256: '8-年夜饭.png'
        };
        
        // 游戏封面和成功通关元素
        this.gameCover = document.getElementById('game-cover');
        this.successScreen = document.getElementById('success-screen');
        
        // 手柄支持
        this.gamepadConnected = false;
        this.gamepadId = null;
        this.gamepadPolling = false;
        this.DEAD_ZONE = 0.15; // 摇杆死区，小于这个值视为中间位置
        this.lastButtonPressTime = 0;
        this.BUTTON_PRESS_DELAY = 300; // 按钮按下延迟，防止过快操作
        this.currentPage = 'cover'; // 'cover', 'game', 'game-over', 'success'
        this.coverButtons = [];
        this.currentCoverButtonIndex = 0;
        
        this.bindEvents();
    }
    
    init() {
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.score = 0;
        this.history = [];
        this.currentPage = 'game';
        this.addRandomTile();
        this.addRandomTile();
        this.updateDisplay();
        
        // 初始化封面按钮列表
        this.initCoverButtons();
    }
    
    // 初始化封面按钮
    initCoverButtons() {
        const startGameBtn = document.getElementById('start-game');
        if (startGameBtn) {
            this.coverButtons = [startGameBtn];
            
            // 为封面按钮添加可聚焦属性
            this.coverButtons.forEach(btn => {
                btn.setAttribute('tabindex', '0');
            });
            
            // 设置初始焦点
            this.setCoverButtonFocus(0);
        }
    }
    
    // 设置封面按钮焦点
    setCoverButtonFocus(index) {
        if (index < 0 || index >= this.coverButtons.length) return;
        
        // 移除所有焦点样式
        this.coverButtons.forEach(btn => {
            btn.classList.remove('button-focused');
        });
        
        // 设置当前焦点
        const button = this.coverButtons[index];
        this.currentCoverButtonIndex = index;
        button.classList.add('button-focused');
        button.focus();
    }
    
    bindEvents() {
        document.getElementById('new-game').addEventListener('click', () => this.init());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        
        // 游戏封面开始按钮
        document.getElementById('start-game').addEventListener('click', () => this.hideCover());
        
        // 成功通关再玩一次按钮
        document.getElementById('restart-success').addEventListener('click', () => {
            this.hideSuccessScreen();
            this.init();
        });
        
        document.addEventListener('keydown', (e) => {
            if (this.isGameOver()) return;
            
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.moveUp();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.moveDown();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.moveLeft();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.moveRight();
                    break;
            }
        });
        
        this.bindTouchEvents();
        
        // 手柄事件监听
        this.bindGamepadEvents();
    }
    
    bindTouchEvents() {
        let startX, startY;
        const board = document.getElementById('game-board');
        
        board.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        board.addEventListener('touchend', (e) => {
            if (this.isGameOver()) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 30) {
                    this.moveRight();
                } else if (deltaX < -30) {
                    this.moveLeft();
                }
            } else {
                if (deltaY > 30) {
                    this.moveDown();
                } else if (deltaY < -30) {
                    this.moveUp();
                }
            }
        });
    }
    
    // 绑定手柄事件
    bindGamepadEvents() {
        window.addEventListener('gamepadconnected', (e) => {
            console.log('手柄已连接:', e.gamepad);
            this.gamepadConnected = true;
            this.gamepadId = e.gamepad.index;
            
            // 显示手柄连接提示
            this.showGamepadConnectedMessage();
            
            if (!this.gamepadPolling) {
                this.gamepadPolling = true;
                this.pollGamepad();
            }
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('手柄已断开:', e.gamepad);
            this.gamepadConnected = false;
            this.gamepadId = null;
            
            // 移除手柄连接提示
            this.removeGamepadConnectedMessage();
        });
        
        // 检查是否有已经连接的手柄
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                this.gamepadConnected = true;
                this.gamepadId = i;
                this.gamepadPolling = true;
                this.pollGamepad();
                break;
            }
        }
    }
    
    // 显示手柄连接提示
    showGamepadConnectedMessage() {
        // 如果已有提示，先移除
        this.removeGamepadConnectedMessage();
        
        // 创建提示元素
        const message = document.createElement('div');
        message.id = 'gamepadConnectedMessage';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 150, 0, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: fadeInOut 3s ease-in-out;
        `;
        
        // 添加关键帧动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                85% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
        
        message.textContent = '🎮 手柄已连接';
        document.body.appendChild(message);
        
        // 3秒后自动移除
        setTimeout(() => {
            this.removeGamepadConnectedMessage();
        }, 3000);
    }
    
    // 移除手柄连接提示
    removeGamepadConnectedMessage() {
        const message = document.getElementById('gamepadConnectedMessage');
        if (message) {
            message.remove();
        }
    }
    
    // 轮询手柄状态
    pollGamepad() {
        if (!this.gamepadPolling) return;
        
        const gamepad = navigator.getGamepads()[this.gamepadId];
        
        if (gamepad) {
            const currentTime = Date.now();
            
            // 检测十字键（数字方向键）
            const dpadLeft = gamepad.buttons[14]?.pressed || false;
            const dpadRight = gamepad.buttons[15]?.pressed || false;
            const dpadUp = gamepad.buttons[12]?.pressed || false;
            const dpadDown = gamepad.buttons[13]?.pressed || false;
            
            // 检测A键（确认键）
            const aButtonPressed = gamepad.buttons[0]?.pressed || false;
            
            // 检测B键（撤销键）
            const bButtonPressed = gamepad.buttons[1]?.pressed || false;
            
            // 检测X键（新游戏）
            const xButtonPressed = gamepad.buttons[2]?.pressed || false;
            
            // 处理游戏内手柄控制
            this.handleGameGamepad(dpadLeft, dpadRight, dpadUp, dpadDown, aButtonPressed, bButtonPressed, xButtonPressed, gamepad, currentTime);
        }
        
        requestAnimationFrame(() => this.pollGamepad());
    }
    
    // 处理游戏内手柄控制
    handleGameGamepad(dpadLeft, dpadRight, dpadUp, dpadDown, aButtonPressed, bButtonPressed, xButtonPressed, gamepad, currentTime) {
        // 获取左摇杆值
        const leftStickX = gamepad.axes[0] || 0;
        const leftStickY = gamepad.axes[1] || 0;
        
        // 检查按键延迟
        if (currentTime - this.lastButtonPressTime > this.BUTTON_PRESS_DELAY) {
            // 根据当前页面处理不同的手柄输入
            switch (this.currentPage) {
                case 'cover':
                    // 封面页面控制
                    this.handleCoverPageGamepad(dpadLeft, dpadRight, dpadUp, dpadDown, aButtonPressed, gamepad, currentTime);
                    break;
                    
                case 'game':
                    // 游戏页面控制
                    if (!this.isGameOver()) {
                        this.handleGameplayGamepad(dpadLeft, dpadRight, dpadUp, dpadDown, aButtonPressed, bButtonPressed, xButtonPressed, gamepad, currentTime);
                    }
                    break;
                    
                case 'game-over':
                    // 游戏失败页面控制
                    this.handleGameOverPageGamepad(dpadLeft, dpadRight, dpadUp, dpadDown, aButtonPressed, gamepad, currentTime);
                    break;
                    
                case 'success':
                    // 成功页面控制
                    this.handleSuccessPageGamepad(aButtonPressed, gamepad, currentTime);
                    break;
            }
        }
    }
    
    // 处理封面页面手柄控制
    handleCoverPageGamepad(dpadLeft, dpadRight, dpadUp, dpadDown, aButtonPressed, gamepad, currentTime) {
        // 初始化封面按钮列表
        if (this.coverButtons.length === 0) {
            this.initCoverButtons();
        }
        
        // 获取左摇杆值
        const leftStickX = gamepad.axes[0] || 0;
        const leftStickY = gamepad.axes[1] || 0;
        
        // 检查导航输入
        let navigationDirection = 0;
        
        // 优先使用十字键
        if (dpadLeft || dpadUp) {
            navigationDirection = -1;
        } else if (dpadRight || dpadDown) {
            navigationDirection = 1;
        }
        // 如果没有十字键输入，则检查摇杆
        else if (Math.abs(leftStickX) > this.DEAD_ZONE || Math.abs(leftStickY) > this.DEAD_ZONE) {
            if (Math.abs(leftStickX) > Math.abs(leftStickY)) {
                // 水平方向
                navigationDirection = leftStickX < -this.DEAD_ZONE ? -1 : 1;
            } else {
                // 垂直方向
                navigationDirection = leftStickY < -this.DEAD_ZONE ? -1 : 1;
            }
        }
        
        // 处理导航
        if (navigationDirection !== 0) {
            this.navigateCoverButtons(navigationDirection);
            this.lastButtonPressTime = currentTime;
        }
        
        // A键（确认键）按下
        if (aButtonPressed) {
            this.activateCoverButton();
            this.lastButtonPressTime = currentTime;
        }
    }
    
    // 导航封面按钮
    navigateCoverButtons(direction) {
        if (this.coverButtons.length === 0) return;
        
        // 计算新索引
        let newIndex = this.currentCoverButtonIndex + direction;
        if (newIndex < 0) {
            newIndex = this.coverButtons.length - 1;
        } else if (newIndex >= this.coverButtons.length) {
            newIndex = 0;
        }
        
        // 设置新焦点
        this.setCoverButtonFocus(newIndex);
    }
    
    // 处理游戏页面手柄控制
    handleGameplayGamepad(dpadLeft, dpadRight, dpadUp, dpadDown, aButtonPressed, bButtonPressed, xButtonPressed, gamepad, currentTime) {
        // 获取左摇杆值
        const leftStickX = gamepad.axes[0] || 0;
        const leftStickY = gamepad.axes[1] || 0;
        
        // 处理方向输入 - 即使游戏结束也允许移动（但不会实际改变状态）
        let moved = false;
        
        // 优先使用十字键
        if (dpadUp) {
            this.moveUp();
            moved = true;
        } else if (dpadDown) {
            this.moveDown();
            moved = true;
        } else if (dpadLeft) {
            this.moveLeft();
            moved = true;
        } else if (dpadRight) {
            this.moveRight();
            moved = true;
        }
        // 如果没有十字键输入，则检查摇杆
        else if (Math.abs(leftStickX) > this.DEAD_ZONE || Math.abs(leftStickY) > this.DEAD_ZONE) {
            // 确定主导方向
            if (Math.abs(leftStickX) > Math.abs(leftStickY)) {
                // 水平方向
                if (leftStickX < -this.DEAD_ZONE) {
                    this.moveLeft();
                    moved = true;
                } else if (leftStickX > this.DEAD_ZONE) {
                    this.moveRight();
                    moved = true;
                }
            } else {
                // 垂直方向
                if (leftStickY < -this.DEAD_ZONE) {
                    this.moveUp();
                    moved = true;
                } else if (leftStickY > this.DEAD_ZONE) {
                    this.moveDown();
                    moved = true;
                }
            }
        }
        
        // 处理功能键
        if (bButtonPressed) {
            // B键用于撤销
            this.undo();
            moved = true;
        } else if (xButtonPressed) {
            // X键用于新游戏
            this.init();
            moved = true;
        }
        
        // 检查游戏是否结束
        if (this.isGameOver()) {
            // 游戏结束后，确保焦点在重新开始按钮上
            this.setGameOverButtonFocus();
        }
        
        if (moved) {
            this.lastButtonPressTime = currentTime;
        }
    }
    
    // 设置游戏结束按钮焦点
    setGameOverButtonFocus() {
        const restartBtn = document.getElementById('restart');
        if (restartBtn) {
            // 添加可聚焦属性
            restartBtn.setAttribute('tabindex', '0');
            restartBtn.classList.add('button-focused');
            restartBtn.focus();
        }
    }
    
    // 处理成功页面手柄控制
    handleSuccessPageGamepad(aButtonPressed, gamepad, currentTime) {
        // A键（确认键）按下
        if (aButtonPressed) {
            const restartBtn = document.getElementById('restart-success');
            if (restartBtn) {
                restartBtn.click();
            }
            this.lastButtonPressTime = currentTime;
        }
    }
    
    // 处理游戏失败页面手柄控制
    handleGameOverPageGamepad(dpadLeft, dpadRight, dpadUp, dpadDown, aButtonPressed, gamepad, currentTime) {
        // 获取重新开始按钮
        const restartBtn = document.getElementById('restart');
        if (restartBtn) {
            // 为按钮添加可聚焦属性
            restartBtn.setAttribute('tabindex', '0');
            
            // 确保按钮获得焦点
            if (document.activeElement !== restartBtn) {
                restartBtn.classList.add('button-focused');
                restartBtn.focus();
            }
            
            // A键（确认键）按下
            if (aButtonPressed) {
                // 添加点击效果
                restartBtn.style.transform = 'scale(0.95)';
                
                // 触发点击事件
                setTimeout(() => {
                    restartBtn.click();
                    restartBtn.style.transform = '';
                }, 100);
                
                this.lastButtonPressTime = currentTime;
            }
        }
    }
    
    // 激活封面按钮
    activateCoverButton() {
        if (this.coverButtons.length > 0) {
            const button = this.coverButtons[this.currentCoverButtonIndex];
            
            // 添加点击效果
            button.style.transform = 'scale(0.95)';
            
            // 触发点击事件
            setTimeout(() => {
                button.click();
                button.style.transform = '';
            }, 100);
        }
    }
    
    addRandomTile() {
        const emptyCells = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.board[i][j] === 0) {
                    emptyCells.push({x: i, y: j});
                }
            }
        }
        
        if (emptyCells.length > 0) {
            const {x, y} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.board[x][y] = Math.random() < 0.9 ? 2 : 4;
        }
    }
    
    moveLeft() {
        // 游戏结束后仍然允许方向输入，但不会改变状态
        if (this.isGameOver()) {
            // 可以添加一些视觉反馈，但不改变游戏状态
            return;
        }
        
        this.saveState();
        this.previousBoard = this.board.map(row => [...row]);
        
        let moved = false;
        
        for (let i = 0; i < this.size; i++) {
            const { merged } = this.moveLine(this.board[i], 'left');
            
            if (!this.arraysEqual(this.board[i], merged)) {
                moved = true;
            }
            
            this.board[i] = merged;
        }
        
        if (moved) {
            this.addRandomTile();
            this.updateDisplay();
            this.checkGameOver();
        }
    }
    
    moveRight() {
        // 游戏结束后仍然允许方向输入，但不会改变状态
        if (this.isGameOver()) {
            return;
        }
        
        this.saveState();
        this.previousBoard = this.board.map(row => [...row]);
        
        let moved = false;
        
        for (let i = 0; i < this.size; i++) {
            const { merged } = this.moveLine(this.board[i], 'right');
            
            if (!this.arraysEqual(this.board[i], merged)) {
                moved = true;
            }
            
            this.board[i] = merged;
        }
        
        if (moved) {
            this.addRandomTile();
            this.updateDisplay();
            this.checkGameOver();
        }
    }
    
    moveUp() {
        // 游戏结束后仍然允许方向输入，但不会改变状态
        if (this.isGameOver()) {
            return;
        }
        
        this.saveState();
        this.previousBoard = this.board.map(row => [...row]);
        
        // 转置矩阵，将列转换为行
        const transposed = this.rotateMatrix(this.board, 'transpose');
        let moved = false;
        
        for (let i = 0; i < this.size; i++) {
            const { merged } = this.moveLine(transposed[i], 'left');
            
            if (!this.arraysEqual(transposed[i], merged)) {
                moved = true;
            }
            
            transposed[i] = merged;
        }
        
        // 转回原始矩阵
        this.board = this.rotateMatrix(transposed, 'transpose');
        
        if (moved) {
            this.addRandomTile();
            this.updateDisplay();
            this.checkGameOver();
        }
    }
    
    moveDown() {
        // 游戏结束后仍然允许方向输入，但不会改变状态
        if (this.isGameOver()) {
            return;
        }
        
        this.saveState();
        this.previousBoard = this.board.map(row => [...row]);
        
        // 转置矩阵，将列转换为行
        const transposed = this.rotateMatrix(this.board, 'transpose');
        let moved = false;
        
        for (let i = 0; i < this.size; i++) {
            const { merged } = this.moveLine(transposed[i], 'right');
            
            if (!this.arraysEqual(transposed[i], merged)) {
                moved = true;
            }
            
            transposed[i] = merged;
        }
        
        // 转回原始矩阵
        this.board = this.rotateMatrix(transposed, 'transpose');
        
        if (moved) {
            this.addRandomTile();
            this.updateDisplay();
            this.checkGameOver();
        }
    }
    
    saveState() {
        this.history.push({
            board: this.board.map(row => [...row]),
            score: this.score
        });
        
        if (this.history.length > 5) {
            this.history.shift();
        }
    }
    
    undo() {
        if (this.history.length > 0) {
            const prevState = this.history.pop();
            this.board = prevState.board;
            this.score = prevState.score;
            this.updateDisplay();
        }
    }
    
    arraysEqual(a, b) {
        return a.length === b.length && a.every((val, index) => val === b[index]);
    }
    
    // 存储上一个棋盘状态用于比较
    previousBoard = [];
    
    // 辅助方法：处理单行的移动和合并
    moveLine(line, direction = 'left') {
        // 移除零值
        const filtered = line.filter(val => val !== 0);
        let merged = [];
        
        // 根据方向决定处理顺序
        if (direction === 'left' || direction === 'up') {
            // 从左到右/上到下处理，优先合成左边/上边的元素
            let i = 0;
            while (i < filtered.length) {
                if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
                    // 合并相同值
                    const newValue = filtered[i] * 2;
                    merged.push(newValue);
                    this.score += newValue;
                    i += 2;
                } else {
                    // 不合并，直接添加
                    merged.push(filtered[i]);
                    i += 1;
                }
            }
        } else {
            // 从右到左/下到上处理，优先合成右边/下边的元素
            let i = filtered.length - 1;
            const tempMerged = [];
            
            while (i >= 0) {
                if (i > 0 && filtered[i] === filtered[i - 1]) {
                    // 合并相同值
                    const newValue = filtered[i] * 2;
                    tempMerged.unshift(newValue);
                    this.score += newValue;
                    i -= 2;
                } else {
                    // 不合并，直接添加
                    tempMerged.unshift(filtered[i]);
                    i -= 1;
                }
            }
            merged = tempMerged;
        }
        
        // 填充零值
        while (merged.length < this.size) {
            if (direction === 'left' || direction === 'up') {
                merged.push(0);
            } else {
                merged.unshift(0);
            }
        }
        
        return { merged };
    }
    
    // 旋转矩阵，用于处理不同方向的移动
    rotateMatrix(matrix, direction) {
        const size = matrix.length;
        const rotated = Array(size).fill().map(() => Array(size).fill(0));
        
        if (direction === 'transpose') {
            // 转置矩阵
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    rotated[i][j] = matrix[j][i];
                }
            }
        } else if (direction === 'flipHorizontal') {
            // 水平翻转
            for (let i = 0; i < size; i++) {
                rotated[i] = matrix[i].slice().reverse();
            }
        } else if (direction === 'flipVertical') {
            // 垂直翻转
            for (let i = 0; i < size; i++) {
                rotated[i] = matrix[size - 1 - i];
            }
        }
        
        return rotated;
    }
    
    updateDisplay() {
        const tileContainer = document.getElementById('tile-container');
        tileContainer.innerHTML = '';
        
        document.getElementById('score').textContent = this.score;
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('spring2048-best', this.bestScore);
        }
        
        document.getElementById('best').textContent = this.bestScore;
        
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const value = this.board[i][j];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = `tile tile-${value}`;
                    tile.style.left = `${j * (100 / this.size)}%`;
                    tile.style.top = `${i * (100 / this.size)}%`;
                    
                    // 合并动画效果（暂时移除，后续可以根据需要添加）
                    
                    const img = document.createElement('img');
                    img.src = this.tileImages[value] || this.tileImages[Math.max(...Object.keys(this.tileImages).map(Number))];
                    img.style.width = '90%';
                    img.style.height = '90%';
                    img.style.objectFit = 'contain';
                    
                    tile.appendChild(img);
                    tileContainer.appendChild(tile);
                }
            }
        }
        
        // 检查是否达到最高等级（年夜饭）
        this.checkWin();
    }
    
    // 隐藏游戏封面
    hideCover() {
        this.gameCover.style.opacity = '0';
        setTimeout(() => {
            this.gameCover.style.display = 'none';
            this.currentPage = 'game';
            this.init(); // 初始化游戏
        }, 500);
    }
    
    // 显示成功通关屏幕
    showSuccessScreen() {
        this.successScreen.style.display = 'flex';
        this.currentPage = 'success';
    }
    
    // 隐藏成功通关屏幕
    hideSuccessScreen() {
        this.successScreen.style.display = 'none';
        this.currentPage = 'game';
    }
    
    // 检查是否获得年夜饭
    checkWin() {
        const highestValue = 256; // 年夜饭的值
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.board[i][j] === highestValue) {
                    // 延迟显示成功屏幕，让玩家看到年夜饭
                    setTimeout(() => {
                        this.showSuccessScreen();
                    }, 1000);
                    return;
                }
            }
        }
    }
    
    isGameOver() {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.board[i][j] === 0) {
                    return false;
                }
                
                if (i < this.size - 1 && this.board[i][j] === this.board[i + 1][j]) {
                    return false;
                }
                
                if (j < this.size - 1 && this.board[i][j] === this.board[i][j + 1]) {
                    return false;
                }
            }
        }
        return true;
    }
    
    checkGameOver() {
        if (this.isGameOver()) {
            document.getElementById('final-score').textContent = this.score;
            document.getElementById('game-over').style.display = 'flex';
            
            // 设置当前页面为游戏结束页面
            this.currentPage = 'game-over';
            
            // 设置游戏结束页面焦点
            this.setGameOverButtonFocus();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new Spring2048();
    
    document.getElementById('restart').addEventListener('click', () => {
        document.getElementById('game-over').style.display = 'none';
        
        // 移除按钮的聚焦样式
        const restartBtn = document.getElementById('restart');
        if (restartBtn) {
            restartBtn.classList.remove('button-focused');
        }
        
        // 设置当前页面为游戏页面
        game.currentPage = 'game';
        
        // 初始化新游戏
        game.init();
    });
});