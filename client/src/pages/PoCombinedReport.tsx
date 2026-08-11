import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Calendar, Printer } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatQty } from '../lib/utils';

const PoCombinedReport = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | ''>('');
  const printRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ['po_combined', date],
    queryFn: async () => {
      const res = await api.get(`/po/combined-report?date=${date}`);
      return res.data;
    }
  });

  const displayData = selectedBranchId === ''
    ? report?.data
    : report?.data?.filter((row: any) => row[`branch_${selectedBranchId}`] != null && row[`branch_${selectedBranchId}`] > 0);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Print handler ─────────────────────────────────────────────────────
  const handlePrint = (branchId?: number) => {
    // Build print content
    const cols = branchId
      ? report?.columns?.filter((c: any) => c.id === branchId)
      : report?.columns || [];

    let html = `
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Closing Stock Report — ${formatDate(date)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil&family=Poppins:wght@400;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Poppins', sans-serif; font-size: 11px; color: #111; }
          .page { width: 210mm; padding: 12mm 10mm; page-break-after: always; }
          .page:last-child { page-break-after: auto; }
          .header { text-align: center; margin-bottom: 8px; }
          .header h1 { font-size: 15px; font-weight: 700; }
          .header h2 { font-size: 12px; font-weight: 600; color: #444; }
          .header .branch-ta { font-family: 'Noto Sans Tamil', sans-serif; font-size: 11px; color: #555; }
          .meta { display: flex; justify-content: space-between; font-size: 10px; color: #666; border-bottom: 1.5px solid #333; margin-bottom: 6px; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1e56a0; color: #fff; text-align: left; padding: 4px 6px; font-size: 10px; font-weight: 700; }
          th.right, td.right { text-align: right; }
          td { padding: 3px 6px; border-bottom: 0.5px solid #ddd; font-size: 10.5px; }
          td.ta { font-family: 'Noto Sans Tamil', sans-serif; }
          tr:nth-child(even) td { background: #f7f9fc; }
          .sn { width: 28px; color: #888; }
          .unit { width: 40px; text-align: center; font-weight: 600; color: #1e56a0; }
          .qty { width: 55px; text-align: right; font-weight: 700; font-size: 12px; }
          .footer { margin-top: 8px; font-size: 9px; color: #888; text-align: right; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>`;

    if (branchId) {
      // One page per branch (already just one branch)
      const col = cols[0];
      const rows = (report?.data || []).filter((r: any) => r[`branch_${col.id}`] != null && r[`branch_${col.id}`] > 0);
      html += buildBranchPage(col, rows, date, formatDate);
    } else {
      // Combined: one page per branch
      cols.forEach((col: any) => {
        const rows = (report?.data || []).filter((r: any) => r[`branch_${col.id}`] != null && r[`branch_${col.id}`] > 0);
        html += buildBranchPage(col, rows, date, formatDate);
      });
    }

    html += `</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  return (
    <div className="vb-page">

      {/* Header */}
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Closing Stock Report</h1>
          <p className="vb-page-sub">Combined stock entries across all branches</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="vb-entry-toolbar" style={{ borderBottom: 'none', borderTop: '1px solid var(--vb-border)', padding: '12px 16px', background: 'var(--vb-card)', gap: 8, flexWrap: 'wrap' }}>
        {/* Branch filter */}
        <select
          className="vb-select"
          value={selectedBranchId}
          onChange={e => setSelectedBranchId(e.target.value === '' ? '' : parseInt(e.target.value))}
          style={{ height: 40, flex: isMobile ? '1 1 100%' : '1 1 200px', minWidth: 160 }}
        >
          <option value="">All Branches</option>
          {report?.columns?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name || c.code}</option>
          ))}
        </select>

        {/* Date picker */}
        <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
          <Calendar size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--vb-muted)' }} />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="vb-input"
            style={{ paddingLeft: 32, height: 40, fontSize: 14, width: '100%' }}
          />
        </div>

        {/* Print buttons */}
        {selectedBranchId !== '' ? (
          <button
            className="vb-btn vb-btn-outline-blue vb-btn-sm"
            style={{ height: 40, whiteSpace: 'nowrap' }}
            onClick={() => handlePrint(selectedBranchId as number)}
          >
            <Printer size={14} /> Print Branch
          </button>
        ) : (
          <button
            className="vb-btn vb-btn-outline-blue vb-btn-sm"
            style={{ height: 40, whiteSpace: 'nowrap' }}
            onClick={() => handlePrint()}
            disabled={!report?.columns?.length}
          >
            <Printer size={14} /> Print All
          </button>
        )}
      </div>

      {isError && (
        <div className="vb-error-banner">
          ⚠ Could not load combined report.{' '}
          <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Data Container */}
      <div ref={printRef} className={isMobile ? '' : 'vb-card'} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32 }}>
              {[1, 2, 3].map(i => <div key={i} className="vb-skeleton" style={{ height: 56, marginBottom: 8 }} />)}
            </div>
          ) : isMobile ? (
            /* ── Mobile Layout ── */
            <div className="vb-mobile-list" style={{ padding: '0 0 16px 0' }}>
              {!displayData?.length ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--vb-muted)' }}>
                  No entries found for this date.
                </div>
              ) : (
                displayData.map((row: any) => {
                  return (
                    <div key={row.product_id} className="vb-mobile-card has-required">
                      <div className="vb-mobile-card-name">
                        {row.product_name_tamil || row.product_name}
                      </div>
                      {row.product_name_tamil && (
                        <span className="vb-mobile-card-name-en">{row.product_name}</span>
                      )}

                      {selectedBranchId === '' ? (
                        <div className="vb-mobile-card-chips" style={{ marginBottom: 12 }}>
                          {report.columns.map((col: any) => {
                            const val = row[`branch_${col.id}`];
                            const valUnitQty = row[`branch_${col.id}_unit_qty`];
                            const unit = row[`unit_${col.id}`];
                            if (!val && !valUnitQty) return null;
                            const displayVal = [valUnitQty ? formatQty(valUnitQty) : '', unit, val ? formatQty(val) : ''].filter(Boolean).join(' ');
                            return (
                              <span key={col.id} className="vb-chip vb-chip-blue" style={{ background: '#f0f7ff', border: '1px solid #bfdbfe' }}>
                                {col.name || col.code}: {displayVal}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}

                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'var(--vb-blue-pale)', padding: '8px 12px', borderRadius: 8, marginTop: 4
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--vb-blue)' }}>TOTAL</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--vb-blue)' }}>
                          {[
                            selectedBranchId === '' ? row.total_unit_qty : (row[`branch_${selectedBranchId}_unit_qty`] || 0),
                            selectedBranchId === '' ? row.total : (row[`branch_${selectedBranchId}`] || 0)
                          ].filter(v => v > 0).map(v => formatQty(v, true)).join(' / ') || '0'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ── Desktop Pivot Table ── */
            <table className="vb-table" style={{ minWidth: 600 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ position: 'sticky', left: 0, zIndex: 11, background: 'var(--vb-blue)', minWidth: 160 }}>Item</th>
                  {report?.columns?.filter((c: any) => selectedBranchId === '' || c.id === selectedBranchId).map((col: any) => (
                    <th key={col.id} style={{ textAlign: 'center', minWidth: 130 }} colSpan={2}>
                      <div>{col.name || col.code}</div>
                      {col.name_tamil && <div style={{ fontFamily: "'Noto Sans Tamil', sans-serif", fontSize: 11, opacity: 0.85 }}>{col.name_tamil}</div>}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right', background: '#174d91', minWidth: 80 }}>TOTAL</th>
                </tr>
                <tr style={{ background: '#2563ab' }}>
                  <th style={{ position: 'sticky', left: 0, background: '#2563ab' }}></th>
                  {report?.columns?.filter((c: any) => selectedBranchId === '' || c.id === selectedBranchId).flatMap((col: any) => [
                    <th key={`unit_${col.id}`} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, opacity: 0.85 }}>UNIT QTY</th>,
                    <th key={`qty_${col.id}`} style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, opacity: 0.85 }}>QTY (KG)</th>
                  ])}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {!displayData?.length ? (
                  <tr>
                    <td colSpan={20} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--vb-muted)' }}>
                      No entries found for this date.
                    </td>
                  </tr>
                ) : (
                  displayData.map((row: any) => (
                    <tr key={row.product_id}>
                      <td className="sticky-col" style={{
                        fontWeight: 700, fontSize: 14,
                        background: 'var(--vb-card)',
                        borderRight: '2px solid var(--vb-border)',
                        minWidth: 160,
                      }}>
                        <div style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}>{row.product_name_tamil || row.product_name}</div>
                        {row.product_name_tamil && <div style={{ fontSize: 11, color: 'var(--vb-muted)', fontFamily: 'Poppins, sans-serif' }}>{row.product_name}</div>}
                      </td>
                      {report.columns.filter((c: any) => selectedBranchId === '' || c.id === selectedBranchId).flatMap((col: any) => {
                        const val = row[`branch_${col.id}`];
                        const valUnitQty = row[`branch_${col.id}_unit_qty`];
                        const unit = row[`unit_${col.id}`];
                        return [
                          <td key={`unit_${col.id}`} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--vb-blue)' }}>
                            {valUnitQty || unit ? `${valUnitQty ? formatQty(valUnitQty) : ''} ${unit || ''}`.trim() : <span style={{ color: 'var(--vb-muted)' }}>—</span>}
                          </td>,
                          <td key={`qty_${col.id}`} style={{ textAlign: 'right', fontSize: 15, fontWeight: 700 }}>
                            {val != null ? formatQty(val) : <span style={{ color: 'var(--vb-muted)' }}>—</span>}
                          </td>
                        ];
                      })}
                      <td style={{
                        textAlign: 'right', fontWeight: 800, fontSize: 18,
                        color: 'var(--vb-blue)', background: 'var(--vb-blue-pale)',
                        borderLeft: '2px solid rgba(30,86,160,0.15)',
                      }}>
                        {[
                          selectedBranchId === '' ? row.total_unit_qty : (row[`branch_${selectedBranchId}_unit_qty`] || 0),
                          selectedBranchId === '' ? row.total : (row[`branch_${selectedBranchId}`] || 0)
                        ].filter(v => v > 0).map(v => formatQty(v, true)).join(' / ') || '0'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Helper: build one branch A4 print page ──────────────────────────────
function buildBranchPage(col: any, rows: any[], date: string, formatDate: (d: string) => string): string {
  const branchName = col.name || col.code;
  const branchTamil = col.name_tamil || '';

  let tableRows = '';
  rows.forEach((row: any, idx: number) => {
    const qty = row[`branch_${col.id}`];
    const unitQty = row[`branch_${col.id}_unit_qty`];
    const unit = row[`unit_${col.id}`] || '';
    const unitText = (unitQty || unit) ? `${unitQty ? formatQty(unitQty) : ''} ${unit}`.trim() : '';
    tableRows += `
      <tr>
        <td class="sn">${idx + 1}</td>
        <td>
          <div class="ta">${row.product_name_tamil || row.product_name}</div>
          ${row.product_name_tamil ? `<div style="font-size:9px;color:#666">${row.product_name}</div>` : ''}
        </td>
        <td class="unit">${unitText}</td>
        <td class="qty">${qty ? formatQty(qty) + ' KG' : ''}</td>
      </tr>`;
  });

  return `
    <div class="page">
      <div class="header">
        <h1>VBills Stock Management</h1>
        <h2>${branchName}</h2>
        ${branchTamil ? `<div class="branch-ta">${branchTamil}</div>` : ''}
      </div>
      <div class="meta">
        <span>Closing Stock Report — கையிருப்பு அறிக்கை</span>
        <span>${formatDate(date)}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="sn">S.No</th>
            <th>Product / பொருள்</th>
            <th class="unit">Unit</th>
            <th class="right">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="4" style="text-align:center;padding:12px;color:#888">No entries</td></tr>'}
        </tbody>
      </table>
      <div class="footer">Printed on ${new Date().toLocaleString('en-IN')} · VBills Stock System</div>
    </div>`;
}

export default PoCombinedReport;
