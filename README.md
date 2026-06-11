# Infinity Fight - Three.js

Một trò chơi bắn súng sinh tồn góc nhìn thứ nhất (FPS) 3D chạy trực tiếp trên trình duyệt, được xây dựng bằng **Three.js** kết hợp với địa hình và thực vật được tạo ngẫu nhiên vô hạn (Procedural Generation).

---

## 🎮 Tính Năng Nổi Bật

- **Bản Đồ Vô Hạn (Infinite Procedural World):** Địa hình được sinh ngẫu nhiên liên tục bằng thuật toán **Simplex Noise**. Bản đồ tự động tải các phân vùng địa hình (Chunks) mới phía trước và dọn dẹp phân vùng cũ phía sau lưng người chơi để tối ưu hiệu năng.
- **Thực Vật Tự Nhiên Tối Ưu (Optimized Vegetation):** Đá và cỏ được rải ngẫu nhiên trên bề mặt đất dựa trên độ cao và độ dốc. Toàn bộ cây cỏ được render bằng kỹ thuật **`THREE.InstancedMesh`** giúp tối ưu hóa số lượng draw calls cực kỳ hiệu quả.
- **Cơ Chế FPS Camera Chân Thực:**
  - Nhấp nhô camera khi di chuyển (**Headbob**).
  - Nghiêng góc nhìn khi đi ngang (**Lean**).
  - Độ giật súng cơ học (**Recoil**) khi bắn.
  - Tia lửa chớp đầu nòng (**Muzzle Flash**) sinh động.
- **Kẻ Địch Thông Minh (AI Enemies):** Kẻ địch tự động bám theo hướng người chơi, đổi màu sắc và chớp sáng (Hit Flash) khi trúng đạn.
- **Hệ Thống Auto-Aim Trợ Lực:** Hỗ trợ ngắm bắn mục tiêu ở cự ly gần giúp trải nghiệm mượt mà hơn trên trình duyệt.
- **Giao Diện Đồ Họa Đẹp Mắt:** Sử dụng hiệu ứng sương mù khí quyển (`FogExp2`), ánh sáng bóng đổ mềm (`PCFSoftShadowMap`), và tone màu điện ảnh (`ACESFilmicToneMapping`). Giao diện HUD hiện đại với thanh máu đổi màu, hiệu ứng viền đỏ khi bị sát thương (Damage Vignette), scoreboard và thông báo hạ gục (Kill Feed).

---

## 🛠️ Cấu Trúc Dự Án

```text
3d/
├── src/
│   ├── core/
│   │   ├── InputHandler.js       # Xử lý Pointer Lock, phím nhấn và di chuyển chuột
│   │   ├── PlayerController.js   # Điều khiển người chơi, súng, recoil, headbob & nhảy vật lý
│   │   └── SceneManager.js       # Quản lý Scene, Camera, Ánh sáng và Renderer
│   ├── entities/
│   │   └── Enemy.js              # Định nghĩa Kẻ địch (HP, di chuyển bám đuổi, hiệu ứng trúng đạn)
│   └── world/
│       ├── TerrainGenerator.js   # Tạo địa hình 3D bằng Simplex Noise và dốc đá tự nhiên
│       ├── VegetationGenerator.js# Sinh cỏ và đá ngẫu nhiên bằng InstancedMesh
│       └── WorldChunk.js         # Quản lý vòng đời và dọn dẹp bộ nhớ của từng Chunk
├── index.html                    # Giao diện HUD, CSS và điểm đầu vào ứng dụng
├── main.js                       # Điểm kích hoạt game và vòng lặp chính (Game Loop)
├── package.json                  # Các gói phụ thuộc (Three, Simplex-Noise, Alea, Vite)
└── .gitignore                    # Các file/thư mục bỏ qua khi đẩy lên git
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

Dự án sử dụng công cụ build nhanh **Vite**. Làm theo các bước dưới đây để chạy thử trên máy của bạn:

### 1. Yêu cầu hệ thống
- Máy tính đã cài đặt [Node.js](https://nodejs.org/) (khuyên dùng phiên bản LTS mới nhất).

### 2. Cài đặt các gói phụ thuộc
Mở terminal tại thư mục dự án và chạy lệnh sau:
```bash
npm install
```

### 3. Khởi chạy máy chủ phát triển (Development Server)
Chạy lệnh bên dưới để khởi động server cục bộ:
```bash
npm run dev
```
Sau đó, nhấn vào liên kết `http://localhost:5173` (hoặc cổng được hiển thị trong terminal) để trải nghiệm trò chơi!

### 4. Đóng gói sản phẩm (Build Production)
Nếu muốn xuất bản trò chơi thành sản phẩm hoàn chỉnh để đưa lên web hosting:
```bash
npm run build
```
Thư mục sản phẩm đầu ra sẽ nằm trong thư mục `dist/`.

---

## 🕹️ Cách Chơi

- **`W` / `A` / `S` / `D`**: Di chuyển nhân vật.
- **`Space` (Phím Cách)**: Nhảy.
- **`Di Chuột`**: Quay camera (Góc nhìn thứ nhất).
- **`Click Chuột Trái`**: Bắn súng.
- **Mục tiêu**: Sống sót lâu nhất có thể! Tránh va chạm với khối hộp đỏ (kẻ địch). Bạn sẽ bị loại (Game Over) sau tối đa 5 lần chạm trúng kẻ địch (HP giảm về 0).
