"use client"

import { forwardRef } from "react"
import { formatCurrency, formatDateTime } from "@/lib/constants"

// ─── Types ────────────────────────────────────────────────────────────────

interface ReceiptItem {
  name: string
  quantity: number
  unit_price: number
}

interface RestaurantBranding {
  name: string
  tagline: string | null
  address: string | null
  phone: string | null
  email: string | null
  tin: string | null
  logo_url: string | null
  currency: string
  receipt_footer: string | null
}

export interface ReceiptDetails {
  id: string
  receipt_number: string
  created_at: string
  subtotal: number
  tax: number
  total: number
  restaurant: RestaurantBranding
  cashier_name: string
  order_items: ReceiptItem[]
  orders: {
    order_number: number
    tables?: { label: string | null; zone: string | null } | null
    customer_name?: string | null
  } | null
  payments: {
    method: string
    amount_tendered?: number | null
    change_due?: number | null
  } | null
}

// ─── Print Receipt Component ───────────────────────────────────────────────

export const ReceiptPrint = forwardRef<HTMLDivElement, { receipt: ReceiptDetails }>(
  ({ receipt }, ref) => {
    const r = receipt
    const currency = r.restaurant.currency ?? "₱"
    const fmt = (n: number) => formatCurrency(n, currency)
    const paymentMethod = r.payments?.method ?? "cash"
    const amountTendered = r.payments?.amount_tendered
    const changeDue = r.payments?.change_due

    // Format date/time for receipt
    const d = new Date(r.created_at)
    const dateStr = d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    })
    const timeStr = d.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    })

    return (
      <div
        ref={ref}
        style={{
          width: "280px",
          background: "#fff",
          color: "#111",
          fontFamily: "'Courier New', 'Courier', monospace",
          fontSize: "11px",
          padding: "20px 16px",
          boxSizing: "border-box",
          userSelect: "none",
        }}
      >
        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          {r.restaurant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r.restaurant.logo_url}
              alt="logo"
              style={{ height: "48px", marginBottom: "6px", objectFit: "contain" }}
            />
          ) : null}
          <div style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "0.5px", lineHeight: "1.2" }}>
            {r.restaurant.name?.toUpperCase() ?? "RESTAURANT"}
          </div>
          {r.restaurant.tagline && (
            <div style={{ fontSize: "10px", opacity: 0.7, marginTop: "2px" }}>
              {r.restaurant.tagline}
            </div>
          )}
          {r.restaurant.address && (
            <div style={{ fontSize: "9px", opacity: 0.6, marginTop: "4px", lineHeight: "1.4" }}>
              {r.restaurant.address}
            </div>
          )}
          {(r.restaurant.phone || r.restaurant.email) && (
            <div style={{ fontSize: "9px", opacity: 0.6, marginTop: "2px" }}>
              {r.restaurant.phone}{r.restaurant.phone && r.restaurant.email ? " • " : ""}{r.restaurant.email}
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <Divider />

        {/* ── Meta ── */}
        <div style={{ marginBottom: "12px" }}>
          <Row label="Receipt #" value={r.receipt_number} bold />
          <Row label="Date" value={dateStr} />
          <Row label="Time" value={timeStr} />
          {r.orders?.tables?.label && (
            <Row label="Table" value={r.orders.tables.label + (r.orders.tables.zone ? ` (${r.orders.tables.zone})` : "")} />
          )}
          {r.orders?.customer_name && (
            <Row label="Customer" value={r.orders.customer_name} />
          )}
          <Row label="Cashier" value={r.cashier_name} />
        </div>

        <Divider />

        {/* ── Items Header ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "20px 1fr auto",
            gap: "0 6px",
            fontWeight: "bold",
            fontSize: "10px",
            paddingBottom: "4px",
            borderBottom: "1px dashed #ccc",
            marginBottom: "6px",
          }}
        >
          <span>#</span>
          <span>Item</span>
          <span style={{ textAlign: "right" }}>Amt</span>
        </div>

        {/* ── Items ── */}
        <div style={{ marginBottom: "12px" }}>
          {r.order_items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr auto",
                gap: "0 6px",
                paddingBottom: "3px",
                lineHeight: "1.3",
              }}
            >
              <span style={{ opacity: 0.6 }}>{item.quantity}</span>
              <span style={{ wordBreak: "break-word" }}>
                {item.name}
              </span>
              <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                {fmt(Number(item.unit_price) * item.quantity)}
              </span>
            </div>
          ))}
          {r.order_items.length === 0 && (
            <div style={{ opacity: 0.5, textAlign: "center", padding: "8px 0" }}>
              No items
            </div>
          )}
        </div>

        <Divider />

        {/* ── Totals ── */}
        <div style={{ marginBottom: "12px" }}>
          <Row label="Subtotal" value={fmt(r.subtotal)} />
          <Row label="Tax (12%)" value={fmt(r.tax)} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
              fontSize: "14px",
              borderTop: "1px solid #111",
              paddingTop: "6px",
              marginTop: "4px",
            }}
          >
            <span>TOTAL</span>
            <span>{fmt(r.total)}</span>
          </div>
        </div>

        <Divider />

        {/* ── Payment ── */}
        <div style={{ marginBottom: "12px" }}>
          <Row
            label="Payment"
            value={paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}
          />
          {amountTendered !== null && amountTendered !== undefined && (
            <Row label="Amount Tendered" value={fmt(amountTendered)} />
          )}
          {changeDue !== null && changeDue !== undefined && changeDue > 0 && (
            <Row label="Change" value={fmt(changeDue)} bold />
          )}
        </div>

        <Divider />

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", marginTop: "16px", lineHeight: "1.5" }}>
          <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "4px" }}>
            ★ Thank you for dining with us! ★
          </div>
          {r.restaurant.receipt_footer && (
            <div style={{ fontSize: "9px", opacity: 0.6 }}>
              {r.restaurant.receipt_footer}
            </div>
          )}
          {r.restaurant.tin && (
            <div style={{ fontSize: "9px", opacity: 0.5, marginTop: "4px" }}>
              TIN: {r.restaurant.tin}
            </div>
          )}
        </div>

        {/* ── Order notes ── */}
        {r.orders?.notes && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "9px",
              opacity: 0.7,
              fontStyle: "italic",
              borderTop: "1px dashed #ccc",
              paddingTop: "6px",
            }}
          >
            Note: {r.orders.notes}
          </div>
        )}
      </div>
    )
  }
)

ReceiptPrint.displayName = "ReceiptPrint"

// ─── Helper components ─────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      style={{
        borderTop: "1px dashed #bbb",
        margin: "8px 0",
        position: "relative",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "-7px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fff",
          padding: "0 4px",
          fontSize: "10px",
          color: "#aaa",
        }}
      >
        ✂
      </span>
    </div>
  )
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        paddingBottom: "2px",
        fontWeight: bold ? "bold" : "normal",
        fontSize: bold ? "12px" : "11px",
      }}
    >
      <span style={{ opacity: 0.8 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}