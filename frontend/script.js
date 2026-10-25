class PathfinderGame {
    constructor() {
        this.rows = 20;
        this.cols = 30;
        this.grid = [];
        this.start = null;
        this.end = null;
        this.obstacles = new Set();
        this.currentMode = 'start';
        this.isMouseDown = false;
        this.currentPath = [];
        
        this.initializeGrid();
        this.setupEventListeners();
        this.updateStatus("Click on the grid to set start and end points!");
    }

    initializeGrid() {
        const gridElement = document.getElementById('grid');
        gridElement.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        gridElement.innerHTML = '';

        this.grid = [];
        for (let i = 0; i < this.rows; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.cols; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell empty';
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                cell.addEventListener('click', (e) => this.handleCellClick(e));
                cell.addEventListener('mousedown', (e) => this.handleMouseDown(e));
                cell.addEventListener('mouseenter', (e) => this.handleMouseEnter(e));
                cell.addEventListener('mouseup', () => this.handleMouseUp());
                
                gridElement.appendChild(cell);
                this.grid[i][j] = cell;
            }
        }
    }

    setupEventListeners() {
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setMode(e.target.dataset.mode));
        });

        document.getElementById('findPath').addEventListener('click', () => this.findPath());
        document.getElementById('clearPath').addEventListener('click', () => this.clearPath());
        document.getElementById('generateMaze').addEventListener('click', () => this.generateRandomMaze());

        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('mouseup', () => this.handleMouseUp());
    }

    setMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        const modeMessages = {
            start: "Click to set the start point 📍",
            end: "Click to set the end point 🎯",
            obstacle: "Click and drag to add obstacles 🧱",
            erase: "Click and drag to erase cells 🧽"
        };
        this.updateStatus(modeMessages[mode]);
    }

    handleMouseDown(e) {
        this.isMouseDown = true;
        this.handleCellAction(e);
    }

    handleMouseUp() {
        this.isMouseDown = false;
    }

    handleMouseEnter(e) {
        if (this.isMouseDown && (this.currentMode === 'obstacle' || this.currentMode === 'erase')) {
            this.handleCellAction(e);
        }
    }

    handleCellClick(e) {
        if (!this.isMouseDown) {
            this.handleCellAction(e);
        }
    }

    handleCellAction(e) {
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        const cell = this.grid[row][col];

        this.clearPath(); 

        switch (this.currentMode) {
            case 'start':
                this.setStart(row, col);
                break;
            case 'end':
                this.setEnd(row, col);
                break;
            case 'obstacle':
                this.addObstacle(row, col);
                break;
            case 'erase':
                this.eraseCell(row, col);
                break;
        }
    }

    setStart(row, col) {
        if (this.start) {
            const [oldRow, oldCol] = this.start;
            this.grid[oldRow][oldCol].className = 'cell empty';
        }
        
        this.obstacles.delete(`${row},${col}`);
        
        this.start = [row, col];
        this.grid[row][col].className = 'cell start';
        this.updateStatus("Start point set! Now set the end point 🎯");
    }

    setEnd(row, col) {
        if (this.end) {
            const [oldRow, oldCol] = this.end;
            this.grid[oldRow][oldCol].className = 'cell empty';
        }
        
       
        this.obstacles.delete(`${row},${col}`);
        
        this.end = [row, col];
        this.grid[row][col].className = 'cell end';
        this.updateStatus("End point set! Add obstacles or find the path 🚀");
    }

    addObstacle(row, col) {
        if ((this.start && this.start[0] === row && this.start[1] === col) ||
            (this.end && this.end[0] === row && this.end[1] === col)) {
            return;
        }
        
        this.obstacles.add(`${row},${col}`);
        this.grid[row][col].className = 'cell obstacle';
    }

    eraseCell(row, col) {
        if ((this.start && this.start[0] === row && this.start[1] === col) ||
            (this.end && this.end[0] === row && this.end[1] === col)) {
            return;
        }
        
        this.obstacles.delete(`${row},${col}`);
        this.grid[row][col].className = 'cell empty';
    }

    clearPath() {
        this.currentPath.forEach(([row, col]) => {
            if (this.grid[row][col].classList.contains('path')) {
                this.grid[row][col].className = 'cell empty';
            }
        });
        this.currentPath = [];
    }

    generateRandomMaze() {
        this.clearPath();
        this.obstacles.clear();
        
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                if ((!this.start || (this.start[0] !== i || this.start[1] !== j)) &&
                    (!this.end || (this.end[0] !== i || this.end[1] !== j))) {
                    this.grid[i][j].className = 'cell empty';
                }
            }
        }
        
        
        const obstacleCount = Math.floor(this.rows * this.cols * 0.3);
        for (let i = 0; i < obstacleCount; i++) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            
            if ((!this.start || (this.start[0] !== row || this.start[1] !== col)) &&
                (!this.end || (this.end[0] !== row || this.end[1] !== col))) {
                this.addObstacle(row, col);
            }
        }
        
        this.updateStatus("Random maze generated! 🌟");
    }

    async findPath() {
        if (!this.start || !this.end) {
            this.updateStatus("❌ Please set both start and end points first!");
            return;
        }

        this.clearPath();
        this.updateStatus('<div class="loading"></div>Finding optimal path...');
        
        const findBtn = document.getElementById('findPath');
        findBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:5000/api/pathfind', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    start: this.start,
                    end: this.end,
                    obstacles: Array.from(this.obstacles).map(obs => obs.split(',').map(Number)),
                    rows: this.rows,
                    cols: this.cols
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.path && data.path.length > 0) {
                this.animatePath(data.path);
                this.updateStatus(`✅ Path found! Distance: ${data.path.length} steps`);
            } else {
                this.updateStatus("❌ No path found! Try removing some obstacles.");
            }
        } catch (error) {
            console.error('Error:', error);
            this.updateStatus("❌ Error connecting to server. Make sure the backend is running on http://localhost:5000");
        }

        findBtn.disabled = false;
    }

    animatePath(path) {
        this.currentPath = path;
        path.forEach(([row, col], index) => {
            setTimeout(() => {
                if (this.grid[row][col].classList.contains('empty')) {
                    this.grid[row][col].className = 'cell path';
                }
            }, index * 50);
        });
    }

    updateStatus(message) {
        document.getElementById('status').innerHTML = message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PathfinderGame();
});