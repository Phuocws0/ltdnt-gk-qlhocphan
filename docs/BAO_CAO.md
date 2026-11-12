# BÁO CÁO GIỮA KỲ - LẬP TRÌNH ĐA NỀN TẢNG

## 1. Mục tiêu và đối chiếu đề

Ứng dụng quản trị giảng viên của cơ sở dữ liệu QLHocPhan. Công nghệ: React Native 0.88, Expo SDK 58, React 19, TypeScript, Express và MongoDB 8.

| Yêu cầu | Điểm theo đề | Thực hiện |
| --- | --- | --- |
| 1. MongoDB; thêm và hiển thị IDGV, Fullname, Image, SumClass trên web | 8.0 | API POST/GET, form thêm có ảnh, danh sách, dữ liệu lưu MongoDB |
| 2. Đăng nhập, xóa, sửa và chức năng nâng cao | 1.5 | JWT, PUT/DELETE, xác nhận xóa, tìm không dấu, sắp xếp, phân trang, thống kê, validation |
| 3. Nhập ảnh và hiển thị trên di động | 0.5 | Expo ImagePicker, thư viện/camera, preview, lưu ảnh và hiển thị trong danh sách/chi tiết |

Không tự bổ sung trường nghiệp vụ. Collection chỉ chứa IDGV, Fullname, Image, SumClass; _id là khóa kỹ thuật MongoDB tự tạo. Không thêm createdAt, updatedAt hay tài khoản vào collection này. Thông tin quản trị lưu trong cấu hình server với mật khẩu bcrypt, không nằm trong dữ liệu giảng viên.

## 2. Kiến trúc và dữ liệu

Ứng dụng Expo (web/Android/iOS) gọi REST API Express qua HTTP trong môi trường demo. API xác thực Bearer JWT, kiểm tra đầu vào rồi truy cập MongoDB. Client không có mật khẩu database. MongoDB chạy bằng Docker, dữ liệu được giữ trong volume khi container khởi động lại.

IDGV là chuỗi 2-20 ký tự chữ/số/_/-, được chuẩn hóa viết hoa, unique index. Fullname là chuỗi 2-100 ký tự đã trim. SumClass là số nguyên 0-999. Image là data URI PNG/JPEG/WebP, tối đa 2 MB; server kiểm tra chữ ký đầu tệp. Dữ liệu ảnh nằm trong JSON nên chuyển máy vẫn hiển thị được.

JSON Schema trên collection yêu cầu đủ các trường và cấm trường ngoài danh sách. Ràng buộc số nguyên và nội dung ảnh được kiểm tra thêm ở API. Xem database/validator.json và server/src/db.js. Tệp database/GiangVien.json chứa sáu hồ sơ mẫu, tổng 49 lớp. Tệp GiangVien-export.json là bản xuất hiện tại, không có _id.

## 3. Các bước thực hiện và lệnh thư viện

Khởi tạo bằng `npx create-expo-app@latest mobile --template blank-typescript`. Cài thư viện Expo theo đúng SDK bằng `npx expo install react-dom react-native-web expo-image-picker expo-secure-store @expo/vector-icons expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-font` trong mobile.

Server dùng express, mongodb, cors, helmet, express-rate-limit, jsonwebtoken, bcryptjs, dotenv và zod. Công cụ kiểm thử dùng node:test, Playwright; kiểm tra TypeScript và ESLint. Các package-lock.json đã khóa phiên bản; trên máy mới dùng npm ci theo README.

Bước 1: chạy `npm ci`, `npm ci --prefix server`, `npm ci --prefix mobile`.
Bước 2: `npm run setup` tạo server/.env với mật khẩu đã băm và JWT secret ngẫu nhiên.
Bước 3: `docker compose up -d` khởi động MongoDB; `npm run seed` tạo schema/index và nạp mẫu.
Bước 4: `npm run dev`, mở localhost:8081; đăng nhập admin / Admin@123456.
Bước 5: trên điện thoại mở Expo Go, cùng Wi-Fi; dùng địa chỉ LAN cho API như README.
Bước 6: chạy các kiểm thử, `npm run export` để lấy JSON nộp bài.

## 4. Chức năng và cách sử dụng

Đăng nhập: nhập tài khoản quản trị. Sai mật khẩu hiển thị lỗi; truy cập API thiếu JWT bị từ chối 401. Token hết hạn sau 8 giờ; native lưu bằng SecureStore, web giữ trong phiên trình duyệt. Đăng xuất xóa token cục bộ. API giới hạn 20 lần đăng nhập/15 phút mỗi IP.

Thêm: bấm Thêm giảng viên, nhập mã, họ tên, số lớp; chọn ảnh (hoặc chụp ảnh trên di động); xem preview và lưu. Mã trùng nhận lỗi 409. Các trường sai hiển thị thông báo và giữ lại nội dung để sửa. Không lưu khi thiếu ảnh hoặc số lớp âm/thập phân.

Hiển thị: danh sách gồm ảnh, tên, mã và số lớp. Bấm hồ sơ để mở chi tiết. Các thẻ tổng hợp cho biết số giảng viên, tổng lớp và trung bình lớp mỗi giảng viên. Nút Làm mới đồng bộ lại dữ liệu.

Sửa: chọn Sửa, cập nhật cả mã/tên/ảnh/số lớp, lưu bằng PUT. Xóa: chọn Xóa, xem tên và mã trong hộp xác nhận; Giữ lại hủy thao tác, Xác nhận xóa mới gọi DELETE. Có trạng thái đang lưu và khóa nút để tránh gửi trùng.

Nâng cao: tìm kiếm theo mã hoặc họ tên không phân biệt dấu; sắp xếp mã, tên, số lớp giảm dần; phân trang 6 hồ sơ/trang; trạng thái danh sách rỗng và lỗi kết nối. Các kết quả tìm kiếm và thống kê được tính trên dữ liệu tải từ MongoDB.

## 5. API

POST /api/auth/login: xác thực username/password, trả JWT.
GET /api/health: kiểm tra kết nối MongoDB.
GET /api/giang-vien: lấy dữ liệu; hỗ trợ q, sort, order.
POST /api/giang-vien: thêm hồ sơ, mã 201.
PUT /api/giang-vien/:id: sửa hồ sơ, mã 200.
DELETE /api/giang-vien/:id: xóa hồ sơ, mã 204.
Bốn endpoint giảng viên đều yêu cầu Authorization: Bearer token. Validation lỗi 400, thiếu quyền 401, không có hồ sơ 404, trùng mã 409. Server không trả stack trace cho client.

## 6. Kiểm thử và bằng chứng

API integration test dùng MongoDB thật và database riêng: xác thực, CRUD, kiểm tra persistence, mã trùng, trường thừa, ảnh giả, số âm/thập phân, mã rỗng và xóa bản ghi không tồn tại. Tất cả assertion đã đạt.

Playwright Chromium: đăng nhập sai/đúng; thêm hồ sơ và tải ảnh qua hộp chọn tệp; sửa số lớp; tải lại trang vẫn giữ dữ liệu; tìm không dấu; xem chi tiết; đổi viewport 390x844; hủy xóa rồi xác nhận xóa; đăng xuất. Đã đạt. Video tự động ghi lại luồng này tại docs/videos/demo-web.webm.

TypeScript và ESLint đã đạt. Expo Doctor đạt 20/20. Đã kiểm tra export cho web, Android và iOS. Kiểm thử Android native sử dụng Expo Go 58 trên trình giả lập API 35; đã đăng nhập, mở danh sách, chọn ảnh từ Android Photo Picker, cắt ảnh, lưu hồ sơ và xác minh Image trong MongoDB chuyển sang JPEG mới. Xem ảnh 06-08 và video demo-android.mp4. Chưa kiểm thử iOS hoặc điện thoại vật lý. Bundle Android không phải APK độc lập.

Ảnh 01-login.png: màn hình đăng nhập. 02-dashboard.png: danh sách từ MongoDB. 03-add.png: form nhập và preview ảnh. 04-detail.png: hồ sơ sau cập nhật. 05-mobile-web.png: giao diện web ở kích thước điện thoại (không thay thế minh chứng native).

![Đăng nhập](screenshots/01-login.png)
![Danh sách giảng viên](screenshots/02-dashboard.png)
![Form thêm ảnh](screenshots/03-add.png)
![Chi tiết](screenshots/04-detail.png)
![Web trên màn hình nhỏ](screenshots/05-mobile-web.png)

## 7. Nộp bài và trình bày

Nộp toàn bộ source qua GitHub, báo cáo PDF/Markdown, database/GiangVien-export.json và link video demo. Điền họ tên/MSSV/lớp theo thông tin sinh viên thực tế khi nộp. Repo riêng tư cần cấp quyền giảng viên hoặc đổi chế độ công khai trước khi gửi link.

Kịch bản 3-5 phút: giới thiệu schema và bốn trường; đăng nhập sai/đúng; thêm hồ sơ kèm ảnh; tìm và sửa số lớp; tải lại để chứng minh persistence; mở MongoDB kiểm tra; xóa có xác nhận; mở Expo trên Android, chọn ảnh và xem thông tin. Kết thúc bằng các file nộp.

## 8. Tài liệu tham khảo

https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/
https://docs.expo.dev/versions/v58.0.0/sdk/securestore/
https://docs.expo.dev/router/installation/

## 9. Liên kết bàn giao

Source: https://github.com/Phuocws0/ltdnt-gk-qlhocphan
Video web: https://github.com/Phuocws0/ltdnt-gk-qlhocphan/blob/main/docs/videos/demo-web.webm
Video Android: https://github.com/Phuocws0/ltdnt-gk-qlhocphan/blob/main/docs/videos/demo-android.mp4
