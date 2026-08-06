import prisma from '../../config/database';

export class LocationResolverService {
  public removeAccents(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  private synonymMap: Record<string, string> = {
    'tphcm': 'Thành phố Hồ Chí Minh',
    'hcm': 'Thành phố Hồ Chí Minh',
    'sai gon': 'Thành phố Hồ Chí Minh',
    'saigon': 'Thành phố Hồ Chí Minh',
    'tp ho chi minh': 'Thành phố Hồ Chí Minh',
    'ho chi minh': 'Thành phố Hồ Chí Minh',
    'hn': 'Thành phố Hà Nội',
    'ha noi': 'Thành phố Hà Nội',
    'hanoi': 'Thành phố Hà Nội',
    'tp ha noi': 'Thành phố Hà Nội',
    'dn': 'Đà Nẵng',
    'da nang': 'Đà Nẵng',
    'danang': 'Đà Nẵng',
    'dalat': 'Đà Lạt',
    'da lat': 'Đà Lạt',
    'nha trang': 'Nha Trang',
    'nhatrang': 'Nha Trang',
    'phu quoc': 'Phú Quốc',
    'phuquoc': 'Phú Quốc',
    'ca mau': 'Cà Mau',
    'camau': 'Cà Mau',
    'vung tau': 'Bà Rịa - Vũng Tàu',
    'vungtau': 'Bà Rịa - Vũng Tàu',
    'phan thiet': 'Bình Thuận',
    'phanthiet': 'Bình Thuận',
    'mui ne': 'Bình Thuận',
    'sapa': 'Lào Cai',
    'sa pa': 'Lào Cai',
    'hue': 'Thừa Thiên Huế'
  };

  /**
   * Giải mã địa điểm từ chuỗi bất kỳ của người dùng sang tên Tỉnh/Thành chuẩn trong DB
   */
  public async resolveLocation(rawCity: string | null): Promise<{ officialName: string | null; provinceId?: string; districtId?: string }> {
    if (!rawCity || !rawCity.trim()) {
      return { officialName: null };
    }

    const cleanInput = this.removeAccents(rawCity);
    const searchKeyword = this.synonymMap[cleanInput] || rawCity;
    const cleanKeyword = this.removeAccents(searchKeyword);

    // 1. Tìm Province (Tỉnh/Thành) trước
    const province = await prisma.province.findFirst({
      where: {
        name: { contains: searchKeyword, mode: 'insensitive' }
      }
    });

    if (province) {
      return { officialName: province.name, provinceId: province.id };
    }

    // 2. Tìm District (Quận/Huyện/Thành phố thuộc tỉnh, ví dụ: "Thành phố Đà Lạt")
    const district = await prisma.district.findFirst({
      where: {
        name: { contains: searchKeyword, mode: 'insensitive' }
      }
    });

    if (district) {
      return { officialName: district.name, districtId: district.id, provinceId: district.provinceId };
    }

    // 3. Nếu không tìm thấy bằng query trực tiếp, duyệt toàn bộ danh sách bằng removeAccents
    const allProvinces = await prisma.province.findMany();
    for (const p of allProvinces) {
      const pClean = this.removeAccents(p.name);
      if (pClean.includes(cleanKeyword) || cleanKeyword.includes(pClean)) {
        return { officialName: p.name, provinceId: p.id };
      }
    }

    const allDistricts = await prisma.district.findMany(); // Lấy toàn bộ danh sách (không bị giới hạn take:200)
    for (const d of allDistricts) {
      const dClean = this.removeAccents(d.name);
      if (dClean.includes(cleanKeyword) || cleanKeyword.includes(dClean)) {
        return { officialName: d.name, districtId: d.id, provinceId: d.provinceId };
      }
    }

    return { officialName: rawCity };
  }
}

export default new LocationResolverService();
