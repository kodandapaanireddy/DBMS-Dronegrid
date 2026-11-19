'use client';

import { useEffect, useState } from 'react';

/**
 * Zone analytics — Mongo aggregation results rendered as tables + charts.
 */
export default function AnalyticsPage() {
  const [avg, setAvg] = useState([]);
  const [weather, setWeather] = useState([]);
  const [battery, setBattery] = useState({});

  async function load() {
    try {
      const [a, w, b] = await Promise.all([
        fetch('/api/analytics?pipeline=avg_delivery_time_per_zone').then((r) => r.json()),
        fetch('/api/analytics?pipeline=weather_interference_per_zone').then((r) => r.json()),
        fetch('/api/analytics?pipeline=battery_drain_per_zone_hour').then((r) => r.json()),
      ]);
      setAvg(a.rows || []);
      setWeather(w.rows || []);
      setBattery(b.rows || {});
    } catch (e) { console.error(e); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Zone Analytics</h1>

      <div className="card mb-8">
        <h2 className="font-semibold mb-4">Average Delivery Time per Zone</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Zone</th>
              <th>Deliveries</th>
              <th>Avg (min)</th>
              <th>Max (min)</th>
            </tr>
          </thead>
          <tbody>
            {avg.map((r) => (
              <tr key={r._id} className="border-b hover:bg-gray-50">
                <td className="py-2">{r.zoneName}</td>
                <td className="py-2">{r.deliveryCount}</td>
                <td className="py-2">{r.avgDurationMin}</td>
                <td className="py-2">{(r.maxDurationSec / 60).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-4">
          A recharts bar chart would render here (avg duration per zone).
        </p>
      </div>

      <div className="card mb-8">
        <h2 className="font-semibold mb-4">Weather Interference per Zone</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Zone</th>
              <th>Avg Wind</th>
              <th>Max Wind</th>
              <th>Avg Deviation</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {weather.map((r) => (
              <tr key={r._id} className="border-b hover:bg-gray-50">
                <td className="py-2">{r.zoneName}</td>
                <td className="py-2">{r.avgWind.toFixed(1)}</td>
                <td className="py-2">{r.maxWind.toFixed(1)}</td>
                <td className="py-2">{r.avgDeviationM.toFixed(0)} m</td>
                <td className="py-2">
                  <span className={'badge ' + (r.interferenceScore > 50 ? 'badge-danger' : 'badge-warn')}>
                    {r.interferenceScore.toFixed(0)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Battery Drain per Zone / Hour</h2>
        <p className="text-sm text-gray-500 mb-4">
          Lowest average battery by zone (drains fastest):
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Zone</th>
              <th>Avg Battery</th>
              <th>Min Battery</th>
              <th>Samples</th>
            </tr>
          </thead>
          <tbody>
            {(battery.byZone || []).map((r) => (
              <tr key={r._id} className="border-b hover:bg-gray-50">
                <td className="py-2">{r.zoneName}</td>
                <td className="py-2">{r.avgBattery.toFixed(1)}%</td>
                <td className="py-2">{r.minBattery.toFixed(1)}%</td>
                <td className="py-2">{r.sampleCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}