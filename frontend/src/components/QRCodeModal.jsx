import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, Landmark, CreditCard, Copy, Check } from 'lucide-react';

export default function QRCodeModal({ booking, onClose, onPaymentSuccess }) {
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, success, loading
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const copyToClipboard = (text, setCopied) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async () => {
    setPaymentStatus('loading');
    setErrorMessage('');
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/simulate-payment/${booking.id}`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Không thể cập nhật thanh toán trên hệ thống.');
      }
      
      const data = await response.json();
      if (data.status === 'paid') {
        setPaymentStatus('success');
        setTimeout(() => {
          onPaymentSuccess();
          onClose();
        }, 2500); // Wait 2.5 seconds to show success state with animation
      } else {
        throw new Error('Trạng thái giao dịch không hợp lệ.');
      }
    } catch (error) {
      setPaymentStatus('pending');
      setErrorMessage(error.message || 'Lỗi giả lập thanh toán.');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card-heavy qr-modal">
        {/* Header */}
        <div className="modal-header">
          <h3>Thanh toán qua mã VietQR Động</h3>
          <button className="modal-close-btn" onClick={onClose} disabled={paymentStatus === 'loading'}>
            <X size={20} />
          </button>
        </div>

        {paymentStatus === 'success' ? (
          /* Payment Success State */
          <div className="payment-success-screen animate-fade-in">
            <div className="success-icon-wrapper">
              <CheckCircle2 className="success-icon" size={72} />
            </div>
            <h2>Thanh toán thành công!</h2>
            <p>Hệ thống HubHub đã nhận được giao dịch của bạn.</p>
            <div className="booking-details-receipt">
              <div className="receipt-row">
                <span>Khách sạn:</span>
                <strong>{booking.hotel_name}</strong>
              </div>
              <div className="receipt-row">
                <span>Phòng:</span>
                <strong>{booking.room_name}</strong>
              </div>
              <div className="receipt-row">
                <span>Tổng tiền:</span>
                <strong className="text-emerald">{booking.total_price.toLocaleString('vi-VN')} VNĐ</strong>
              </div>
            </div>
            <p className="redirect-note">Trang sẽ tự động cập nhật trong giây lát...</p>
          </div>
        ) : (
          /* QR Code Payment Info */
          <div className="modal-body qr-grid">
            {/* QR Code Column */}
            <div className="qr-image-section">
              <div className="qr-container-box">
                {booking.qr_code_url ? (
                  <img src={booking.qr_code_url} alt="VietQR Code" className="vietqr-image" />
                ) : (
                  <div className="qr-placeholder">Đang tải mã QR...</div>
                )}
                {/* Overlay countdown when expired */}
                {timeLeft === 0 && (
                  <div className="qr-expired-overlay">
                    <span>Mã QR đã hết hạn</span>
                    <button className="refresh-btn" onClick={() => setTimeLeft(300)}>Tạo mã mới</button>
                  </div>
                )}
              </div>
              
              <div className="countdown-timer text-blue">
                <Clock size={16} />
                <span>Mã QR hết hạn sau: <strong>{formatTime(timeLeft)}</strong></span>
              </div>
            </div>

            {/* Instruction Column */}
            <div className="payment-instructions">
              <div className="instruction-header">
                <Landmark size={18} className="text-blue" />
                <h4>Thông tin tài khoản nhận</h4>
              </div>

              <div className="transfer-details-box">
                <div className="detail-item">
                  <span className="label">Ngân hàng nhận:</span>
                  <span className="value">MBBank (Ngân hàng Quân Đội)</span>
                </div>
                <div className="detail-item">
                  <span className="label">Số tài khoản:</span>
                  <span className="value font-mono">123456789</span>
                </div>
                <div className="detail-item">
                  <span className="label">Chủ tài khoản:</span>
                  <span className="value">KHACH SAN OASIS</span>
                </div>
                
                <hr className="divider" />

                <div className="detail-item copyable">
                  <span className="label">Số tiền chuyển khoản:</span>
                  <div className="copy-row">
                    <span className="value text-blue">{booking.total_price.toLocaleString('vi-VN')} đ</span>
                    <button onClick={() => copyToClipboard(String(booking.total_price), setCopiedAmount)}>
                      {copiedAmount ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="detail-item copyable">
                  <span className="label">Nội dung chuyển khoản:</span>
                  <div className="copy-row">
                    <span className="value font-mono text-emerald">HubHubBK{booking.id}</span>
                    <button onClick={() => copyToClipboard(`HubHubBK${booking.id}`, setCopiedContent)}>
                      {copiedContent ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="attention-card warning">
                <p><strong>Lưu ý:</strong> Vui lòng quét mã QR hoặc nhập chính xác <strong>Số tiền</strong> và <strong>Nội dung</strong> như trên để hệ thống tự động nhận diện và hoàn tất giao dịch lập tức.</p>
              </div>

              {errorMessage && <div className="error-message">{errorMessage}</div>}

              {/* Payment simulation trigger */}
              <button 
                className="simulate-payment-btn" 
                onClick={handleSimulatePayment}
                disabled={paymentStatus === 'loading' || timeLeft === 0}
              >
                {paymentStatus === 'loading' ? 'Đang xử lý...' : 'Giả lập: Đã chuyển tiền thành công'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
