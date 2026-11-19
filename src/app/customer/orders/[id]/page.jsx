'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Live package tracking page. Polls Mongo telemetry for the assigned drone
 * every 2-3 seconds and shows map, ETA, battery, and status timeline.
 */
export default function TrackOrderPage({ params }) {
  const router = useRouter();
  const orderId = params.id;
  const [order, setOrder] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || 'Forbidden');
          return;
        }
        const d = await res.json();
        if (active) setOrder(d.order);
      } catch (e) {
        setError(e.message);
      }
    }
    load();
    const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [orderId]);

  useEffect(() => {
    if (!order?.drone_id) return;
    let active = true;
    async function pollTelemetry() {
      try {
        const db = await fetch('/api/telemetry/by-drone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drone_id: order.drone_id, limit: 50 }),
        });
        if (db.ok) {
          const d = await db.json();
          if (active) setTelemetry(d.points || []);
        }
      } catch (_e) { /* ignore */ }
    }
    pollTelemetry();
    const timer = setInterval(pollTelemetry, 2500);
    return () => { active = false; clearInterval(timer); };
  }, [order?.drone_id]);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="btn btn-secondary mb-4">Back</button>
        <div className="card text-red-700">{error}</div>
      </div>
    );
  }

  if (!order) return <div className="max-w-7xl mx-auto px-4 py-8">Loading...</div>;

  const latest = telemetry[telemetry.length - 1];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="btn btn-secondary mb-4">Back</button>
      <h1 className="text-2xl font-bold mb-6">Track Order #{order.order_id}</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card md:col-span-2">
          <h2 className="font-semibold mb-4">Live Map</h2>
          <div className="h-80 bg-gray-100 rounded flex items-center justify-center text-gray-500">
            {latest
              ? `Drone at (${latest.location.coordinates[1].toFixed(4)}, ${latest.location.coordinates[0].toFixed(4)})`
              : 'Awaiting telemetry...'}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Leaflet map component would render here. Latest telemetry: {telemetry.length} points.
          </p>
        </div>
        <div className="card space-y-4">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-semibold text-lg">
              <span className={'badge ' + statusBadge(order.status)}>{order.status}</span>
            </p>
          </div>
          {latest && (
            <>
              <div>
                <p className="text-sm text-gray-500">Drone Battery</p>
                <p className="font-semibold">{latest.battery_pct}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Altitude</p>
                <p className="font-semibold">{latest.altitude_m} m</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Speed</p>
                <p className="font-semibold">{latest.speed_mps} m/s</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Update</p>
                <p className="font-semibold text-xs">{new Date(latest.ts).toLocaleTimeString()}</p>
              </div>
            </>
          )}
          <div>
            <p className="text-sm text-gray-500">Pickup</p>
            <p className="text-xs font-mono">
              {order.pickup_lat.toFixed(4)}, {order.pickup_lng.toFixed(4)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Dropoff</p>
            <p className="text-xs font-mono">
              {order.dropoff_lat.toFixed(4)}, {order.dropoff_lng.toFixed(4)}
            </p>
          </div>
          {order.delivered_at && (
            <div>
              <p className="text-sm text-gray-500">Delivered At</p>
              <p className="text-xs">{new Date(order.delivered_at).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function statusBadge(status) {
  switch (status) {
    case 'Delivered': return 'badge-success';
    case 'Assigned': case 'In_Transit': return 'badge-info';
    case 'Pending': return 'badge-warn';
    case 'Cancelled': case 'Failed': return 'badge-danger';
    default: return 'badge-neutral';
  }
}