'use client'

import { useEffect } from 'react'
import type { StaffMember } from '@/lib/portal-state'
import { WP_ORIGIN } from '@/lib/woocommerce-public'

// 4-per-A4 staff badge print sheet. Layout: 2 columns x 2 rows, with crop
// marks so Samreen can guillotine the sheet. We open the print dialog after
// fonts + QR images settle.
export default function PrintBadgesClient({
  staff, stall, businessName,
}: { staff: StaffMember[]; stall: string | null; businessName: string }) {
  useEffect(() => {
    const t = setTimeout(() => { try { window.focus(); window.print() } catch { /* swallow */ } }, 700)
    return () => clearTimeout(t)
  }, [])

  const cleanBiz = businessName.replace(/^DEMO\s*·?\s*/i, '')

  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm; }
        html, body { background: #fff; }
        body { font-family: 'Inter', -apple-system, system-ui, sans-serif; color: #1a1416; margin: 0; }
        .toolbar { padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
        .toolbar button { background: #cd2653; color: #fff; border: 0; padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .sheet { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 130mm; gap: 0; padding: 10mm; }
        .badge { border: 1px dashed #d8c9cc; padding: 12mm 10mm; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; break-inside: avoid; page-break-inside: avoid; }
        .badge .crop-tl, .badge .crop-tr, .badge .crop-bl, .badge .crop-br { position: absolute; width: 6mm; height: 6mm; }
        .badge .crop-tl { top: 0; left: 0; border-top: 1px solid #999; border-left: 1px solid #999; }
        .badge .crop-tr { top: 0; right: 0; border-top: 1px solid #999; border-right: 1px solid #999; }
        .badge .crop-bl { bottom: 0; left: 0; border-bottom: 1px solid #999; border-left: 1px solid #999; }
        .badge .crop-br { bottom: 0; right: 0; border-bottom: 1px solid #999; border-right: 1px solid #999; }
        .kicker { font-size: 9px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #cd2653; }
        .title { font-family: 'Fraunces', Georgia, serif; font-size: 15px; font-weight: 600; color: #1a1416; margin-top: 3px; }
        .name { font-family: 'Fraunces', Georgia, serif; font-size: 22px; font-weight: 600; line-height: 1.1; margin: 14px 0 2px; }
        .biz { font-size: 11px; color: #6b6b6b; margin-bottom: 12px; }
        .qr { width: 38mm; height: 38mm; border: 1px solid #efe7ea; border-radius: 6px; padding: 3mm; background: #fff; }
        .qr-empty { display: flex; align-items: center; justify-content: center; font-size: 10px; color: #b3b3b3; text-align: center; }
        .meta { font-size: 11px; color: #1a1416; margin-top: 10px; font-weight: 500; }
        .footer { font-size: 9px; color: #999; margin-top: auto; padding-top: 8mm; letter-spacing: 0.04em; }
        .role { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #fff; background: #1a1416; padding: 3px 7px; border-radius: 999px; margin-top: 6px; }
        .empty { padding: 60px 20px; text-align: center; color: #888; font-size: 14px; }
        @media print { .toolbar { display: none; } body { background: #fff; } }
      `}</style>
      <div className="toolbar">
        <div>Print all staff badges, {cleanBiz}{stall ? ` (stall ${stall})` : ''}</div>
        <button onClick={() => window.print()}>Print now</button>
      </div>
      {staff.length === 0 ? (
        <div className="empty">No staff registered yet. Add team members in the portal before printing.</div>
      ) : (
        <div className="sheet">
          {staff.map((m) => (
            <div className="badge" key={m.id}>
              <span className="crop-tl" /><span className="crop-tr" /><span className="crop-bl" /><span className="crop-br" />
              <div className="kicker">Young at Heart 2026</div>
              <div className="title">Exhibitor Staff Pass</div>
              <div className="name">{m.name}</div>
              <div className="biz">{cleanBiz}{stall ? ` · Stall ${stall}` : ''}</div>
              {m.fooevents_ticket_id ? (
                <img
                  className="qr"
                  src={`${WP_ORIGIN}/?fooevents_ticket_qr=${m.fooevents_ticket_id}`}
                  alt={`Gate QR for ${m.name}`}
                />
              ) : m.wc_order_id ? (
                <div className="qr qr-empty">QR pending,<br />order #{m.wc_order_number || m.wc_order_id}</div>
              ) : (
                <div className="qr qr-empty">No badge issued</div>
              )}
              <div className="meta">
                {m.phone || m.id_number || ''}
                {m.vehicle_reg ? ` · ${m.vehicle_reg}` : ''}
              </div>
              {m.role && <div className="role">{m.role}</div>}
              <div className="footer">Scan at the gate, 11 to 13 Dec 2026, Youngsfield</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
