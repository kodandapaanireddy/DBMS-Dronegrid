'use client';

import { useEffect, useState } from 'react';

/**
 * Admin dashboard — sourced from active_fleet_view and Mongo aggregations.
 */
export default function AdminDashboard() {
  const [fleet, setFleet] = useState([]);
  const [summary, setSummary] = useState({ avg_delivery: [], weather: [], battery: {} });
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [fleetRes, avgRes, weatherRes, batteryRes] = await Promise.all([
        fetch('/api/fleet/active'),
        fetch('/api/analytics?pipeline=avg_delivery_time_per_zone'),
        fetch('/api/analytics?pipeline=weather_interference_per_zone'),
        fetch('/api/analytics?pipeline=battery_drain_per_zone_hour'),
      ]);
      const [fleetData, avgData, weatherData, batteryData] = await Promise.all([
        fleetRes.json(), avgRes.json(), weatherRes.json(), batteryRes.json(),
      ]);
      setFleet(fleetData.fleet || []);
      setSummary({
        avg_delivery: avgData.rows || [],
        weather: weatherData.rows || [],
        battery: batteryData.rows || {},
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalDrones = fleet.length;
  const critical = fleet.filter((d) => d.health === 'Critical').length;
  const maintenance = fleet.filter((d) => d.status === 'Maintenance').length;
  const idle = fleet.filter((d) => d.status === 'Idle').length;
  const inFlight = fleet.filter((d) => d.status === 'Assigned' || d.status === 'In_Flight').length;

  const avgMin =
    summary.avg_delivery.length > 0
      ? (summary.avg_delivery.reduce((s, r) => s + Number(r.avgDurationSec || 0), 0) / summary.avg_delivery.length / 60).toFixed(1)
      : '-';

  if (loading) return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Fleet Dashboard</h1>
          <p className="text-slate-600 text-sm">Real-time fleet status and grid analytics</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm">Refresh Data</button>
          <a href="/admin/fleet" className="btn btn-secondary btn-sm">Fleet View</a>
        </div>
      </div>

      {/* Stat Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="stat-card stat-card-brand animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="stat-label">Total Drones</div>
          <div className="stat-value">{totalDrones}</div>
          <div className="stat-change stat-change-up">● All systems operational</div>
        </div>
        <div className="stat-card stat-card-success animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="stat-label">Idle / Available</div>
          <div className="stat-value">{idle}</div>
          <div className="stat-change stat-change-up">Ready for assignment</div>
        </div>
        <div className="stat-card stat-card-warning animate-slide-up" style={{ animationDelay: '250ms' }}>
          <div className="stat-label">In Flight</div>
          <div className="stat-value">{inFlight}</div>
          <div className="stat-change stat-change-up">Active deliveries</div>
        </div>
        <div className="stat-card stat-card-danger animate-slide-up" style={{ animationDelay: '350ms' }}>
          <div className="stat-label">Maintenance</div>
          <div className="stat-value">{maintenance}</div>
          <div className="stat-change stat-change-down">{critical} critical battery</div>
        </div>
      </div>

      {/* Avg Delivery Stat */}
      <div className="stat-card stat-card-success p-6 animate-slide-up" style={{ animationDelay: '450ms' }}>
        <div className="flex justify-between items-start">
          <div>
            <div className="stat-label">Avg Delivery Time</div>
            <div className="text-4xl font-bold text-slate-900 mt-1">{avgMin} min</div>
            <div className="text-xs text-slate-500 mt-2">Across all completed deliveries</div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
            🚁
          </div>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="table-container animate-slide-up" style={{ animationDelay: '550ms' }}>
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            🛩️ Fleet Status
          </h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Drone</th>
              <th>Model</th>
              <th>Status</th>
              <th>Battery</th>
              <th>Health</th>
              <th>Current Order</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {fleet.map((d) => (
              <tr key={d.drone_id} className="group">
                <td className="font-mono text-sm">{d.serial_no}</td>
                <td className="text-sm">{d.model}</td>
                <td className="text-sm">
                  <span className={'badge ' + statusBadge(d.status)}>{d.status}</span>
                </td>
                <td className="text-sm font-mono">{d.battery_pct}%</td>
                <td className="text-sm">
                  <span className={'badge ' + healthBadge(d.health)}>{d.health}</span>
                </td>
                <td className="text-sm">{d.current_order_id ? `#${d.current_order_id}` : '—'}</td>
                <td className="text-xs text-slate-500 font-mono">{d.last_seen_at ? new Date(d.last_seen_at).toLocaleTimeString() : '—'}</td>
              </tr>
            ))}
            {fleet.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">No drones in fleet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Analytics Section */}
      <div className="grid md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '650ms' }}>
        <div className="card">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            📊 Top Weather-Interference Zones
          </h2>
          <div className="table-container h-[320px] overflow-y-auto no-scrollbar">
            <table className="table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th className="text-right">Avg Wind</th>
                  <th className="text-right">Max Wind</th>
                  <th className="text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {summary.weather.map((r) => (
                  <tr key={r._id} className="group">
                    <td className="text-sm">{r.zoneName}</td>
                    <td className="text-sm text-right">{r.avgWind.toFixed(1)} km/h</td>
                    <td className="text-sm text-right">{r.maxWind.toFixed(1)} km/h</td>
                    <td className="text-sm text-right">
                      <span className={'badge ' + (Number(r.interferenceScore) > 50 ? 'badge-danger' : 'badge-warn')}>
                        {Number(r.interferenceScore).toFixed(0)}
                      </span>
                    </td>
                  </tr>
                ))}
                {summary.weather.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-500">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            🔋 Battery Drain by Zone / Hour
          </h2>
          <div className="table-container h-[320px] overflow-y-auto no-scrollbar">
            <table className="table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th className="text-right">Avg Battery</th>
                  <th className="text-right">Min Battery</th>
                  <th className="text-right">Samples</th>
                </tr>
              </thead>
              <tbody>
                {(summary.battery.byZone || []).map((r) => (
                  <tr key={r._id} className="group">
                    <td className="text-sm">{r.zoneName}</td>
                    <td className="text-sm text-right font-mono">{r.avgBattery.toFixed(1)}%</td>
                    <td className="text-sm text-right font-mono">{r.minBattery.toFixed(1)}%</td>
                    <td className="text-sm text-right">{r.sampleCount}</td>
                  </tr>
                ))}
                {(summary.battery.byZone || []).length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-500">No telemetry data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusBadge(s) {
  switch (s) {
    case 'Idle': return 'badge-info';
    case 'Assigned': case 'In_Flight': return 'badge-info';
    case 'Charging': return 'badge-warn';
    case 'Maintenance': return 'badge-danger';
    default: return 'badge-neutral';
  }
}
function healthBadge(h) {
  switch (h) {
    case 'Critical': return 'badge-danger';
    case 'Low': return 'badge-warn';
    default: return 'badge-success';
  }
}