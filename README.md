# 🏨 Cloud Booking (Nền Tảng Đặt Phòng Trực Tuyến Tích Hợp AI)

> **Một câu mô tả ngắn:** Hệ thống đặt phòng khách sạn thông minh full-stack hỗ trợ Trợ lý AI tư vấn bằng ngôn ngữ tự nhiên, thanh toán đa cổng (VNPay, PayPal) và quản lý lịch giá phòng động cho chủ khách sạn.

---

## 📖 GIỚI THIỆU

### Dự án giải quyết vấn đề gì?
- **Tìm kiếm khách sạn chưa tối ưu:** Người dùng thường gặp khó khăn khi tìm kiếm phòng theo các nhu cầu phức tạp hoặc mô tả tự nhiên (ví dụ: *"khách sạn gần biển Đà Nẵng có hồ bơi ngoài trời cho gia đình 4 người"*). Dự án giải quyết bài toán này bằng **Trợ lý AI Tìm kiếm Thông minh** (Gemini AI & Vector Search).
- **Giá phòng cố định, thiếu linh hoạt:** Giúp chủ khách sạn tối ưu hóa doanh thu thông qua công cụ **Lịch giá phòng động (Dynamic Pricing)**, cho phép điều chỉnh giá theo ngày cuối tuần, ngày lễ hoặc đóng/mở phòng chủ động.
- **Thanh toán & Hủy phòng thiếu minh bạch:** Tích hợp đa cổng thanh toán phổ biến (VNPay, PayPal, Stripe) và quy trình tự động hóa giữ phòng / hủy phòng hết hạn trong 10 phút.

### Đối tượng sử dụng là ai?
1. **Khách hàng (Customer):** Người tìm kiếm, đặt phòng khách sạn, thanh toán trực tuyến, trò chuyện trực tiếp và nhận tư vấn từ Trợ lý AI.
2. **Chủ khách sạn / Nhân viên (Hotel Owner & Staff):** Đơn vị kinh doanh dịch vụ lưu trú cần đăng tải khách sạn, quản lý loại phòng, cấu hình bảng giá linh hoạt, duyệt đơn và xem báo cáo doanh thu.
3. **Quản trị viên hệ thống (Admin):** Đơn vị quản lý toàn bộ nền tảng, xét duyệt khách sạn đăng ký mới, quản lý người dùng, banners quảng cáo và danh mục hệ thống.

---

## 🖼️ DEMO / SCREENSHOTS

- **Link Demo Live:** *(Đang cập nhật / http://localhost:3000)*
- **Hình ảnh giao diện chính:**

<img width="647" height="414" alt="image" src="https://github.com/user-attachments/assets/37843a20-cc06-4130-8f05-2c1e188a7620" />


| Trang Chủ & AI Search Assistant | Chi Tiết Khách Sạn & Chọn Phòng |
|---|---|
| <img width="647" height="414" alt="image" src="https://github.com/user-attachments/assets/a1e211da-5f2e-4c55-bcc3-d77a206b22f0" />| <img width="881" height="496" alt="image" src="https://github.com/user-attachments/assets/26a4381e-a6eb-4b9b-95cf-629b4a3f38b2" />|

| Dashboard Quản Lý Lịch Giá Động (Owner) | Bản Đồ Tương Tác & Địa Điểm |
|---|---|
| <img width="975" height="680" alt="image" src="https://github.com/user-attachments/assets/d1cad6f9-bdb8-4ae2-bd19-dbcc03ec9ce3" />|<img width="1210" height="647" alt="Ảnh chụp màn hình 2026-08-07 140845" src="https://github.com/user-attachments/assets/589d16fb-7625-4960-8560-1384673006ae" />
 |

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG (TECH STACK)

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Redux Toolkit, Framer Motion, Leaflet (Interactive Maps), Recharts, Lucide Icons.
- **Backend:** Node.js, Express.js, TypeScript.
- **Database & ORM:** PostgreSQL 15, Prisma ORM 5.x.
- **Real-time Communication:** Socket.io (Live Chat & Notification system).
- **AI & Intelligent Search:** Google Gemini AI API (`@google/generative-ai`), Vector Search / LangGraph.
- **Authentication & Security:** JWT (AccessToken & RefreshToken), Google OAuth 2.0, Bcrypt, Helmet, CORS.
- **Payment Gateways:** VNPay (Sandbox), PayPal (Sandbox), Stripe API.
- **Email & Storage Services:** Nodemailer / Resend SMTP, Cloudinary API.
- **DevOps:** Docker, Docker Compose, Nginx.

---

## ✨ TÍNH NĂNG CHÍNH

### 🔐 1. Đăng ký & Đăng nhập
- Đăng ký / Đăng nhập bằng Email & Mật khẩu mã hóa Bcrypt.
- Đăng nhập nhanh bằng **Google OAuth 2.0**.
- Quên mật khẩu & Xác thực qua **Mã OTP Email** (Nodemailer).
- Phân quyền người dùng theo Role (`CUSTOMER`, `HOTEL_OWNER`, `ADMIN`).

### 🔍 2. Tìm kiếm & Tư vấn AI
- Tìm kiếm & Lọc theo địa điểm, mức giá, số sao, loại hình (Khách sạn, Resort, Homestay, Villa) và tiện nghi.
- **🤖 Trợ lý AI Tìm kiếm Thông minh:** Hỏi đáp trực tiếp bằng tiếng Việt tự nhiên để tìm phòng đúng nhu cầu.

### 💳 3. Đặt phòng & Thanh toán
- Chọn ngày nhận/trả phòng, chọn số lượng từng loại phòng.
- Áp dụng Mã giảm giá (Coupon) và Điểm thưởng thành viên (Loyalty Points).
- Thanh toán linh hoạt qua 3 cổng: **VNPay (QR/ATM)**, **PayPal**.
- Tự động hủy đơn hàng `PENDING` nếu quá 10 phút chưa hoàn tất thanh toán.

### 📅 4. Quản lý Lịch giá phòng động (Owner)
- Điều chỉnh giá phòng theo ngày cụ thể (cuối tuần, lễ tết).
- Chặn/Mở bán phòng linh hoạt theo từng ngày trên giao diện Calendar.

### 💬 5. Live Chat & Đánh giá
- Nhắn tin trực tiếp giữa Khách hàng và Chủ khách sạn thời gian thực via Socket.io.
- Đánh giá khách sạn kèm điểm số và bình luận sau khi hoàn thành kỳ nghỉ.

### 📊 6. Admin & Dashboard Quản lý
- Admin duyệt / khóa khách sạn mới đăng ký.
- Báo cáo doanh thu, tỷ lệ lấp đầy phòng dạng biểu đồ trực quan (Recharts).
- Xuất báo cáo danh sách đơn đặt phòng ra file **Excel (.xlsx)**.

---

## ⚙️ CẤU HÌNH ENVIRONMENT (.ENV)

Các file `.env` cần được tạo ở thư mục `backend/` và `frontend/`. 
*(Lưu ý: Các khóa bảo mật thực tế được thay thế bằng tên biến và giá trị đại diện mẫu).*

### File `backend/.env`
```env
PORT=5000
NODE_ENV=development

# Database Connection
DATABASE_URL="postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:5432/<DB_NAME>?schema=public"

# JWT Authentication Secrets
JWT_SECRET="<YOUR_JWT_SECRET_KEY>"
JWT_REFRESH_SECRET="<YOUR_JWT_REFRESH_SECRET_KEY>"

# Nodemailer SMTP Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="<YOUR_SMTP_EMAIL>"
EMAIL_PASS="<YOUR_SMTP_APP_PASSWORD>"
EMAIL_FROM="Cloud Booking Support <<YOUR_SMTP_EMAIL>>"

# Cloudinary Storage Credentials
CLOUDINARY_CLOUD_NAME="<YOUR_CLOUDINARY_CLOUD_NAME>"
CLOUDINARY_API_KEY="<YOUR_CLOUDINARY_API_KEY>"
CLOUDINARY_API_SECRET="<YOUR_CLOUDINARY_API_SECRET>"

# Gemini AI API Key
GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>"

# CORS Allowed Origin
FRONTEND_URL="http://localhost:5173"

# VNPay Sandbox Configuration
VNPAY_TMN_CODE="<YOUR_VNPAY_TMN_CODE>"
VNPAY_HASH_SECRET="<YOUR_VNPAY_HASH_SECRET>"
VNPAY_URL="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
VNPAY_RETURN_URL="http://localhost:5000/api/payment/vnpay-callback"

# PayPal Sandbox Credentials
PAYPAL_CLIENT_ID="<YOUR_PAYPAL_CLIENT_ID>"
PAYPAL_CLIENT_SECRET="<YOUR_PAYPAL_CLIENT_SECRET>"
PAYPAL_MODE="sandbox"

# Google OAuth 2.0
GOOGLE_CLIENT_ID="<YOUR_GOOGLE_CLIENT_ID>"
GOOGLE_CLIENT_SECRET="<YOUR_GOOGLE_CLIENT_SECRET>"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"
```

### File `frontend/.env`
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 CHẠY DỰ ÁN

### 1. Clone Repository & Cài đặt Dependencies
```bash
git clone https://github.com/DuyLong22/booking_hotel.git
cd booking_hotel

# Cài đặt dependencies cho monorepo
npm install
```

### 2. Lựa chọn cách khởi chạy

#### **CÁCH A: Chạy bằng Docker Compose (Khuyên dùng - Nhanh nhất)**
Chạy 1 câu lệnh duy nhất để dựng Postgres, Migrate Database, Seed dữ liệu và khởi chạy 2 server:
```bash
docker-compose up -d --build
```
- **Frontend URL:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

#### **CÁCH B: Chạy thủ công từng Server (Local Development)**

1. **Khởi chạy Cơ sở dữ liệu PostgreSQL** (qua Docker hoặc Postgres Local):
   ```bash
   docker run --name cloud_booking_postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cloud_booking -p 5432:5432 -d postgres:15-alpine
   ```

2. **Migrate Schema & Seed dữ liệu mẫu (Prisma):**
   ```bash
   cd backend
   npx prisma db push
   npm run prisma:seed
   ```

3. **Chạy Backend & Frontend:**
   - Mở 2 terminal ở thư mục gốc:
     - Terminal 1 (Backend): `npm run dev:backend` *(chạy port 5000)*
     - Terminal 2 (Frontend): `npm run dev:frontend` *(chạy port 5173)*

---

## 📁 CẤU TRÚC THƯ MỤC

```text
cloud-hotel-booking-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Khai báo Models & Database Schema
│   │   ├── seed.ts               # Script nạp dữ liệu khởi tạo
│   │   └── data.json             # Dữ liệu 63 Tỉnh/Thành Việt Nam
│   ├── src/
│   │   ├── controllers/          # Nhận Request & trả về Response HTTP
│   │   ├── domain/               # Định nghĩa Entities & Business Interfaces
│   │   ├── infrastructure/       # Services: Mail, Socket, Gemini AI, Payments, Vector Search
│   │   ├── interfaces/           # Express Routes & Auth Middlewares
│   │   ├── use-cases/            # Xử lý nghiệp vụ chính (Auth, Booking, Hotel, Payment)
│   │   ├── app.ts                # Express application setup
│   │   └── server.ts             # Khởi tạo HTTP & Socket.io server
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/           # UI Components (Customer, Owner, Admin, Chat, Dynamic Calendar)
│   │   ├── pages/                # Các trang chính (Home, Search, HotelDetail, Checkout, Dashboard)
│   │   ├── store/                # Redux State Management (Slices & Store setup)
│   │   ├── services/             # Axios API Client & Socket.io Listeners
│   │   ├── utils/                # Helper functions (Currency, Dates, Formatters)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml            # Container Orchestration file
└── README.md
```

---

## 🗄️ API / DATABASE

### Các Models chính trong Database (PostgreSQL + Prisma ORM):
- `User`: Lưu thông tin tài khoản, vai trò (Customer, Hotel Owner, Admin), điểm tích lũy.
- `Hotel`: Khách sạn, địa chỉ, vị trí tọa độ (Lat/Lng), số sao, trạng thái phê duyệt.
- `RoomType` & `Room`: Danh mục loại phòng (Deluxe, Family Suite...) và từng phòng vật lý cụ thể.
- `RoomPriceCalendar`: Lịch lưu giá phòng động theo từng ngày.
- `Booking` & `BookingItem`: Đơn đặt phòng, thông tin ngày lưu trú, tổng tiền, trạng thái thanh toán.
- `Review`: Đánh giá & nhận xét của khách hàng.
- `Conversation` & `Message`: Đoạn hội thoại chat thời gian thực giữa Khách hàng và Chủ khách sạn.

### Danh sách nhóm API chính:
- `POST /api/auth/register` | `POST /api/auth/login` | `GET /api/auth/google`
- `GET /api/hotels` | `GET /api/hotels/:id` | `POST /api/hotels`
- `POST /api/bookings` | `GET /api/bookings/my-bookings` | `PUT /api/bookings/:id/cancel`
- `POST /api/payment/create-vnpay-url` | `POST /api/payment/create-paypal-order`
- `POST /api/ai/search` (Hỏi đáp tìm phòng AI)
- `GET /api/rate-plans/calendar` | `POST /api/rate-plans/override` (Lịch giá động)

---

## 🔑 TÀI KHOẢN DEMO

Sau khi chạy lệnh `npm run prisma:seed`, hệ thống có sẵn các tài khoản demo sau:

| Vai trò (Role) | Email | Mật khẩu (Password) | Ghi chú |
|---|---|---|---|
| **Admin** | `admin@cloudbooking.com` | `Password123!` | Quản trị toàn bộ hệ thống & duyệt khách sạn |
| **Hotel Owner** | `owner@cloudbooking.com` | `Password123!` | Chủ khách sạn mẫu ở Đà Lạt & Đà Nẵng |
| **Customer** | `customer@gmail.com` | `Password123!` | Khách hàng đặt phòng & tìm kiếm AI |
| **Staff**    | `staff@hotel.com`    | `staff123`     | Nhân viên của chỗ nghỉ |
---

## 🤝 ĐÓNG GÓP (CONTRIBUTING)

Dự án hoan nghênh mọi đóng góp nâng cấp tính năng hoặc sửa lỗi:
1. **Fork** repository này về tài khoản GitHub của bạn.
2. Tạo nhánh mới cho tính năng: `git checkout -b feature/AmazingFeature`
3. Commit các thay đổi: `git commit -m 'Add some AmazingFeature'`
4. Push lên nhánh của bạn: `git push origin feature/AmazingFeature`
5. Mở một **Pull Request** để thảo luận và merge code.

---

## 👨‍💻 TÁC GIẢ

| Thành viên                  | Vai trò chính                                | Phụ trách chính                                                                        |
| --------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Đỗ Duy Long**             | **Backend Developer & AI/Payment Developer** | CSDL, Prisma, thanh toán VNPay/PayPal, hoàn tiền, AI Travel Assistant, Owner Dashboard |
| **Nguyễn Đặng Thanh Phong** | **Backend Developer & Business Logic**       | Xác thực/OTP/Google OAuth/JWT, đặt phòng, quản lý nghiệp vụ Owner                      |
| **Nguyễn Minh Khôi**        | **Frontend Developer & Realtime Developer**  | Loyalty & Membership, Socket.IO/Live Chat, Admin Dashboard, Responsive UI              |
| **Nguyễn Vương Vĩnh Kỳ**    | **Frontend Developer & UI/Staff Management** | Admin Dashboard, Staff Dashboard, Check-in/Check-out, Responsive UI                    |


---
*Cảm ơn bạn đã quan tâm và sử dụng dự án Cloud Booking!* 🚀
