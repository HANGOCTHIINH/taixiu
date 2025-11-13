````markdown
# Taixiu - Static version (GitHub Pages / Local)

Đây là phiên bản tĩnh (client-only) của trò Tài Xỉu, có thể chạy trực tiếp trên GitHub Pages hoặc local thông qua một static server như `http-server`.

Những gì có trong repo:
- index.html — trang chính, responsive, hỗ trợ a11y cơ bản.
- assets/styles.css — CSS tách riêng, responsive.
- assets/app.js — logic trò chơi (tất cả thực thi trên client).
- README.md — hướng dẫn.

Chạy local:
1. Clone repo:
   git clone https://github.com/HANGOCTHIINH/taixiu.git
2. Vào thư mục:
   cd taixiu
3. Serve local (ví dụ dùng http-server):
   npx http-server -c-1
4. Mở trình duyệt truy cập http://localhost:8080 (hoặc port hiển thị)

Triển khai lên GitHub Pages:
1. Đẩy mã lên nhánh `main` (hoặc `gh-pages`).
2. Vào Settings > Pages trong repo GitHub, chọn nhánh `main` và thư mục `/` làm source, lưu.
3. Đợi GitHub Pages build và truy cập URL được cung cấp.

Hạn chế quan trọng:
- Đây là ứng dụng chạy hoàn toàn trên client. RNG và quyết toán kết quả đều diễn ra ở trình duyệt — do đó KHÔNG an toàn cho tiền thật. Người chơi có thể sửa code, thay RNG để gian lận.
- Để dùng thực tế (với tiền thật hoặc nhiều người chơi), cần triển khai backend authoritative:
  - Server tạo session, nhận cược, đóng cửa khi hết thời gian.
  - Server tạo RNG an toàn (crypto.randomInt / HSM), phát kết qu��� cho client qua websocket.
  - Lưu lịch sử trên DB, authentication, rate-limit, logging.

Gợi ý nâng cấp (nếu muốn tiếp tục phát triển):
- Thêm backend Node/Express + Socket.io để server làm nguồn duy nhất của kết quả.
- Tích hợp xác thực tài khoản (OAuth / custom), hệ thống giao dịch (wallet).
- Kiểm tra bảo mật, audit, unit tests và e2e tests.
- Thêm CSS/JS build pipeline (Webpack/Rollup), minify, CI/CD.

Nếu bạn muốn, tôi có thể:
- Tạo branch với các tệp này và mở PR cho repo hiện tại.
- Hoàn thiện server demo Node.js (Express + Socket.io) để chuyển app sang mô hình server-driven.
````