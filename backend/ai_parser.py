import re
from datetime import datetime, timedelta

def parse_natural_language_query(query: str):
    query_lower = query.lower()
    
    # 1. Extract City
    city = None
    cities = ["Vũng Tàu", "Đà Nẵng", "Nha Trang", "Đà Lạt"]
    for c in cities:
        if c.lower() in query_lower:
            city = c
            break
            
    # 2. Extract Max Price
    max_price = None
    # Matches patterns like: dưới 1.5 triệu, dưới 1.5tr, < 1.5tr, tầm 1 triệu, dưới 800k, dưới 1.500.000, giá dưới 1.5tr
    price_match = re.search(r'(?:giá\s+dưới|dưới\s+giá|dưới|tầm|khoảng|giá|<|nhỏ hơn|tối đa)\s*([\d\.,]+)\s*(triệu|tr|k|ngàn|đ)?', query_lower)
    if price_match:
        val_str = price_match.group(1).replace(' ', '').replace(',', '.')
        try:
            val = float(val_str)
            unit = price_match.group(2)
            if unit in ['triệu', 'tr']:
                max_price = val * 1000000
            elif unit in ['k', 'ngàn']:
                max_price = val * 1000
            else:
                # If no unit, check if it's a small number like 1.5 or 2 (meaning millions) or large like 1500000
                if val < 50:
                    max_price = val * 1000000
                else:
                    max_price = val
        except ValueError:
            pass

    # 3. Extract Room Type / Capacity
    room_type = None
    capacity = None
    if any(k in query_lower for k in ["đơn", "single", "1 người", "1 giường"]):
        room_type = "Single"
        capacity = 1
    elif any(k in query_lower for k in ["đôi", "double", "2 người", "2 giường", "cặp đôi", "couple"]):
        room_type = "Double"
        capacity = 2
    elif any(k in query_lower for k in ["gia đình", "family", "nhiều người", "nhóm"]):
        room_type = "Suite"
        capacity = 4
    elif any(k in query_lower for k in ["tổng thống", "presidential", "vip", "thượng hạng"]):
        room_type = "Presidential"
        capacity = 4

    # 4. Extract Amenities
    amenities = []
    amenity_keywords = {
        "sát biển": ["sát biển", "gần biển", "hướng biển", "view biển", "bãi biển", "bãi sau", "bãi trước"],
        "hồ bơi": ["hồ bơi", "bể bơi", "pool"],
        "lò sưởi": ["lò sưởi", "sưởi", "ấm"],
        "ban công": ["ban công", "balcony", "hướng gió"],
        "bếp nấu": ["bếp", "nấu ăn", "nấu nướng"],
        "nướng BBQ": ["bbq", "nướng"],
        "sân vườn": ["sân vườn", "vườn", "garden"],
        "bồn tắm": ["bồn tắm", "bath", "tub"],
        "view sông": ["view sông", "sông hàn", "bờ sông", "cầu rồng"]
    }
    for tag, keywords in amenity_keywords.items():
        if any(kw in query_lower for kw in keywords):
            amenities.append(tag)

    # 5. Extract and Calculate Dates
    # Current local time in metadata is 2026-06-12 (which is a Friday)
    now = datetime(2026, 6, 12)
    check_in = now
    check_out = now + timedelta(days=1)
    date_description = "hôm nay (12/06 đến 13/06)"

    if "cuối tuần này" in query_lower:
        # Friday (June 12) to Sunday (June 14)
        check_in = datetime(2026, 6, 12)
        check_out = datetime(2026, 6, 14)
        date_description = "cuối tuần này (Thứ Sáu 12/06 đến Chủ Nhật 14/06)"
    elif "ngày mai" in query_lower:
        check_in = now + timedelta(days=1)
        check_out = now + timedelta(days=2)
        date_description = f"ngày mai (Thứ Bảy {check_in.strftime('%d/%m')} đến {check_out.strftime('%d/%m')})"
    elif "tuần sau" in query_lower:
        # Next Friday (June 19) to Sunday (June 21)
        check_in = datetime(2026, 6, 19)
        check_out = datetime(2026, 6, 21)
        date_description = "cuối tuần sau (Thứ Sáu 19/06 đến Chủ Nhật 21/06)"
    elif "hôm nay" in query_lower:
        check_in = now
        check_out = now + timedelta(days=1)
        date_description = f"hôm nay ({check_in.strftime('%d/%m')})"
    else:
        # Default next 2 nights starting today
        check_in = now
        check_out = now + timedelta(days=2)
        date_description = f"2 đêm từ {check_in.strftime('%d/%m')} đến {check_out.strftime('%d/%m')}"

    # Build friendly explanation of understanding
    summary_parts = []
    if city:
        summary_parts.append(f"khu vực **{city}**")
    if max_price:
        summary_parts.append(f"mức giá dưới **{max_price:,.0f} VNĐ**")
    if room_type:
        room_types_vi = {
            "Single": "phòng đơn",
            "Double": "phòng đôi",
            "Suite": "phòng gia đình",
            "Presidential": "phòng tổng thống"
        }
        summary_parts.append(f"loại **{room_types_vi[room_type]}**")
    if amenities:
        summary_parts.append(f"tiện ích: **{', '.join(amenities)}**")
    
    summary_parts.append(f"thời gian **{date_description}**")

    explanation = "Chào bạn! Tôi đã phân tích câu lệnh và đang tìm kiếm các phòng phù hợp tại " + ", ".join(summary_parts) + "."

    return {
        "city": city,
        "max_price": max_price,
        "room_type": room_type,
        "capacity": capacity,
        "amenities": amenities,
        "check_in": check_in.strftime("%Y-%m-%d"),
        "check_out": check_out.strftime("%Y-%m-%d"),
        "date_description": date_description,
        "explanation": explanation
    }

if __name__ == "__main__":
    # Test cases
    test_queries = [
        "Tìm phòng sát biển ở Vũng Tàu giá dưới 1.5 triệu cho cuối tuần này",
        "khách sạn ở Đà Lạt có lò sưởi dưới 2 triệu ngày mai",
        "phòng đôi ở Đà Nẵng view sông dưới 2.5tr"
    ]
    for q in test_queries:
        print(f"Query: {q}")
        print(parse_natural_language_query(q))
        print("-" * 50)
