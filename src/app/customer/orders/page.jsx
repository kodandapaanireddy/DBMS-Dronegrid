'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Customer dashboard — create order form + order list on the same page.
 */
export default function CustomerPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    pickup_lat: 12.9781, pickup_lng: 77.6404,
    dropoff_lat: 12.9287, dropoff_lng: 77.6271,
    zone_id: 1, weight_kg: 1.5, method: 'UPI',
  });
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  // Bengaluru center defaults — Haversine estimate
  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  const dist = haversineKm(form.pickup_lat, form.pickup_lng, form.dropoff_lat, form.dropoff_lng);
  const estimate = 49 + 12 * dist;

  useEffect(() => {
    fetch('/api/orders/list')
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  async function loadOrders() {
    setLoading(true);
    fetch('/api/orders/list')
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setPlacing(true);
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const d = await res.json();
        setForm({
          pickup_lat: 12.9781, pickup_lng: 77.6404,
          dropoff_lat: 12.9287, dropoff_lng: 77.6271,
          zone_id: 1, weight_kg: 1.5, method: 'UPI',
        });
        loadOrders();
      } else {
        const d = await res.json();
        setError(d.error || 'Order failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      {/* Create Order Card */}
      <div className="card mb-8 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Place a New Order</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pickup Lat</label>
              <input type="number" step="0.0001" className="w-full border rounded px-3 py-2"
                value={form.pickup_lat} onChange={(e) => setForm({ ...form, pickup_lat: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pickup Lng</label>
              <input type="number" step="0.0001" className="w-full border rounded px-3 py-2"
                value={form.pickup_lng} onChange={(e) => setForm({ ...form, pickup_lng: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dropoff Lat</label>
              <input type="number" step="0.0001" className="w-full border rounded px-3 py-2"
                value={form.dropoff_lat} onChange={(e) => setForm({ ...form, dropoff_lat: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dropoff Lng</label>
              <input type="number" step="0.0001" className="w-full border rounded px-3 py-2"
                value={form.dropoff_lng} onChange={(e) => setForm({ ...form, dropoff_lng: parseFloat(e.target.value) })} />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Zone ID</label>
              <input type="number" className="w-full border rounded px-3 py-2"
                value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Weight (kg)</label>
              <input type="number" step="0.1" className="w-full border rounded px-3 py-2"
                value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Method</label>
              <select className="w-full border rounded px-3 py-2"
                value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="NetBanking">NetBanking</option>
                <option value="Wallet">Wallet</option>
              </select>
            </div>
          </div>
          <div className="bg-brand-50 rounded px-4 py-3 flex justify-between items-center">
            <span className="text-sm">Estimated fare</span>
            <span className="text-xl font-bold text-brand-700">₹{estimate.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-500">
            Coordinates are Bengaluru (default) but fully editable.
          </p>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary w-full md:w-auto" disabled={placing}>
              {placing ? 'Placing order...' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>

      {/* Order List Card */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Order History</h2>
        {loading ? (
          <p>Loading orders...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Order</th>
                <th className="py-2">Status</th>
                <th className="py-2">Weight</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Created</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-mono">#{o.order_id}</td>
                  <td className="py-2">
                    <span className={'badge ' + statusBadge(o.status)}>{o.status}</span>
                  </td>
                  <td className="py-2">{o.weight_kg} kg</td>
                  <td className="py-2">₹{o.amount ?? '-'}</td>
                  <td className="py-2">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="py-2">
                    <Link href={`/customer/orders/${o.order_id}`}>Track</Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-500">No orders yet — place one above</td></tr>
              )}
            </tbody>
          </table>
        )}
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