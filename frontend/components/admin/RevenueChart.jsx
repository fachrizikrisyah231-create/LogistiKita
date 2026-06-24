"use client";

import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { formatRupiah } from '../../lib/format';

// Color definitions matching the design system and status badges
const COLORS = {
  // Statuses
  PENDING: '#f59e0b',      // Amber
  PICKUP: '#f97316',       // Orange
  IN_TRANSIT: '#3b82f6',   // Blue
  AT_BRANCH: '#8b5cf6',    // Purple
  OUT_FOR_DELIVERY: '#06b6d4', // Cyan
  DELIVERED: '#10b981',    // Emerald
  FAILED: '#ef4444',       // Red

  // Shipping Types
  reguler: '#71717a',      // Gray
  nextday: '#2563eb',      // Blue
  sameday: '#dc2626',      // Red
  
  // Defaults
  default: ['#000000', '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
};

export default function RevenueChart({ type, data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-mute text-body-sm">
        Tidak ada data untuk ditampilkan
      </div>
    );
  }

  // ─── 1. LINE CHART (Overview: Tren Pengiriman) ──────────────────────
  if (type === 'line') {
    return (
      <ResponsiveContainer width="99%" height="100%" minHeight={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#efefef" />
          <XAxis 
            dataKey="date" 
            stroke="#5e5e5e" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(tick) => {
              try {
                const date = new Date(tick);
                return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
              } catch (e) {
                return tick;
              }
            }}
          />
          <YAxis 
            stroke="#5e5e5e" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #efefef', 
              borderRadius: '8px',
              fontFamily: 'sans-serif',
              fontSize: '13px'
            }}
            labelFormatter={(label) => {
              try {
                const date = new Date(label);
                return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
              } catch (e) {
                return label;
              }
            }}
            formatter={(value) => [value, 'Pengiriman']}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#000000" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2 }} 
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // ─── 2. DONUT / PIE CHART (Status & Tipe Pengiriman) ────────────────
  if (type === 'donut') {
    const getCellColor = (name, index) => {
      const normalized = (name || '').toLowerCase();
      // Match by normalized shipping type
      if (COLORS[normalized]) return COLORS[normalized];
      // Match by exact status key
      if (COLORS[name]) return COLORS[name];
      // Fallback to defaults
      return COLORS.default[index % COLORS.default.length];
    };

    // Calculate percentage for tooltip
    const total = data.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);

    return (
      <ResponsiveContainer width="99%" height="100%" minHeight={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getCellColor(entry.name, index)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #efefef', 
              borderRadius: '8px',
              fontFamily: 'sans-serif',
              fontSize: '13px'
            }}
            formatter={(value, name) => {
              const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return [`${value} (${percent}%)`, name];
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', marginTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // ─── 3. AREA CHART (Keuangan: Tren Pendapatan) ──────────────────────
  if (type === 'area') {
    return (
      <ResponsiveContainer width="99%" height="100%" minHeight={250}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
            </linearGradient>
            <linearGradient id="colorFee" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#efefef" />
          <XAxis 
            dataKey="date" 
            stroke="#5e5e5e" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(tick) => {
              try {
                const date = new Date(tick);
                return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
              } catch (e) {
                return tick;
              }
            }}
          />
          <YAxis 
            stroke="#5e5e5e" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(tick) => `Rp${(tick / 1000)}k`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #efefef', 
              borderRadius: '8px',
              fontFamily: 'sans-serif',
              fontSize: '13px'
            }}
            labelFormatter={(label) => {
              try {
                const date = new Date(label);
                return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
              } catch (e) {
                return label;
              }
            }}
            formatter={(value, name) => {
              const labelName = name === 'revenue' ? 'Billed Revenue' : name === 'fee' ? 'Fee Keuntungan (5%)' : name === 'ongkir' ? 'Ongkir Kurir' : name;
              return [`Rp${formatRupiah(value)}`, labelName];
            }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="fee" 
            stroke="#8b5cf6" 
            fillOpacity={1} 
            fill="url(#colorFee)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
