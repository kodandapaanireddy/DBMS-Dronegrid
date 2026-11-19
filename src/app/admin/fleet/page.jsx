'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Fleet management page — zone summary + repair actions.
 */
export default function FleetPage() {
  const [zones, setZones] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [repairForm, setRepairForm] = useState({ drone_id: '', battery_pct: 100 });
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const [zRes, mRes] = await Promise.all([
        fetch('/api/fleet/zone-summary'),
        fetch('/api/health'), // maintenance list via /api/fleet/active filtered client-side
      ]);
      const zData = await zRes.json();
      setZones(zData.zones || []);

      const fRes = await fetch('/api/fleet/active');
      const fData = await fRes.json();
      setMaintenance((fData.fleet || []).filter((d) => d.status === 'Maintenance'));
    } catch (e) { console.error(e); }
  }

  useEffect(() => { load(); }, []);

  async function repair(e) {
    e.preventDefault();
    setMsg('');
    try {
      const res = await fetch('/api/fleet/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drone_id: Number(repairForm.drone_id), battery_pct: Number(repairForm.battery_pct) }),
      });
      if (res.ok) {
        setMsg('Drone repaired.');
        load();
      } else {
        const d = await res.json();
        setMsg('Error: ' + d.error);
      }
    } catch (err) { setMsg('Error: ' + err.message); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Fleet Management</h1>

      <div className="card mb-8">
        <h2 className="font-semibold mb-4">Drones in Maintenance</h2>
        {maintenance.length === 0 ? (
          <p className="text-gray-500 text-sm">No drones in maintenance.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Drone</th>
                <th>Serial</th>
                <th>Battery</th>
                <th>Health</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {maintenance.map((d) => (
                <tr key={d.drone_id} className="border-b">
                  <td className="py-2 font-mono">{d.drone_id}</td>
                  <td className="py-2">{d.serial_no}</td>
                  <td className="py-2">{d.battery_pct}%</td>
                  <td className="py-2"><span className="badge badge-danger">{d.health}</span></td>
                  <td className="py-2">
                    <button
                      className="btn btn-primary text-xs"
                      onClick={() => setRepairForm({ drone_id: String(d.drone_id), battery_pct: 100 })}
                    >Repair</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {msg && <p className="text-sm mt-3 text-green-700">{msg}</p>}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Zone Fleet Summary</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Zone</th>
              <th>Status</th>
              <th>Drones</th>
              <th>Avg Battery</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="py-2">{z.zone_code} — {z.zone_name}</td>
                <td className="py-2"><span className="badge badge-neutral">{z.status}</span></td>
                <td className="py-2">{z.drone_count}</td>
                <td className="py-2">{z.avg_battery_pct ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}