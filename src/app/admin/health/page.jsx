'use client';

import { useEffect, useState } from 'react';

/**
 * System health panel — Postgres/Mongo connectivity, latency, maintenance
 * logs, and recent failed payments.
 */
export default function HealthPage() {
  const [health, setHealth] = useState({});
  const [maintenance, setMaintenance] = useState([]);
  const [failed, setFailed] = useState([]);

  async function load() {
    try {
      const [h, f] = await Promise.all([
        fetch('/api/health').then((r) => r.json()),
        fetch('/api/orders/list?limit=100').then((r) => r.json()),
      ]);
      setHealth(h);
      const orders = f.orders || [];
      setFailed(orders.filter((o) => o.payment_status === 'Failed'));
      setMaintenance(orders.filter((o) => o.status === 'Maintenance'));
    } catch (e) { console.error(e); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">System Health</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="font-semibold mb-4">PostgreSQL</h2>
          <StatusRow label="Connected" ok={health.postgres?.ok} />
          {health.postgres && <p className="text-sm">Latency: {health.postgres.latency_ms} ms</p>}
        </div>
        <div className="card">
          <h2 className="font-semibold mb-4">MongoDB</h2>
          <StatusRow label="Connected" ok={health.mongo?.ok} />
          {health.mongo && <p className="text-sm">Latency: {health.mongo.latency_ms} ms</p>}
        </div>
      </div>

      <div className="card mb-8">
        <h2 className="font-semibold mb-4">Recent Failed Payments</h2>
        {failed.length === 0 ? (
          <p className="text-gray-500 text-sm">No failed payments.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Order</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {failed.map((p) => (
                <tr key={p.order_id} className="border-b">
                  <td className="py-2 font-mono">#{p.order_id}</td>
                  <td className="py-2">₹{p.amount}</td>
                  <td className="py-2">{p.method}</td>
                  <td className="py-2">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Open Maintenance Logs</h2>
        <p className="text-sm text-gray-500 mb-4">
          (Sourced from the maintenance_log table via the active fleet view.)
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Drone</th>
              <th>Serial</th>
              <th>Battery</th>
              <th>Health</th>
            </tr>
          </thead>
          <tbody>
            {maintenance.map((d) => (
              <tr key={d.drone_id} className="border-b">
                <td className="py-2 font-mono">{d.drone_id}</td>
                <td className="py-2">{d.serial_no}</td>
                <td className="py-2">{d.battery_pct}%</td>
                <td className="py-2"><span className="badge badge-danger">{d.health}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusRow({ label, ok }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={'w-3 h-3 rounded-full ' + (ok ? 'bg-green-500' : 'bg-red-500')}></span>
      <span className="text-sm">{label}: {ok ? 'OK' : 'FAIL'}</span>
    </div>
  );
}