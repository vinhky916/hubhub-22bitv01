import psycopg2
from psycopg2.extras import DictCursor
import hashlib
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/hubhub")

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=DictCursor)
    return conn

def hash_password(password: str) -> str:
    # A simple and robust hash for local development
    salt = "hubhub_secure_salt_2026"
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL, -- 'traveler', 'owner', 'admin'
        status TEXT NOT NULL -- 'pending', 'approved', 'rejected', 'active'
    )
    """)

    # 2. Hotels Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hotels (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        description TEXT,
        amenities TEXT, -- Comma-separated list (e.g. "wifi, pool, beach")
        rating REAL DEFAULT 5.0,
        image_url TEXT,
        FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # 3. Rooms Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        hotel_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- "Single", "Double", "Suite", "Presidential"
        price_per_night REAL NOT NULL,
        capacity INTEGER NOT NULL,
        description TEXT,
        amenities TEXT, -- Comma-separated
        total_inventory INTEGER NOT NULL,
        available_inventory INTEGER NOT NULL,
        image_url TEXT,
        FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE
    )
    """)

    # 4. Bookings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        traveler_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        check_in_date TEXT NOT NULL,
        check_out_date TEXT NOT NULL,
        total_price REAL NOT NULL,
        status TEXT NOT NULL, -- 'pending_payment', 'paid', 'completed', 'cancelled'
        qr_code_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (traveler_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
    )
    """)

    # 5. System Logs Table (for Admin Monitoring)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        path TEXT NOT NULL,
        user_id INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        status_code INTEGER
    )
    """)

    conn.commit()

    # Seed data if database is empty (no users)
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        print("Seeding database...")
        
        # 1. Create Users
        # Admin
        cursor.execute("INSERT INTO users (username, password_hash, full_name, role, status) VALUES (%s, %s, %s, %s, %s)",
                       ("admin", hash_password("123456"), "Hệ thống Admin", "admin", "active"))
        # Owners
        cursor.execute("INSERT INTO users (username, password_hash, full_name, role, status) VALUES (%s, %s, %s, %s, %s)",
                       ("owner1", hash_password("123456"), "Nguyễn Văn A (Chủ Oasis Resort)", "owner", "approved"))
        cursor.execute("INSERT INTO users (username, password_hash, full_name, role, status) VALUES (%s, %s, %s, %s, %s)",
                       ("owner2", hash_password("123456"), "Trần Thị B (Chủ Mountain Villa)", "owner", "approved"))
        cursor.execute("INSERT INTO users (username, password_hash, full_name, role, status) VALUES (%s, %s, %s, %s, %s)",
                       ("owner3", hash_password("123456"), "Phạm Văn C (Chủ Khách Sạn Biển)", "owner", "pending"))
        # Travelers
        cursor.execute("INSERT INTO users (username, password_hash, full_name, role, status) VALUES (%s, %s, %s, %s, %s)",
                       ("traveler", hash_password("123456"), "Nguyễn Du Khách", "traveler", "active"))
        cursor.execute("INSERT INTO users (username, password_hash, full_name, role, status) VALUES (%s, %s, %s, %s, %s)",
                       ("guest1", hash_password("123456"), "Lê Minh Tuấn", "traveler", "active"))
        cursor.execute("INSERT INTO users (username, password_hash, full_name, role, status) VALUES (%s, %s, %s, %s, %s)",
                       ("guest2", hash_password("123456"), "Hoàng Lan Anh", "traveler", "active"))

        conn.commit()

        # Get User IDs
        cursor.execute("SELECT id, username FROM users")
        user_ids = {row["username"]: row["id"] for row in cursor.fetchall()}

        # 2. Create Hotels
        # Hotel 1 (Vũng Tàu - owner1)
        cursor.execute("""
        INSERT INTO hotels (owner_id, name, address, city, description, amenities, rating, image_url) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_ids["owner1"],
            "Oasis Beach Resort",
            "125 Thùy Vân, Phường 2",
            "Vũng Tàu",
            "Resort sang trọng tọa lạc ngay bãi sau Vũng Tàu, với hồ bơi vô cực sát biển và tầm nhìn hoàng hôn tuyệt đẹp.",
            "wifi, hồ bơi, sát biển, bãi đỗ xe, nhà hàng, spa",
            4.8,
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80"
        ))

        # Hotel 2 (Đà Nẵng - owner1)
        cursor.execute("""
        INSERT INTO hotels (owner_id, name, address, city, description, amenities, rating, image_url) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_ids["owner1"],
            "Riverside Grand Hotel",
            "36 Bạch Đằng, Quận Hải Châu",
            "Đà Nẵng",
            "Khách sạn đẳng cấp 5 sao bên bờ sông Hàn thơ mộng. Gần cầu Rồng và trung tâm hành chính Đà Nẵng.",
            "wifi, hồ bơi, phòng gym, quầy bar, buffet, view sông",
            4.9,
            "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=600&q=80"
        ))

        # Hotel 3 (Đà Lạt - owner2)
        cursor.execute("""
        INSERT INTO hotels (owner_id, name, address, city, description, amenities, rating, image_url) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_ids["owner2"],
            "Pine Forest Retreat Villa",
            "15 Khởi Nghĩa Bắc Sơn, Phường 10",
            "Đà Lạt",
            "Biệt thự ẩn mình giữa rừng thông thơ mộng. Không khí se lạnh, yên tĩnh, thích hợp cho kỳ nghỉ dưỡng yên bình.",
            "wifi, lò sưởi, sân vườn, nướng BBQ, ban công, bồn tắm",
            4.7,
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"
        ))

        # Hotel 4 (Nha Trang - owner2)
        cursor.execute("""
        INSERT INTO hotels (owner_id, name, address, city, description, amenities, rating, image_url) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_ids["owner2"],
            "Oceanus View Suite",
            "02 Trần Phú, Phường Lộc Thọ",
            "Nha Trang",
            "Căn hộ khách sạn hướng biển cao cấp trên trục đường Trần Phú sầm uất. Đầy đủ tiện nghi gia đình.",
            "wifi, hồ bơi, sát biển, bếp nấu, ban công, máy giặt",
            4.6,
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80"
        ))

        conn.commit()

        # Get Hotel IDs
        cursor.execute("SELECT id, name FROM hotels")
        hotel_ids = {row["name"]: row["id"] for row in cursor.fetchall()}

        # 3. Create Rooms
        # Hotel 1: Oasis Beach Resort (Vũng Tàu)
        cursor.execute("""
        INSERT INTO rooms (hotel_id, name, type, price_per_night, capacity, description, amenities, total_inventory, available_inventory, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            hotel_ids["Oasis Beach Resort"],
            "Deluxe Ocean Room",
            "Double",
            1200000.0,
            2,
            "Phòng Double sang trọng hướng biển, ban công lộng gió, trang bị bồn tắm nằm và đồ nội thất gỗ tự nhiên.",
            "wifi, sát biển, ban công, bồn tắm, tivi",
            10, 8,
            "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80"
        ))
        cursor.execute("""
        INSERT INTO rooms (hotel_id, name, type, price_per_night, capacity, description, amenities, total_inventory, available_inventory, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            hotel_ids["Oasis Beach Resort"],
            "Presidential Beachfront Suite",
            "Presidential",
            3200000.0,
            4,
            "Siêu biệt thự tổng thống sát biển, có hồ bơi riêng, phòng khách rộng lớn, quầy bar cá nhân và phục vụ 24/7.",
            "wifi, hồ bơi, sát biển, ban công, jacuzzi, ăn sáng miễn phí",
            3, 3,
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80"
        ))
        cursor.execute("""
        INSERT INTO rooms (hotel_id, name, type, price_per_night, capacity, description, amenities, total_inventory, available_inventory, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            hotel_ids["Oasis Beach Resort"],
            "Standard Garden Room",
            "Single",
            800000.0,
            2,
            "Phòng tiêu chuẩn hướng vườn, thiết kế ấm cúng, đầy đủ tiện nghi cơ bản cho cặp đôi.",
            "wifi, tivi, máy lạnh, bãi đỗ xe",
            15, 12,
            "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80"
        ))

        # Hotel 2: Riverside Grand Hotel (Đà Nẵng)
        cursor.execute("""
        INSERT INTO rooms (hotel_id, name, type, price_per_night, capacity, description, amenities, total_inventory, available_inventory, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            hotel_ids["Riverside Grand Hotel"],
            "Executive River View Room",
            "Double",
            1600000.0,
            2,
            "Phòng Deluxe view trọn cảnh sông Hàn và Cầu Rồng phun lửa cuối tuần. Thiết kế kính tràn viền cực kỳ hiện đại.",
            "wifi, view sông, ban công, máy pha cafe, bồn tắm",
            8, 8,
            "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80"
        ))
        cursor.execute("""
        INSERT INTO rooms (hotel_id, name, type, price_per_night, capacity, description, amenities, total_inventory, available_inventory, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            hotel_ids["Riverside Grand Hotel"],
            "Superior City Room",
            "Single",
            950000.0,
            1,
            "Phòng đơn gọn gàng, hướng thành phố nhộn nhịp, thích hợp cho khách đi công tác.",
            "wifi, phòng gym, tivi, bàn làm việc",
            20, 20,
            "https://images.unsplash.com/photo-1568495248636-6432b97bd949?auto=format&fit=crop&w=600&q=80"
        ))

        # Hotel 3: Pine Forest Retreat Villa (Đà Lạt)
        cursor.execute("""
        INSERT INTO rooms (hotel_id, name, type, price_per_night, capacity, description, amenities, total_inventory, available_inventory, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            hotel_ids["Pine Forest Retreat Villa"],
            "Cozy Pine View Attic Room",
            "Double",
            850000.0,
            2,
            "Phòng áp mái lãng mạn hướng ra đồi thông, trang bị lò sưởi củi ấm áp và ban công săn mây cực đỉnh.",
            "wifi, lò sưởi, ban công, săn mây, bồn tắm",
            5, 4,
            "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=600&q=80"
        ))
        cursor.execute("""
        INSERT INTO rooms (hotel_id, name, type, price_per_night, capacity, description, amenities, total_inventory, available_inventory, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            hotel_ids["Pine Forest Retreat Villa"],
            "Family Suite Villa Area",
            "Suite",
            2200000.0,
            6,
            "Căn hộ gia đình biệt lập trong khuôn viên biệt thự, có phòng bếp riêng và khu nướng BBQ ngoài trời sân vườn.",
            "wifi, sân vườn, nướng BBQ, bếp nấu, lò sưởi, máy giặt",
            2, 2,
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80"
        ))

        # Hotel 4: Oceanus View Suite (Nha Trang)
        cursor.execute("""
        INSERT INTO rooms (hotel_id, name, type, price_per_night, capacity, description, amenities, total_inventory, available_inventory, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            hotel_ids["Oceanus View Suite"],
            "Premium Sea View Studio",
            "Double",
            1100000.0,
            2,
            "Phòng studio hướng biển cao cấp tại Nha Trang. Có tủ lạnh lớn, bếp nấu và khu vực làm việc tiện nghi.",
            "wifi, sát biển, bếp nấu, ban công, máy giặt",
            12, 11,
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80"
        ))

        conn.commit()

        # Get Room IDs for seeding bookings
        cursor.execute("SELECT id, price_per_night, name FROM rooms")
        rooms_list = cursor.fetchall()
        rooms_map = {row["name"]: (row["id"], row["price_per_night"]) for row in rooms_list}

        # 4. Create Bookings (Seeding historical data for Owner/Admin Charts)
        r_deluxe_id, r_deluxe_price = rooms_map["Deluxe Ocean Room"]
        r_pres_id, r_pres_price = rooms_map["Presidential Beachfront Suite"]
        r_attic_id, r_attic_price = rooms_map["Cozy Pine View Attic Room"]
        
        # Traveler bookings
        bookings_data = [
            # Traveler 1
            (user_ids["guest1"], r_deluxe_id, "2026-05-01", "2026-05-03", r_deluxe_price * 2, "completed", "2026-05-01 10:00:00"),
            (user_ids["guest2"], r_deluxe_id, "2026-05-10", "2026-05-12", r_deluxe_price * 2, "completed", "2026-05-09 14:22:00"),
            (user_ids["traveler"], r_pres_id, "2026-05-15", "2026-05-17", r_pres_price * 2, "completed", "2026-05-14 08:15:00"),
            # June Bookings (Current month is June 2026)
            (user_ids["guest1"], r_deluxe_id, "2026-06-01", "2026-06-04", r_deluxe_price * 3, "completed", "2026-05-30 09:00:00"),
            (user_ids["guest2"], r_pres_id, "2026-06-05", "2026-06-07", r_pres_price * 2, "completed", "2026-06-04 11:30:00"),
            # Current Pending / Paid Bookings
            (user_ids["traveler"], r_deluxe_id, "2026-06-12", "2026-06-14", r_deluxe_price * 2, "paid", "2026-06-12 11:00:00"),
            (user_ids["guest1"], r_attic_id, "2026-06-15", "2026-06-17", r_attic_price * 2, "pending_payment", "2026-06-12 14:15:00"),
        ]

        for traveler_id, room_id, checkin, checkout, price, status, created_at in bookings_data:
            cursor.execute("""
            INSERT INTO bookings (traveler_id, room_id, check_in_date, check_out_date, total_price, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (traveler_id, room_id, checkin, checkout, price, status, created_at))

        # 5. Create System Logs (For Admin monitoring traffic)
        logs_data = [
            ("/api/rooms/search", user_ids["traveler"], "2026-06-12 14:01:12", "192.168.1.5", 200),
            ("/api/chat/parse", user_ids["traveler"], "2026-06-12 14:02:45", "192.168.1.5", 200),
            ("/api/bookings/create", user_ids["traveler"], "2026-06-12 14:10:00", "192.168.1.5", 201),
            ("/api/owner/stats", user_ids["owner1"], "2026-06-12 14:15:30", "192.168.1.10", 200),
            ("/api/admin/users", user_ids["admin"], "2026-06-12 14:20:00", "192.168.1.2", 200),
            ("/api/admin/approve-owner", user_ids["admin"], "2026-06-12 14:22:10", "192.168.1.2", 200),
        ]
        for path, user_id, timestamp, ip, status_code in logs_data:
            cursor.execute("""
            INSERT INTO system_logs (path, user_id, timestamp, ip_address, status_code)
            VALUES (%s, %s, %s, %s, %s)
            """, (path, user_id, timestamp, ip, status_code))

        conn.commit()
        print("Database seeded successfully!")
    
    conn.close()

if __name__ == "__main__":
    init_db()
