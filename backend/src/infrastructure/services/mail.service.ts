import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import QRCode from 'qrcode';

export class MailService {
  private transporter: nodemailer.Transporter;
  private resend: Resend | null = null;

  constructor() {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && resendApiKey.trim() !== '') {
      this.resend = new Resend(resendApiKey.trim());
      console.log('[MailService] Resend API initialized successfully.');
    } else {
      console.log('[MailService] RESEND_API_KEY not found or empty. Falling back to SMTP Transporter.');
    }

    const isEthereal = process.env.EMAIL_USER === 'placeholder@ethereal.email' || !process.env.EMAIL_USER;
    
    if (isEthereal) {
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
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }
  }

  private getFromEmail(defaultLabel = 'Cloud Booking Support'): string {
    if (this.resend) {
      return process.env.RESEND_FROM_EMAIL || 'Cloud Booking <onboarding@resend.dev>';
    }
    return `"${defaultLabel}" <${process.env.EMAIL_FROM || 'no-reply@cloudbooking.com'}>`;
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

    try {
      if (this.resend) {
        const res = await this.resend.emails.send({ from, to: [to], subject, html });
        console.log(`[MailService via Resend]: OTP sent to ${to}. ID: ${res.data?.id}`);
      } else {
        const info = await this.transporter.sendMail({ from, to, subject, html });
        console.log(`[MailService via SMTP]: OTP sent to ${to}. MessageId: ${info.messageId}`);
      }
    } catch (error) {
      console.error('[MailService Error]: Failed to send OTP:', error);
      throw error;
    }
  }

  public async sendResetPassword(to: string, token: string, name: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const from = this.getFromEmail('Cloud Booking Support');
    const subject = 'Yêu Cầu Khôi Phục Mật Khẩu - Cloud Booking Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f8fafc;">
        <h2 style="color: #2563eb; text-align: center;">Khôi phục mật khẩu</h2>
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>Bạn đã gửi yêu cầu khôi phục mật khẩu. Vui lòng nhấp vào liên kết bên dưới để tiến hành đổi mật khẩu mới:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Khôi phục mật khẩu</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Lưu ý: Đường dẫn này có hiệu lực trong vòng 15 phút. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2026 Cloud Booking Platform. All rights reserved.</p>
      </div>
    `;

    try {
      if (this.resend) {
        const res = await this.resend.emails.send({ from, to: [to], subject, html });
        console.log(`[MailService via Resend]: Reset token sent to ${to}. ID: ${res.data?.id}`);
      } else {
        const info = await this.transporter.sendMail({ from, to, subject, html });
        console.log(`[MailService via SMTP]: Reset token sent to ${to}. MessageId: ${info.messageId}`);
      }
    } catch (error) {
      console.error('[MailService Error]: Failed to send reset password email:', error);
      throw error;
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
    const qrBase64 = qrBuffer.toString('base64');
    const qrDataUrl = `data:image/png;base64,${qrBase64}`;

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
          <img src="${qrDataUrl}" alt="QR Code Check-in" style="width: 180px; height: 180px; display: inline-block; background-color: white; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px;" />
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center;">Nếu cần hỗ trợ gấp hoặc hủy phòng theo quy định, vui lòng truy cập trang cá nhân hoặc liên hệ Hotline: 1900-xxxx.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;"/>
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">© 2026 CloudBooking.AI. Bảo lưu mọi quyền.</p>
      </div>
    `;

    try {
      if (this.resend) {
        const res = await this.resend.emails.send({
          from,
          to: [params.email],
          subject,
          html,
          attachments: [
            {
              filename: 'qrcode.png',
              content: qrBuffer,
            }
          ]
        });
        console.log(`[MailService via Resend]: Ticket email sent to ${params.email}. ID: ${res.data?.id}`);
      } else {
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
        console.log(`[MailService via SMTP]: Ticket email sent to ${params.email}. MessageId: ${info.messageId}`);
      }
    } catch (error) {
      console.error('[MailService Error]: Failed to send booking confirmation email:', error);
      throw error;
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
      if (this.resend) {
        const res = await this.resend.emails.send({ from, to: [params.email], subject, html });
        console.log(`[MailService via Resend]: Status update email sent to ${params.email}. ID: ${res.data?.id}`);
      } else {
        const info = await this.transporter.sendMail({ from, to: params.email, subject, html });
        console.log(`[MailService via SMTP]: Status update email sent to ${params.email}. MessageId: ${info.messageId}`);
      }
    } catch (error) {
      console.error('[MailService Error]: Failed to send status update email:', error);
    }
  }
}

export default new MailService();
