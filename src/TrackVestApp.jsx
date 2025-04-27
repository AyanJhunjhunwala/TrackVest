// TrackVestApp.jsx
// A minimal yet production‑ready React SPA for tracking a simple investment portfolio.
// Uses TailwindCSS utility classes, shadcn/ui primitives, lucide‑react icons, and Framer Motion.
// Drop this file into a Vite/Next.js/CRA project with Tailwind & shadcn configured and import it as the root component.

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function App() {
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState({ symbol: "", quantity: "", price: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const addPosition = () => {
    if (!form.symbol || !form.quantity || !form.price) return;
    setPositions([
      ...positions,
      {
        id: Date.now(),
        symbol: form.symbol.trim().toUpperCase(),
        quantity: Number(form.quantity),
        price: Number(form.price),
      },
    ]);
    setForm({ symbol: "", quantity: "", price: "" });
  };

  const totalValue = positions.reduce(
    (acc, p) => acc + p.quantity * p.price,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {/* ----- Header ----- */}
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">TrackVest</h1>
        <p className="text-base text-slate-600">
          Your simple portfolio tracker
        </p>
      </header>

      {/* ----- Main Content ----- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-xl mx-auto grid gap-4"
      >
        {/* ---- Add Position Form ---- */}
        <Card className="shadow-lg rounded-2xl p-4">
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Ticker (e.g. AAPL)"
                name="symbol"
                value={form.symbol}
                onChange={handleChange}
              />
              <Input
                placeholder="Qty"
                name="quantity"
                type="number"
                min="0"
                value={form.quantity}
                onChange={handleChange}
              />
              <Input
                placeholder="Price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
              />
            </div>
            <Button
              onClick={addPosition}
              className="w-full gap-2"
              disabled={!form.symbol || !form.quantity || !form.price}
            >
              <PlusCircle className="w-4 h-4" /> Add Position
            </Button>
          </CardContent>
        </Card>

        {/* ---- Positions Table ---- */}
        <Card className="shadow-lg rounded-2xl p-4">
          <CardContent>
            {positions.length === 0 ? (
              <p className="text-slate-500 text-center">No positions yet.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-600">
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Quantity</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.id} className="border-t last:border-b text-sm">
                      <td className="py-2 font-medium">{p.symbol}</td>
                      <td className="py-2">
                        {p.quantity.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2">
                        ${p.price.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 font-semibold">
                        $
                        {(p.quantity * p.price).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                  {/* ---- Total Row ---- */}
                  <tr className="border-t font-bold text-base">
                    <td colSpan="3" className="py-2 text-right">
                      Total
                    </td>
                    <td className="py-2">
                      ${totalValue.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
