# QL Học Phần — Quản lý giảng viên

Bài giữa kỳ Lập trình đa nền tảng: React Native + Expo SDK 58, chạy web/Android/iOS; Express API và MongoDB 8. Đối chiếu đầy đủ đề trong [báo cáo](docs/BAO_CAO.md).

## Chạy nhanh

Yêu cầu Node.js 22.13+ (đã kiểm thử Node 24), npm, Docker đang chạy.

```bash
npm ci
npm ci --prefix server
npm ci --prefix mobile
npm run setup
docker compose up -d
npm run seed
npm run dev
```

Mở http://localhost:8081. API http://localhost:4000/api/health.
Tài khoản demo: **admin / Admin@123456**. Đổi bằng `ADMIN_PASSWORD='mật-khẩu-của-bạn' npm run setup` trước lần tạo `.env` đầu tiên. Script không ghi đè cấu hình có sẵn. Mật khẩu lưu dạng bcrypt; JWT secret tạo ngẫu nhiên và không đưa lên Git.

## Chạy điện thoại

Cài Expo Go tương thích SDK 58; điện thoại cùng mạng Wi-Fi với máy chạy API. Chạy `cd mobile && npx expo start --lan`, quét QR. Ứng dụng tự lấy IP máy Metro làm địa chỉ API (cổng 4000). Nếu cần, tạo `mobile/.env` từ `.env.example` và đặt `EXPO_PUBLIC_API_URL=http://IP_MAY_TINH:4000/api`, sau đó khởi động lại Metro. Điện thoại không dùng `localhost` của máy tính. Cho phép cổng 4000 và cổng Metro trên mạng LAN.

Android emulator: `adb reverse tcp:4000 tcp:4000`, rồi `cd mobile && npx expo start --android`. Với trình giả lập dùng `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api` nếu địa chỉ LAN không truy cập được. Chọn ảnh bằng thư viện hoặc chụp camera; ảnh tối đa 2 MB. iOS cần máy Mac để build native; Expo Go dùng để mở dự án trên iPhone.

## Dữ liệu và kiểm thử

- `database/GiangVien.json`: sáu mẫu hoàn chỉnh kèm ảnh base64, dùng để import.
- `npm run export`: xuất dữ liệu hiện tại sang `database/GiangVien-export.json`.
- Database `QLHocPhan`, collection `GiangVien`; đúng `IDGV`, `Fullname`, `Image`, `SumClass`. MongoDB tự sinh `_id`; API và file nộp JSON bỏ trường này.
- `npm run seed` chỉ thêm mã chưa có, không ghi đè dữ liệu đang sử dụng.
- MongoDB lưu bền vững trong volume `ltdnt_mongo_data`.

```bash
npm run typecheck
npm run lint
npm --prefix server test
npx playwright install chromium
# Để npm run dev chạy ở terminal khác trước khi kiểm thử giao diện:
npx playwright test
npm run web:build
cd mobile && npx expo-doctor
```

API test tạo database riêng `QLHocPhan_test_<timestamp>` rồi dọn sau khi chạy. E2E sử dụng mã `GVTEST`, nên dùng dữ liệu demo, không dùng mã này cho hồ sơ thật.

## Cấu trúc

- `mobile/src/app/index.tsx`: giao diện React Native, form, danh sách, tìm kiếm, thống kê, ảnh.
- `mobile/src/lib/api.ts`: kết nối API và lưu phiên (SecureStore native, sessionStorage web).
- `server/src/app.js`: xác thực và REST CRUD, validation, giới hạn đăng nhập.
- `server/src/db.js`: schema validator và unique index MongoDB.
- `docs/`: báo cáo, ảnh chụp, video và kịch bản trình bày.

HTTP dùng cho demo cục bộ. Khi triển khai Internet cần HTTPS, CORS đúng tên miền, MongoDB có xác thực và thay tài khoản demo. Ứng dụng phục vụ quy mô bài tập; danh sách được tải về để tìm kiếm không dấu và phân trang trên thiết bị.
