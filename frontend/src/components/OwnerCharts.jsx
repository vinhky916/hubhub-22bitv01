import React from 'react';
import { DollarSign, Percent, TrendingUp, BarChart3 } from 'lucide-react';

export default function OwnerCharts({ stats }) {
  const { total_bookings, total_revenue, occupancy_rate, monthly_revenue, occupancy_trend, room_distribution } = stats;

  // Render SVG Revenue Bar Chart
  const renderRevenueChart = () => {
    if (!monthly_revenue || monthly_revenue.length === 0) return null;
    
    const maxVal = Math.max(...monthly_revenue.map(d => d.revenue), 1000000);
    const chartHeight = 160;
    const chartWidth = 320;
    const padding = 30;
    
    // Draw 3 bars
    const barWidth = 45;
    const spacing = 50;
    
    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="svg-chart">
        {/* Grid Lines */}
        <line x1={padding} y1={20} x2={chartWidth - 10} y2={20} stroke="rgba(15,23,42,0.06)" strokeDasharray="4 4" />
        <line x1={padding} y1={chartHeight / 2} x2={chartWidth - 10} y2={chartHeight / 2} stroke="rgba(15,23,42,0.06)" strokeDasharray="4 4" />
        <line x1={padding} y1={chartHeight - 30} x2={chartWidth - 10} y2={chartHeight - 30} stroke="rgba(15,23,42,0.15)" />

        {monthly_revenue.map((d, index) => {
          const barHeight = (d.revenue / maxVal) * (chartHeight - 60);
          const x = padding + 20 + index * (barWidth + spacing);
          const y = chartHeight - 30 - barHeight;
          
          return (
            <g key={index} className="chart-bar-group">
              {/* Bar shadow/glow on hover */}
              <rect 
                x={x} 
                y={y} 
                width={barWidth} 
                height={barHeight} 
                rx={6} 
                fill="url(#revenueGrad)"
                className="chart-bar"
              />
              {/* Tooltip or Label on top of Bar */}
              <text 
                x={x + barWidth / 2} 
                y={y - 8} 
                textAnchor="middle" 
                fill="#3b82f6" 
                fontSize={10} 
                fontWeight="bold"
              >
                {(d.revenue / 1000000).toFixed(1)}M
              </text>
              {/* X Axis Label */}
              <text 
                x={x + barWidth / 2} 
                y={chartHeight - 10} 
                textAnchor="middle" 
                fill="#64748b" 
                fontSize={11}
              >
                {d.month}
              </text>
            </g>
          );
        })}

        {/* Gradients */}
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5392f9" />
            <stop offset="100%" stopColor="#5392f9" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  // Render SVG Donut Occupancy Gauge
  const renderOccupancyGauge = () => {
    const radius = 50;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (occupancy_rate / 100) * circumference;

    return (
      <div className="gauge-chart-wrapper">
        <svg width="130" height="130" viewBox="0 0 120 120" className="gauge-svg">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Filled indicator circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            className="gauge-progress-circle"
          />
          {/* Central label */}
          <text x="60" y="66" textAnchor="middle" fill="#0f172a" fontSize="18" fontWeight="bold">
            {occupancy_rate}%
          </text>
          
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="gauge-caption">Công suất phòng</div>
      </div>
    );
  };

  return (
    <div className="owner-stats-container">
      {/* 3 Overview Cards */}
      <div className="stats-overview-grid">
        <div className="stat-card glass-card">
          <div className="stat-card-icon bg-blue-trans">
            <BarChart3 className="text-blue" size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-label">Tổng lượt đặt phòng</span>
            <h3>{total_bookings} lượt</h3>
            <span className="stat-trend positive">+12% tháng này</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-card-icon bg-emerald-trans">
            <DollarSign className="text-emerald" size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-label">Doanh thu thực tế</span>
            <h3>{total_revenue.toLocaleString('vi-VN')} VNĐ</h3>
            <span className="stat-trend positive">+18% tháng này</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-card-icon bg-purple-trans">
            <Percent className="text-purple" size={22} />
          </div>
          <div className="stat-card-info">
            <span className="stat-label">Hiệu suất lấp đầy</span>
            <h3>{occupancy_rate}%</h3>
            <span className="stat-trend positive">+5.4% tuần này</span>
          </div>
        </div>
      </div>

      {/* SVG Charts Section */}
      <div className="charts-main-grid">
        {/* Revenue Line/Bar */}
        <div className="chart-box-card glass-card">
          <div className="chart-card-header">
            <h4>Xu hướng Doanh thu</h4>
            <span className="chart-sub">(Đơn vị: Triệu VNĐ)</span>
          </div>
          <div className="chart-viewport">
            {renderRevenueChart()}
          </div>
        </div>

        {/* Occupancy Donut */}
        <div className="chart-box-card glass-card flex-center">
          <div className="chart-card-header text-center w-full">
            <h4>Hiệu suất Lấp đầy Phòng</h4>
          </div>
          <div className="chart-viewport flex-center">
            {renderOccupancyGauge()}
          </div>
        </div>

        {/* Room Type Distribution */}
        <div className="chart-box-card glass-card">
          <div className="chart-card-header">
            <h4>Phân bố phòng đang chạy</h4>
          </div>
          <div className="chart-viewport distribution-list-viewport">
            <div className="distribution-list">
              {room_distribution.map((item, idx) => (
                <div key={idx} className="dist-item">
                  <div className="dist-label-row">
                    <span className="dist-name">{item.name}</span>
                    <span className="dist-count">{item.value} phòng</span>
                  </div>
                  <div className="dist-progress-bar">
                    <div 
                      className={`dist-fill color-${idx % 3}`} 
                      style={{ width: `${Math.min((item.value / 15) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
