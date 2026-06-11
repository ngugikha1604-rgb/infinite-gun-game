import * as THREE from 'three';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        // Màu bầu trời: xanh xám nhẹ, giống buổi chiều
        this.scene.background = new THREE.Color(0x6a8aad);
        // Sương mù đồng màu bầu trời tạo cảm giác khoảng cách
        this.scene.fog = new THREE.FogExp2(0x7a9ab8, 0.018);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 0);
        
        // Thay đổi phần khởi tạo renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Chống răng cưa nét hơn

        // Bật bóng đổ mềm và tone màu điện ảnh
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        document.body.appendChild(this.renderer.domElement);
        
        this.setupLights();
        this.setupCrosshair();
    }
    
    setupLights() {
        // HemisphereLight: bầu trời xanh xám trên + phản xạ đất ấm dưới
        const hemiLight = new THREE.HemisphereLight(
            0x8ab4d4,   // sky color – xanh lam nhạt
            0x6a5a38,   // ground color – nâu ấm
            0.9
        );
        this.scene.add(hemiLight);

        // Mặt trời (DirectionalLight mạnh, đổ bóng)
        const sunLight = new THREE.DirectionalLight(0xffe8c0, 1.6);
        sunLight.position.set(30, 50, 20);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width  = 1024;
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far  = 80;
        sunLight.shadow.camera.left   = -30;
        sunLight.shadow.camera.right  =  30;
        sunLight.shadow.camera.top    =  30;
        sunLight.shadow.camera.bottom = -30;
        sunLight.shadow.bias = -0.001;
        this.scene.add(sunLight);

        // Fill light – ánh sáng ngược lạnh từ bầu trời (rim)
        const fillLight = new THREE.DirectionalLight(0x4488cc, 0.35);
        fillLight.position.set(-20, 10, -15);
        this.scene.add(fillLight);
    }
    
    setupCrosshair() {
        // Crosshair được dựng trong HTML/CSS (id="crosshair") — không cần tạo qua JS nữa
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}