export class InputHandler {
    constructor(domElement) {
        this.domElement = domElement;
        this.keyState = { KeyW: false, KeyS: false, KeyA: false, KeyD: false, Space: false };
        this.mouseLocked = false;
        this.yaw = -Math.PI / 4;
        this.pitch = 0;
        this.mouseSensitivity = 0.002;

        // Chỉ lock chuột khi flag này = true (tức game đang chạy)
        this.lockEnabled = false;
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        window.addEventListener('keydown', (e) => {
            const code = e.code;
            if (code === 'Space' || code === 'KeyW' || code === 'KeyS' || code === 'KeyA' || code === 'KeyD') {
                e.preventDefault();
            }
            if (code === 'Space') {
                this.keyState.Space = true;
            } else if (this.keyState.hasOwnProperty(code)) {
                this.keyState[code] = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            const code = e.code;
            if (code === 'Space') {
                this.keyState.Space = false;
            } else if (this.keyState.hasOwnProperty(code)) {
                this.keyState[code] = false;
            }
        });

        // Chỉ request pointer lock khi lockEnabled = true
        this.domElement.addEventListener('click', () => {
            if (this.lockEnabled) {
                this.domElement.requestPointerLock();
            }
        });
        document.addEventListener('pointerlockchange', () => this.lockChange());
        document.addEventListener('mozpointerlockchange', () => this.lockChange());
        
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }
    
    lockChange() {
        if (document.pointerLockElement === this.domElement) {
            this.mouseLocked = true;
        } else {
            this.mouseLocked = false;
        }
    }

    /** Bật chế độ lock chuột (gọi khi game bắt đầu) */
    enableLock() {
        this.lockEnabled = true;
        this.domElement.requestPointerLock();
    }

    /** Tắt + giải phóng pointer lock (gọi khi game over / menu) */
    disableLock() {
        this.lockEnabled = false;
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
    
    onMouseMove(e) {
        if (!this.mouseLocked) return;
        this.yaw   -= e.movementX * this.mouseSensitivity;
        this.pitch -= e.movementY * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
    }
    
    isKeyPressed(key) {
        return this.keyState[key];
    }
    
    getRotation() {
        return { yaw: this.yaw, pitch: this.pitch };
    }
}