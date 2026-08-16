import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const isPlaceholder = !process.env.EMAIL_USER || process.env.EMAIL_USER.includes('placeholder');
    
    if (isPlaceholder) {
      console.log('[MailService] EMAIL_USER chưa được cấu hình hoặc là placeholder. Sử dụng Ethereal SMTP làm giả lập thử nghiệm.');
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'myles.pouros65@ethereal.email',
          pass: 'rV6K1GqK7dCY7FzGk2'
        }
      });
    } else {
      let host = process.env.EMAIL_HOST || 'smtp.gmail.com';
      // Nếu EMAIL_HOST nạp nhầm 'smtp.ethereal.email' nhưng EMAIL_USER là email thật (vd: @nttu.edu.vn hay @gmail.com) -> Auto sửa sang 'smtp.gmail.com'
      if (host === 'smtp.ethereal.email' && process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('ethereal')) {
        host = 'smtp.gmail.com';
      }

      const port = parseInt(process.env.EMAIL_PORT || '587');
      const secure = port === 465;

      console.log(`[MailService] Khởi tạo Nodemailer SMTP Transporter: ${host}:${port} (${process.env.EMAIL_USER})`);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }
  }

  private getFromEmail(defaultLabel = 'Cloud Booking Support'): string {
    if (process.env.EMAIL_USER && process.env.EMAIL_USER.trim() !== '' && !process.env.EMAIL_USER.includes('placeholder')) {
      // Khi dùng Gmail/Google Workspace SMTP, từ địa chỉ gửi phải trùng khớp với tài khoản xác thực
      if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.includes(process.env.EMAIL_USER)) {
        return process.env.EMAIL_FROM.trim();
      }
      return `"${defaultLabel}" <${process.env.EMAIL_USER.trim()}>`;
    }
    if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim() !== '') {
      return process.env.EMAIL_FROM.trim();
    }
    return `"${defaultLabel}" <no-reply@cloudbooking.com>`;
  }

  private formatDateVN(dateInput: Date | string): string {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    return date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  }

  public async sendOTP(to: string, otp: string, name: string): Promise<void> {
    const from = this.getFromEmail('Cloud Booking Support');
    const subject = 'Xác Thực Email Của Bạn - Cloud Booking Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f8fafc;">
        <h2 style="color: #2563eb; text-align: center;">Chào mừng bạn đến với Cloud Booking!</h2>
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản trên nền tảng của chúng tôi. Để hoàn tất đăng ký, vui lòng sử dụng mã OTP dưới đây để xác thực tài khoản email của bạn:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; background-color: #eff6ff; padding: 10px 30px; border-radius: 8px; border: 1px dashed #bfdbfe;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">Lưu ý: Mã OTP này có hiệu lực trong vòng 10 phút. Không chia sẻ mã này cho bất kỳ ai.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Đây là email tự động, vui lòng không phản hồi email này.</p>
      </div>
    `;

    // In mã OTP ra Console log của Server để hỗ trợ thử nghiệm trực tiếp
    console.log('\n==================================================');
    console.log(`🔑 [DEV / SERVER LOG] MÃ OTP XÁC THỰC DÀNH CHO EMAIL: ${to}`);
    console.log(`👉  MÃ OTP XÁC THỰC:  [ ${otp} ]  👈`);
    console.log('==================================================\n');

    try {
      const info = await this.transporter.sendMail({ from, to, subject, html });
      console.log(`[MailService via Nodemailer]: Gửi OTP thành công tới ${to}. MessageId: ${info.messageId}`);
    } catch (error: any) {
      console.error(`[MailService via Nodemailer Error] Lỗi gửi OTP đến ${to}:`, error?.message || error);
    }
  }

  public async sendResetPassword(to: string, otp: string, name: string): Promise<void> {
    const from = this.getFromEmail('Cloud Booking Support');
    const subject = 'Mã OTP Khôi Phục Mật Khẩu - Cloud Booking Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f8fafc;">
        <h2 style="color: #2563eb; text-align: center;">Khôi Phục Mật Khẩu</h2>
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>Bạn đã gửi yêu cầu khôi phục mật khẩu. Dưới đây là mã OTP 6 chữ số để xác thực đặt lại mật khẩu mới:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; background-color: #eff6ff; padding: 10px 30px; border-radius: 8px; border: 1px dashed #bfdbfe;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">Lưu ý: Mã OTP này có hiệu lực trong vòng 15 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2026 Cloud Booking Platform. All rights reserved.</p>
      </div>
    `;

    console.log('\n==================================================');
    console.log(`🔑 [DEV / SERVER LOG] MÃ OTP RESET MẬT KHẨU DÀNH CHO EMAIL: ${to}`);
    console.log(`👉  MÃ OTP KHÔI PHỤC:  [ ${otp} ]  👈`);
    console.log('==================================================\n');

    try {
      const info = await this.transporter.sendMail({ from, to, subject, html });
      console.log(`[MailService via Nodemailer]: Gửi OTP Reset Password thành công tới ${to}. MessageId: ${info.messageId}`);
    } catch (error: any) {
      console.error(`[MailService via Nodemailer Error] Lỗi gửi OTP Reset Password đến ${to}:`, error?.message || error);
    }
  }

  public async sendBookingTicketEmail(params: {
    email: string;
    guestName: string;
    bookingId: string;
    hotelName: string;
    roomTypeName: string;
    checkInDate: Date;
    checkOutDate: Date;
    finalPrice: number;
  }): Promise<void> {
    const qrData = `booking_id:${params.bookingId}`;
    const qrBuffer = await QRCode.toBuffer(qrData, {
      type: 'png',
      width: 250,
      margin: 1,
    });

    const from = this.getFromEmail('Cloud Booking Confirmation');
    const subject = `Xác Nhận Đặt Phòng Thành Công: ${params.hotelName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 24px; font-weight: 800; color: #2563eb;">CloudBooking<span style="color: #0ea5e9;">.AI</span></span>
          <h2 style="color: #0f172a; margin-top: 10px;">Đặt Phòng Đã Được Xác Nhận!</h2>
          <p style="color: #64748b; font-size: 14px;">Mã đặt phòng: <strong>${params.bookingId.substring(0, 8).toUpperCase()}</strong></p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #1e293b; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Thông Tin Khách Sạn</h3>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Khách sạn:</strong> ${params.hotelName}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Loại phòng:</strong> ${params.roomTypeName}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Khách hàng:</strong> ${params.guestName}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Nhận phòng (Check-in):</strong> ${this.formatDateVN(params.checkInDate)} (Từ 14:00)</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Trả phòng (Check-out):</strong> ${this.formatDateVN(params.checkOutDate)} (Trước 12:00)</p>
          <p style="margin: 6px 0; font-size: 14px; color: #ef4444; font-weight: bold;"><strong>Tổng tiền đã thanh toán:</strong> ${params.finalPrice.toLocaleString('vi-VN')} đ</p>
        </div>

        <div style="text-align: center; border: 1px dashed #bfdbfe; background-color: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 8px;">VÉ ĐIỆN TỬ CHECK-IN</h4>
          <p style="color: #1e40af; font-size: 12px; margin-bottom: 12px;">Vui lòng đưa mã QR này cho nhân viên lễ tân khi nhận phòng để làm thủ tục nhanh chóng</p>
          <img src="cid:qrcode_ticket" alt="QR Code Check-in" style="width: 180px; height: 180px; display: inline-block; background-color: white; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px;" />
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center;">Nếu cần hỗ trợ gấp hoặc hủy phòng theo quy định, vui lòng truy cập trang cá nhân hoặc liên hệ Hotline: 1900-xxxx.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;"/>
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">© 2026 CloudBooking.AI. Bảo lưu mọi quyền.</p>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from,
        to: params.email,
        subject,
        html,
        attachments: [
          {
            filename: 'qrcode.png',
            content: qrBuffer,
            cid: 'qrcode_ticket',
          },
        ],
      });
      console.log(`[MailService via Nodemailer]: Gửi vé đặt phòng thành công tới ${params.email}. MessageId: ${info.messageId}`);
    } catch (smtpErr: any) {
      console.error(`[MailService via Nodemailer Error] Lỗi gửi vé đến ${params.email}:`, smtpErr?.message || smtpErr);
    }
  }

  public async sendBookingStatusUpdateEmail(params: {
    email: string;
    guestName: string;
    bookingId: string;
    hotelName: string;
    roomTypeName: string;
    status: string;
    checkInDate: Date;
    checkOutDate: Date;
    finalPrice: number;
  }): Promise<void> {
    const statusMap: Record<string, { title: string; color: string; desc: string }> = {
      CONFIRMED: {
        title: 'Đơn Đặt Phòng Đã Xác Nhận',
        color: '#16a34a',
        desc: 'Đơn đặt phòng của bạn đã được xác nhận thành công. Khách sạn sẵn sàng đón tiếp bạn!'
      },
      CHECKED_IN: {
        title: 'Đã Nhận Phòng (Check-in)',
        color: '#2563eb',
        desc: 'Bạn đã làm thủ tục nhận phòng thành công. Chúc bạn có kỳ lưu trú tuyệt vời!'
      },
      CHECKED_OUT: {
        title: 'Đã Trả Phòng (Check-out)',
        color: '#64748b',
        desc: 'Thủ tục trả phòng đã hoàn tất. Cảm ơn bạn đã lựa chọn dịch vụ của chúng tôi!'
      },
      CANCELLED: {
        title: 'Đơn Đặt Phòng Đã Hủy',
        color: '#dc2626',
        desc: 'Đơn đặt phòng của bạn đã được hủy thành công trên hệ thống.'
      }
    };

    const statusInfo = statusMap[params.status] || {
      title: `Cập Nhật Trạng Thái: ${params.status}`,
      color: '#2563eb',
      desc: `Trạng thái đơn đặt phòng của bạn đã được cập nhật sang: ${params.status}`
    };

    const from = this.getFromEmail('Cloud Booking Notification');
    const subject = `[CloudBooking] ${statusInfo.title} - #${params.bookingId.substring(0, 8).toUpperCase()}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 24px; font-weight: 800; color: #2563eb;">CloudBooking<span style="color: #0ea5e9;">.AI</span></span>
          <h2 style="color: ${statusInfo.color}; margin-top: 10px;">${statusInfo.title}</h2>
          <p style="color: #64748b; font-size: 14px;">Mã đơn phòng: <strong>#${params.bookingId.substring(0, 8).toUpperCase()}</strong></p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Xin chào <strong>${params.guestName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">${statusInfo.desc}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;"/>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Khách sạn:</strong> ${params.hotelName}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Loại phòng:</strong> ${params.roomTypeName}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Thời gian lưu trú:</strong> ${this.formatDateVN(params.checkInDate)} - ${this.formatDateVN(params.checkOutDate)}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Tổng tiền:</strong> ${params.finalPrice.toLocaleString('vi-VN')} đ</p>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center;">Nếu cần hỗ trợ, bạn có thể xem lại thông tin chi tiết trên trang cá nhân hoặc liên hệ bộ phận hỗ trợ khách hàng.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;"/>
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">© 2026 CloudBooking.AI. Bảo lưu mọi quyền.</p>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({ from, to: params.email, subject, html });
      console.log(`[MailService via Nodemailer]: Gửi mail cập nhật trạng thái thành công tới ${params.email}. MessageId: ${info.messageId}`);
    } catch (smtpErr: any) {
      console.error(`[MailService via Nodemailer Error] Lỗi gửi mail cập nhật trạng thái đến ${params.email}:`, smtpErr?.message || smtpErr);
    }
  }
}

export default new MailService();
