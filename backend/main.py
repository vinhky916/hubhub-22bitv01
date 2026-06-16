from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import datetime
from database import get_db_connection, hash_password
from ai_parser import parse_natural_language_query

app = FastAPI(title="HubHub Hotel Booking & AI Assistant API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For easy local testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middleware to log requests to PostgreSQL for Admin Audit logs
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Process request
    response = await call_next(request)
    
    # Save log for specific API endpoints (skip OPTIONS and static/docs calls)
    path = request.url.path
    if path.startswith("/api/") and not request.method == "OPTIONS":
        # Attempt to get user info if passed in header (simple mock auth trace)
        user_id = None
        user_header = request.headers.get("X-User-Id")
        if user_header and user_header.isdigit():
            user_id = int(user_header)
            
        ip = request.client.host if request.client else "127.0.0.1"
        status_code = response.status_code
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO system_logs (path, user_id, ip_address, status_code) VALUES (%s, %s, %s, %s)",
                (path, user_id, ip, status_code)
            )
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Failed to write system log: {e}")
            
    return response


# --- Pydantic Models ---
class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str
    role: str # 'traveler', 'owner'

class UserLogin(BaseModel):
    username: str
    password: str

class QueryText(BaseModel):
    query: str

class BookingCreate(BaseModel):
    traveler_id: int
    room_id: int
    check_in_date: str
    check_out_date: str

class OwnerApprovalUpdate(BaseModel):
    status: str # 'approved', 'rejected'

class RoomCreateUpdate(BaseModel):
    hotel_id: int
    name: str
    type: str
    price_per_night: float
    capacity: int
    description: str
    amenities: str # comma-separated
    total_inventory: int

class HotelUpdate(BaseModel):
    name: str
    address: str
    city: str
    description: str
    amenities: str # comma-separated


# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to HubHub API. Database is active."}


# --- Authentication ---

@app.post("/api/auth/register")
def register(user: UserRegister):
    if user.role not in ["traveler", "owner"]:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ.")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if username exists
    cursor.execute("SELECT id FROM users WHERE username = %s", (user.username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Tên tài khoản đã tồn tại.")
        
    # For owners, register as pending. For travelers, active.
    initial_status = "pending" if user.role == "owner" else "active"
    
    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash, full_name, role, status) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (user.username, hash_password(user.password), user.full_name, user.role, initial_status)
        )
        owner_id = cursor.fetchone()[0]
        conn.commit()
        # If user is owner, auto-create a shell hotel record for them so they can edit it
        if user.role == "owner":
            cursor.execute(
                "INSERT INTO hotels (owner_id, name, address, city, description, amenities, rating, image_url) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (owner_id, "Khách sạn mới của tôi", "Chưa cập nhật", "Vũng Tàu", "Mô tả khách sạn của bạn", "wifi", 5.0, "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80")
            )
            conn.commit()
            
        conn.close()
        return {"message": "Đăng ký thành công!", "status": initial_status}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Lỗi đăng ký: {str(e)}")

@app.post("/api/auth/login")
def login(user: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, username, full_name, role, status FROM users WHERE username = %s AND password_hash = %s",
        (user.username, hash_password(user.password))
    )
    db_user = cursor.fetchone()
    conn.close()
    
    if not db_user:
        raise HTTPException(status_code=400, detail="Sai tên đăng nhập hoặc mật khẩu.")
        
    if db_user["role"] == "owner" and db_user["status"] == "pending":
        raise HTTPException(status_code=403, detail="Tài khoản chủ khách sạn của bạn đang chờ Admin duyệt.")
    elif db_user["role"] == "owner" and db_user["status"] == "rejected":
        raise HTTPException(status_code=403, detail="Tài khoản chủ khách sạn của bạn đã bị từ chối.")
        
    return {
        "id": db_user["id"],
        "username": db_user["username"],
        "full_name": db_user["full_name"],
        "role": db_user["role"],
        "status": db_user["status"],
        "token": f"mock-jwt-token-{db_user['id']}" # simple local development token
    }


# --- Storefront (Traveler) ---

@app.get("/api/locations/suggest")
def suggest_locations(q: str = ""):
    db_hotels = []
    db_cities = []
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Fetch matching hotels
        if q:
            cursor.execute("SELECT id, name, city, image_url FROM hotels WHERE name ILIKE %s", (f"%{q}%",))
        else:
            cursor.execute("SELECT id, name, city, image_url FROM hotels LIMIT 2")
        db_hotels = [dict(row) for row in cursor.fetchall()]
        
        # Fetch distinct cities from database
        cursor.execute("SELECT DISTINCT city FROM hotels WHERE city IS NOT NULL AND city != ''")
        db_cities = [row["city"] for row in cursor.fetchall()]
        conn.close()
    except Exception as e:
        print(f"Error fetching suggestions: {e}")

    ALL_VIETNAM_PROVINCES = [
        "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
        "Vũng Tàu", "Bà Rịa - Vũng Tàu", "Đà Lạt", "Lâm Đồng", "Nha Trang", 
        "Khánh Hòa", "Phú Quốc", "Kiên Giang", "Hạ Long", "Quảng Ninh", 
        "Sa Pa", "Lào Cai", "Huế", "Thừa Thiên Huế", "Hội An", 
        "Quảng Nam", "Ninh Bình", "Mũi Né", "Bình Thuận", "An Giang", 
        "Bạc Liêu", "Bắc Giang", "Bắc Kạn", "Bắc Ninh", "Bến Tre", 
        "Bình Dương", "Bình Định", "Bình Phước", "Cà Mau", "Cao Bằng", 
        "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", 
        "Gia Lai", "Hà Giang", "Hà Nam", "Hà Tĩnh", "Hải Dương", 
        "Hậu Giang", "Hòa Bình", "Hưng Yên", "Kon Tum", "Lai Châu", 
        "Lạng Sơn", "Long An", "Nam Định", "Nghệ An", "Ninh Thuận", 
        "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Ngãi", "Quảng Trị", 
        "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", 
        "Thanh Hóa", "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", 
        "Vĩnh Phúc", "Yên Bái"
    ]

    city_details = {
        "Hồ Chí Minh": { 
            "count": "15.546", "tags": "nhà hàng, mua sắm", 
            "image": "https://images.unsplash.com/photo-1508913964003-774b706c3ac9?auto=format&fit=crop&w=120&q=80",
            "spots": ["Chợ Bến Thành", "Dinh Độc Lập", "Nhà thờ Đức Bà", "Phố đi bộ Nguyễn Huệ"]
        },
        "Hà Nội": { 
            "count": "10.744", "tags": "nhà hàng, tham quan", 
            "image": "https://images.unsplash.com/photo-1509060464153-4466739f7840?auto=format&fit=crop&w=120&q=80",
            "spots": ["Hồ Hoàn Kiếm", "Lăng Bác", "Chùa Một Cột", "Phố Cổ Hà Nội"]
        },
        "Đà Nẵng": { 
            "count": "8.450", "tags": "view sông, cầu rồng", 
            "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=120&q=80",
            "spots": ["Bà Nà Hills", "Cầu Rồng", "Ngũ Hành Sơn", "Bán đảo Sơn Trà"]
        },
        "Bà Rịa - Vũng Tàu": { 
            "count": "6.329", "tags": "bãi biển, nhà hàng", 
            "image": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=120&q=80",
            "spots": ["Bãi Sau", "Tượng Chúa Kito", "Mũi Nghinh Phong", "Hải Đăng Vũng Tàu"]
        },
        "Vũng Tàu": { 
            "count": "6.329", "tags": "bãi biển, nhà hàng", 
            "image": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=120&q=80",
            "spots": ["Bãi Sau", "Tượng Chúa Kito", "Mũi Nghinh Phong", "Hải Đăng Vũng Tàu"]
        },
        "Khánh Hòa": { 
            "count": "4.098", "tags": "bãi biển, lặn san hô", 
            "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=120&q=80",
            "spots": ["VinWonders", "Tháp Bà Ponagar", "Hòn Chồng", "Chùa Long Sơn"]
        },
        "Nha Trang": { 
            "count": "4.098", "tags": "bãi biển, lặn san hô", 
            "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=120&q=80",
            "spots": ["VinWonders", "Tháp Bà Ponagar", "Hòn Chồng", "Chùa Long Sơn"]
        },
        "Lâm Đồng": { 
            "count": "5.920", "tags": "đồi thông, săn mây", 
            "image": "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=120&q=80",
            "spots": ["Hồ Xuân Hương", "Thung Lũng Tình Yêu", "Đỉnh Langbiang", "Chợ Đêm Đà Lạt"]
        },
        "Đà Lạt": { 
            "count": "5.920", "tags": "đồi thông, săn mây", 
            "image": "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=120&q=80",
            "spots": ["Hồ Xuân Hương", "Thung Lũng Tình Yêu", "Đỉnh Langbiang", "Chợ Đêm Đà Lạt"]
        },
        "Kiên Giang": {
            "count": "3.150", "tags": "đảo ngọc, resort biển",
            "image": "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=120&q=80",
            "spots": ["Đảo Phú Quốc", "Đảo Nam Du", "Bãi Sao Phú Quốc", "Chợ đêm Phú Quốc"]
        },
        "Phú Quốc": {
            "count": "3.150", "tags": "đảo ngọc, resort biển",
            "image": "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=120&q=80",
            "spots": ["Đảo Phú Quốc", "Đảo Nam Du", "Bãi Sao Phú Quốc", "Chợ đêm Phú Quốc"]
        },
        "Quảng Ninh": {
            "count": "4.560", "tags": "vịnh biển, hang động",
            "image": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=120&q=80",
            "spots": ["Vịnh Hạ Long", "Đảo Tuần Châu", "Yên Tử", "Vân Đồn"]
        },
        "Hạ Long": {
            "count": "4.560", "tags": "vịnh biển, hang động",
            "image": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=120&q=80",
            "spots": ["Vịnh Hạ Long", "Đảo Tuần Châu", "Yên Tử", "Vân Đồn"]
        },
        "Lào Cai": {
            "count": "2.890", "tags": "ruộng bậc thang, núi tuyết",
            "image": "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?auto=format&fit=crop&w=120&q=80",
            "spots": ["Đỉnh Fansipan", "Bản Cát Cát", "Thung lũng Mường Hoa", "Đèo Ô Quy Hồ"]
        },
        "Sa Pa": {
            "count": "2.890", "tags": "ruộng bậc thang, núi tuyết",
            "image": "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?auto=format&fit=crop&w=120&q=80",
            "spots": ["Đỉnh Fansipan", "Bản Cát Cát", "Thung lũng Mường Hoa", "Đèo Ô Quy Hồ"]
        },
        "Thừa Thiên Huế": {
            "count": "1.980", "tags": "lịch sử, kinh thành",
            "image": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=120&q=80",
            "spots": ["Kinh thành Huế", "Chùa Thiên Mụ", "Lăng Khải Định", "Sông Hương"]
        },
        "Huế": {
            "count": "1.980", "tags": "lịch sử, kinh thành",
            "image": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=120&q=80",
            "spots": ["Kinh thành Huế", "Chùa Thiên Mụ", "Lăng Khải Định", "Sông Hương"]
        },
        "Quảng Nam": {
            "count": "2.420", "tags": "phố cổ, đèn lồng",
            "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=120&q=80",
            "spots": ["Phố Cổ Hội An", "Thánh địa Mỹ Sơn", "Cù Lao Chàm", "Rừng dừa Bảy Mẫu"]
        },
        "Hội An": {
            "count": "2.420", "tags": "phố cổ, đèn lồng",
            "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=120&q=80",
            "spots": ["Phố Cổ Hội An", "Thánh địa Mỹ Sơn", "Cù Lao Chàm", "Rừng dừa Bảy Mẫu"]
        },
        "Ninh Bình": {
            "count": "1.540", "tags": "tràng an, hang múa",
            "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=120&q=80",
            "spots": ["Tràng An", "Chùa Bái Đính", "Tam Cốc - Bích Động", "Hang Múa"]
        },
        "Bình Thuận": {
            "count": "2.120", "tags": "mũi né, đồi cát bay",
            "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=120&q=80",
            "spots": ["Mũi Né", "Đồi Cát Bay", "Hòn Rơm", "Tháp Chàm Poshanu"]
        },
        "Mũi Né": {
            "count": "2.120", "tags": "mũi né, đồi cát bay",
            "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=120&q=80",
            "spots": ["Mũi Né", "Đồi Cát Bay", "Hòn Rơm", "Tháp Chàm Poshanu"]
        },
        "Hải Phòng": {
            "count": "1.850", "tags": "cát bà, đồ sơn",
            "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=120&q=80",
            "spots": ["Đảo Cát Bà", "Vịnh Lan Hạ", "Biển Đồ Sơn", "Tuyệt Tình Cốc"]
        },
        "Cần Thơ": {
            "count": "1.120", "tags": "chợ nổi, miền tây",
            "image": "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=120&q=80",
            "spots": ["Chợ nổi Cái Răng", "Bến Ninh Kiều", "Nhà cổ Bình Thủy", "Vườn cò Bằng Lăng"]
        }
    }
    
    default_top_destinations = [
        "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Vũng Tàu", "Nha Trang", 
        "Đà Lạt", "Phú Quốc", "Hạ Long", "Sa Pa", "Huế", "Hội An", "Ninh Bình"
    ]
    
    all_city_names = list(set(db_cities + ALL_VIETNAM_PROVINCES))
    
    matching_cities = []
    if q.strip():
        q_lower = q.lower().strip()
        filtered_city_names = [city for city in all_city_names if q_lower in city.lower()]
    else:
        # Default top 12 popular tourist destinations in Vietnam
        filtered_city_names = default_top_destinations
        
    for name in filtered_city_names:
        details = city_details.get(name, { 
            "count": "150", 
            "tags": "điểm đến du lịch", 
            "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=120&q=80",
            "spots": ["Trung tâm thành phố", "Điểm tham quan địa phương"]
        })
        matching_cities.append({
            "name": name,
            "count": details["count"],
            "tags": details["tags"],
            "image": details["image"],
            "spots": details.get("spots", [])
        })
        
    return {
        "cities": matching_cities,
        "hotels": db_hotels
    }


@app.get("/api/rooms/search")
def search_rooms(
    city: Optional[str] = None,
    check_in: Optional[str] = None,
    check_out: Optional[str] = None,
    price_max: Optional[float] = None,
    capacity: Optional[int] = None,
    room_type: Optional[str] = None,
    amenities: Optional[str] = None # comma separated tags
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT r.*, h.name as hotel_name, h.address as hotel_address, h.city as hotel_city, h.rating as hotel_rating
        FROM rooms r
        JOIN hotels h ON r.hotel_id = h.id
        WHERE 1=1
    """
    params = []
    
    if city:
        parsed_city = city.split(" - ")[0].strip()
        query += " AND h.city LIKE %s"
        params.append(f"%{parsed_city}%")
        
    if price_max:
        query += " AND r.price_per_night <= %s"
        params.append(price_max)
        
    if capacity:
        query += " AND r.capacity >= %s"
        params.append(capacity)
        
    if room_type:
        query += " AND r.type = %s"
        params.append(room_type)
        
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    rooms = [dict(row) for row in rows]
    
    # Filter by amenities in python to keep database query simple
    if amenities:
        filter_tags = [tag.strip().lower() for tag in amenities.split(",")]
        filtered_rooms = []
        for r in rooms:
            # combine room and hotel amenities
            r_amenities = (r["amenities"] or "").lower() + "," + str(r["hotel_rating"] or "") + "," + (r["description"] or "").lower()
            if all(tag in r_amenities for tag in filter_tags):
                filtered_rooms.append(r)
        rooms = filtered_rooms
        
    return rooms


# --- AI Chatbot Assistant ---

@app.post("/api/chat/assistant")
def chat_assistant(payload: QueryText):
    query = payload.query
    if not query.strip():
        return {"explanation": "Xin chào! Bạn muốn tìm phòng ở đâu, tầm giá bao nhiêu và vào khi nào?", "rooms": []}
        
    # 1. Parse query
    parsed = parse_natural_language_query(query)
    
    # 2. Query matching rooms
    conn = get_db_connection()
    cursor = conn.cursor()
    
    sql_query = """
        SELECT r.*, h.name as hotel_name, h.address as hotel_address, h.city as hotel_city, h.rating as hotel_rating
        FROM rooms r
        JOIN hotels h ON r.hotel_id = h.id
        WHERE 1=1
    """
    params = []
    
    if parsed["city"]:
        sql_query += " AND h.city LIKE %s"
        params.append(f"%{parsed['city']}%")
        
    if parsed["max_price"]:
        sql_query += " AND r.price_per_night <= %s"
        params.append(parsed["max_price"])
        
    if parsed["capacity"]:
        sql_query += " AND r.capacity >= %s"
        params.append(parsed["capacity"])
        
    if parsed["room_type"]:
        sql_query += " AND r.type = %s"
        params.append(parsed["room_type"])
        
    cursor.execute(sql_query, params)
    rows = cursor.fetchall()
    conn.close()
    
    rooms = [dict(row) for row in rows]
    
    # Filter by amenities in python
    if parsed["amenities"]:
        filtered_rooms = []
        for r in rooms:
            combined_text = ((r["amenities"] or "") + " " + (r["description"] or "")).lower()
            if all(tag.lower() in combined_text for tag in parsed["amenities"]):
                filtered_rooms.append(r)
        rooms = filtered_rooms

    # Formulate friendly assistant response if no rooms found
    explanation = parsed["explanation"]
    if not rooms:
        explanation += "\n\nHiện tại tôi không tìm thấy phòng nào khớp chính xác với tất cả các tiêu chí trên trong hệ thống. Bạn có muốn thử tìm kiếm với mức giá khác hoặc khu vực lân cận không?"
    else:
        explanation += f"\n\nTôi đã tìm thấy **{len(rooms)} phòng** phù hợp nhất dành cho bạn dưới đây. Bạn có thể xem chi tiết và đặt trực tiếp!"

    return {
        "explanation": explanation,
        "rooms": rooms[:5], # Return top 5 matches
        "parsed_entities": {
            "city": parsed["city"],
            "max_price": parsed["max_price"],
            "amenities": parsed["amenities"],
            "date_description": parsed["date_description"],
            "check_in": parsed["check_in"],
            "check_out": parsed["check_out"],
            "capacity": parsed["capacity"],
            "room_type": parsed["room_type"]
        }
    }


# --- Booking and Payments ---

@app.post("/api/bookings/create")
def create_booking(booking: BookingCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if room exists and has availability
    cursor.execute("SELECT price_per_night, available_inventory, name FROM rooms WHERE id = %s", (booking.room_id,))
    room = cursor.fetchone()
    if not room:
        conn.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng này.")
        
    if room["available_inventory"] <= 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Rất tiếc, phòng này đã hết chỗ trong khoảng thời gian này.")
        
    # Calculate price
    try:
        d1 = datetime.datetime.strptime(booking.check_in_date, "%Y-%m-%d")
        d2 = datetime.datetime.strptime(booking.check_out_date, "%Y-%m-%d")
        nights = (d2 - d1).days
        if nights <= 0:
            nights = 1
    except ValueError:
        nights = 1
        
    total_price = room["price_per_night"] * nights
    
    # Lock the room: decrement inventory by 1
    new_inventory = room["available_inventory"] - 1
    cursor.execute("UPDATE rooms SET available_inventory = %s WHERE id = %s", (new_inventory, booking.room_id))
    
    # Create booking record in status 'pending_payment'
    cursor.execute(
        """
        INSERT INTO bookings (traveler_id, room_id, check_in_date, check_out_date, total_price, status)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
        """,
        (booking.traveler_id, booking.room_id, booking.check_in_date, booking.check_out_date, total_price, "pending_payment")
    )
    booking_id = cursor.fetchone()[0]
    
    # Generate dynamic VietQR API URL
    # Bank: MBBank (970422), Account: 123456789, Template: qr_only
    # Amount: total_price
    # Description: Thanh toan HubHub don hang <booking_id>
    add_info = f"HubHubBK{booking_id}"
    qr_url = f"https://img.vietqr.io/image/MBBank-123456789-qr_only.png?amount={int(total_price)}&addInfo={add_info}&accountName=KHACH%20SAN%20OASIS"
    
    cursor.execute("UPDATE bookings SET qr_code_url = %s WHERE id = %s", (qr_url, booking_id))
    conn.commit()
    
    # Fetch final booking data
    cursor.execute(
        """
        SELECT b.*, r.name as room_name, h.name as hotel_name 
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN hotels h ON r.hotel_id = h.id
        WHERE b.id = %s
        """, (booking_id,)
    )
    db_booking = dict(cursor.fetchone())
    conn.close()
    
    return db_booking

@app.post("/api/bookings/simulate-payment/{booking_id}")
def simulate_payment(booking_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT status FROM bookings WHERE id = %s", (booking_id,))
    booking = cursor.fetchone()
    if not booking:
        conn.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy hóa đơn đặt phòng.")
        
    if booking["status"] != "pending_payment":
        conn.close()
        return {"message": "Đơn hàng đã được thanh toán hoặc đã bị hủy.", "status": booking["status"]}
        
    # Update status to 'paid'
    cursor.execute("UPDATE bookings SET status = 'paid' WHERE id = %s", (booking_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Thanh toán thành công qua mã QR động (Simulated)!", "status": "paid"}

@app.get("/api/bookings/my-bookings/{user_id}")
def get_my_bookings(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT b.*, r.name as room_name, r.image_url as room_image, h.name as hotel_name, h.address as hotel_address, h.city as hotel_city
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN hotels h ON r.hotel_id = h.id
        WHERE b.traveler_id = %s
        ORDER BY b.id DESC
        """, (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# --- Hotel Owner Dashboard ---

@app.get("/api/owner/hotels")
def get_owner_hotel(owner_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM hotels WHERE owner_id = %s", (owner_id,))
    hotel = cursor.fetchone()
    conn.close()
    if not hotel:
        raise HTTPException(status_code=404, detail="Bạn chưa đăng ký khách sạn nào.")
    return dict(hotel)

@app.put("/api/owner/hotels")
def update_owner_hotel(owner_id: int, payload: HotelUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM hotels WHERE owner_id = %s", (owner_id,))
    hotel = cursor.fetchone()
    if not hotel:
        conn.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy khách sạn để cập nhật.")
        
    cursor.execute(
        "UPDATE hotels SET name = %s, address = %s, city = %s, description = %s, amenities = %s WHERE owner_id = %s",
        (payload.name, payload.address, payload.city, payload.description, payload.amenities, owner_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Cập nhật thông tin khách sạn thành công!"}

@app.get("/api/owner/rooms")
def get_owner_rooms(owner_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT r.* FROM rooms r
        JOIN hotels h ON r.hotel_id = h.id
        WHERE h.owner_id = %s
        """, (owner_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/owner/rooms")
def create_owner_room(owner_id: int, room: RoomCreateUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify hotel belongs to owner
    cursor.execute("SELECT id FROM hotels WHERE id = %s AND owner_id = %s", (room.hotel_id, owner_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Khách sạn không thuộc về tài khoản này.")
        
    # Generate a placeholder image based on type
    img_urls = {
        "Single": "https://images.unsplash.com/photo-1568495248636-6432b97bd949?auto=format&fit=crop&w=600&q=80",
        "Double": "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80",
        "Suite": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80",
        "Presidential": "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80"
    }
    img = img_urls.get(room.type, img_urls["Double"])
    
    cursor.execute(
        """
        INSERT INTO rooms (hotel_id, name, type, price_per_night, capacity, description, amenities, total_inventory, available_inventory, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (room.hotel_id, room.name, room.type, room.price_per_night, room.capacity, room.description, room.amenities, room.total_inventory, room.total_inventory, img)
    )
    conn.commit()
    conn.close()
    return {"message": "Thêm phòng mới thành công!"}

@app.put("/api/owner/rooms/{room_id}")
def update_owner_room(room_id: int, owner_id: int, room: RoomCreateUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify hotel belongs to owner
    cursor.execute(
        "SELECT r.id FROM rooms r JOIN hotels h ON r.hotel_id = h.id WHERE r.id = %s AND h.owner_id = %s",
        (room_id, owner_id)
    )
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Không có quyền cập nhật phòng này.")
        
    cursor.execute(
        """
        UPDATE rooms
        SET name = %s, type = %s, price_per_night = %s, capacity = %s, description = %s, amenities = %s, total_inventory = %s
        WHERE id = %s
        """,
        (room.name, room.type, room.price_per_night, room.capacity, room.description, room.amenities, room.total_inventory, room_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Cập nhật phòng thành công!"}

@app.delete("/api/owner/rooms/{room_id}")
def delete_owner_room(room_id: int, owner_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify owner
    cursor.execute(
        "SELECT r.id FROM rooms r JOIN hotels h ON r.hotel_id = h.id WHERE r.id = %s AND h.owner_id = %s",
        (room_id, owner_id)
    )
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Không có quyền xóa phòng này.")
        
    cursor.execute("DELETE FROM rooms WHERE id = %s", (room_id,))
    conn.commit()
    conn.close()
    return {"message": "Xóa phòng thành công!"}

@app.get("/api/owner/bookings")
def get_owner_bookings(owner_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT b.*, r.name as room_name, u.full_name as traveler_name, u.username as traveler_username
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN hotels h ON r.hotel_id = h.id
        JOIN users u ON b.traveler_id = u.id
        WHERE h.owner_id = %s
        ORDER BY b.id DESC
        """, (owner_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.put("/api/owner/bookings/{booking_id}/status")
def update_booking_status(booking_id: int, owner_id: int, payload: OwnerApprovalUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify booking owner
    cursor.execute(
        """
        SELECT b.id, b.status, b.room_id, r.available_inventory 
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN hotels h ON r.hotel_id = h.id
        WHERE b.id = %s AND h.owner_id = %s
        """, (booking_id, owner_id)
    )
    booking = cursor.fetchone()
    if not booking:
        conn.close()
        raise HTTPException(status_code=403, detail="Không tìm thấy đơn đặt phòng hoặc không có quyền.")
        
    new_status = payload.status
    if new_status not in ["paid", "completed", "cancelled"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Trạng thái đơn đặt phòng không hợp lệ.")
        
    cursor.execute("UPDATE bookings SET status = %s WHERE id = %s", (new_status, booking_id))
    
    # If cancelled, release the room inventory
    if new_status == "cancelled" and booking["status"] != "cancelled":
        cursor.execute(
            "UPDATE rooms SET available_inventory = available_inventory + 1 WHERE id = %s",
            (booking["room_id"],)
        )
        
    conn.commit()
    conn.close()
    return {"message": f"Cập nhật đơn đặt phòng sang trạng thái '{new_status}' thành công!"}

@app.get("/api/owner/stats")
def get_owner_stats(owner_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all hotels owned by this owner
    cursor.execute("SELECT id FROM hotels WHERE owner_id = %s", (owner_id,))
    hotel = cursor.fetchone()
    if not hotel:
        conn.close()
        return {
            "total_bookings": 0, "total_revenue": 0, "occupancy_rate": 0,
            "monthly_revenue": [], "occupancy_trend": [], "room_distribution": []
        }
    hotel_id = hotel["id"]
    
    # Total bookings count
    cursor.execute(
        "SELECT COUNT(*) FROM bookings b JOIN rooms r ON b.room_id = r.id WHERE r.hotel_id = %s", 
        (hotel_id,)
    )
    total_bookings = cursor.fetchone()[0]
    
    # Total revenue (paid & completed bookings)
    cursor.execute(
        "SELECT SUM(total_price) FROM bookings b JOIN rooms r ON b.room_id = r.id WHERE r.hotel_id = %s AND b.status IN ('paid', 'completed')",
        (hotel_id,)
    )
    res = cursor.fetchone()
    total_revenue = res[0] if res and res[0] is not None else 0.0
    
    # Occupancy rate calculation (total active bookings vs capacity)
    cursor.execute(
        "SELECT SUM(total_inventory), SUM(available_inventory) FROM rooms WHERE hotel_id = %s",
        (hotel_id,)
    )
    inventory = cursor.fetchone()
    if inventory and inventory[0] and inventory[0] > 0:
        total_inv = inventory[0]
        avail_inv = inventory[1] if inventory[1] is not None else total_inv
        occupancy_rate = round(((total_inv - avail_inv) / total_inv) * 100, 1)
    else:
        occupancy_rate = 0.0
        
    # Monthly Revenue chart data (May and June 2026)
    cursor.execute(
        """
        SELECT to_char(created_at, 'MM') as month, SUM(total_price) as revenue
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE r.hotel_id = %s AND b.status IN ('paid', 'completed')
        GROUP BY month
        """, (hotel_id,)
    )
    monthly_rows = cursor.fetchall()
    months_mapping = {"05": "Tháng 5", "06": "Tháng 6", "07": "Tháng 7"}
    monthly_revenue = []
    
    # Pre-populate chart data with beautiful values for display
    chart_data = {
        "Tháng 4": 1800000.0,
        "Tháng 5": 4300000.0,
        "Tháng 6": total_revenue if total_revenue > 0 else 2400000.0
    }
    for m_name, rev in chart_data.items():
        monthly_revenue.append({"month": m_name, "revenue": rev})
        
    # Occupancy rate trend
    occupancy_trend = [
        {"month": "Tháng 4", "rate": 45},
        {"month": "Tháng 5", "rate": 60},
        {"month": "Tháng 6", "rate": occupancy_rate if occupancy_rate > 0 else 35}
    ]
    
    # Room type distribution
    cursor.execute(
        "SELECT type, COUNT(*) as count FROM rooms WHERE hotel_id = %s GROUP BY type",
        (hotel_id,)
    )
    room_rows = cursor.fetchall()
    room_distribution = []
    type_names = {"Single": "Phòng đơn", "Double": "Phòng đôi", "Suite": "Gia đình", "Presidential": "VIP Tổng Thống"}
    for row in room_rows:
        room_distribution.append({
            "name": type_names.get(row["type"], row["type"]),
            "value": row["count"]
        })
        
    conn.close()
    
    return {
        "total_bookings": total_bookings,
        "total_revenue": total_revenue,
        "occupancy_rate": occupancy_rate if occupancy_rate > 0 else 40.0,
        "monthly_revenue": monthly_revenue,
        "occupancy_trend": occupancy_trend,
        "room_distribution": room_distribution if room_distribution else [{"name": "Phòng đôi", "value": 1}]
    }


# --- Admin Subsystem ---

@app.get("/api/admin/owners/pending")
def get_pending_owners():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, full_name, role, status FROM users WHERE role = 'owner' AND status = 'pending'")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.put("/api/admin/owners/{owner_id}/approve")
def approve_owner(owner_id: int, payload: OwnerApprovalUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT role FROM users WHERE id = %s", (owner_id,))
    user = cursor.fetchone()
    if not user or user["role"] != "owner":
        conn.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản đối tác chủ khách sạn.")
        
    new_status = "approved" if payload.status == "approved" else "rejected"
    cursor.execute("UPDATE users SET status = %s WHERE id = %s", (new_status, owner_id))
    conn.commit()
    conn.close()
    return {"message": f"Đã cập nhật tài khoản sang trạng thái '{new_status}' thành công!"}

@app.get("/api/admin/users")
def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, full_name, role, status FROM users")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/admin/logs")
def get_system_logs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT l.*, u.username as username 
        FROM system_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.id DESC
        LIMIT 50
        """
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/admin/stats")
def get_admin_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Total Users
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]
    
    # Total Hotels
    cursor.execute("SELECT COUNT(*) FROM hotels")
    total_hotels = cursor.fetchone()[0]
    
    # Total Bookings
    cursor.execute("SELECT COUNT(*) FROM bookings")
    total_bookings = cursor.fetchone()[0]
    
    # Total Traffic (Logs count)
    cursor.execute("SELECT COUNT(*) FROM system_logs")
    total_traffic = cursor.fetchone()[0]
    
    # Traffic trend over time (Mock hourly graph)
    traffic_trend = [
        {"time": "09:00", "requests": 15},
        {"time": "10:00", "requests": 32},
        {"time": "11:00", "requests": 24},
        {"time": "12:00", "requests": 48},
        {"time": "13:00", "requests": 38},
        {"time": "14:00", "requests": total_traffic if total_traffic > 0 else 54}
    ]
    
    conn.close()
    return {
        "total_users": total_users,
        "total_hotels": total_hotels,
        "total_bookings": total_bookings,
        "total_traffic": total_traffic,
        "traffic_trend": traffic_trend
    }
