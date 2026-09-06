'use client';

import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  ShieldCheck,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import { OrderDto } from '@ecommerce/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface InvoiceModalProps {
  order: OrderDto;
  isOpen: boolean;
  onClose: () => void;
}

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateInvoiceHtml(order: OrderDto): string {
  const invoiceNo = `INV-2026-${(order.orderNumber || '').replace('ORD-', '')}`;
  const invoiceDate = formatDate(order.createdAt || new Date());
  const orderDate = formatDate(order.createdAt);
  const items = order.items || [];
  const subtotal = order.subtotal || 0;
  const discount = order.discountAmount || 0;
  const taxableValue = subtotal - discount;
  const cgst = Number((taxableValue * 0.09).toFixed(2));
  const sgst = Number((taxableValue * 0.09).toFixed(2));
  const totalTax = Number((cgst + sgst).toFixed(2));
  const shipping = order.shippingCost || 0;
  const grandTotal = order.totalAmount || Number((taxableValue + totalTax + shipping).toFixed(2));

  const recipientName =
    order.shippingAddress?.recipientName ||
    (order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : '') ||
    'Valued Customer';
  const street = order.shippingAddress?.street || 'Customer Delivery Address';
  const city = order.shippingAddress?.city || '';
  const state = order.shippingAddress?.state || 'India';
  const postalCode = order.shippingAddress?.postalCode || '';
  const phone = order.shippingAddress?.phone || 'N/A';
  const paymentMode =
    order.payment?.provider || (order.status === 'CANCELLED' ? 'Cancelled' : 'Prepaid / UPI / Card');
  const paymentStatus =
    order.payment?.status || (order.status === 'CANCELLED' ? 'CANCELLED' : 'PAID / CONFIRMED');
  const txnRef =
    order.payment?.transactionId || (order.id ? order.id.slice(0, 16).toUpperCase() : 'TXN-SWADESH');
  const awb = order.shipment?.awbNumber || order.trackingNumber || 'SWD-EXP-IND';

  const rowsHtml = items
    .map((item, idx) => {
      const itemTotal = Number(item.totalPrice || item.unitPrice * item.quantity);
      const itemTaxable = Number((itemTotal / 1.18).toFixed(2));
      const itemGst = Number((itemTotal - itemTaxable).toFixed(2));
      return `
        <tr>
          <td style="text-align:center;color:#64748b;font-weight:600;padding:5px 6px;">${idx + 1}</td>
          <td style="padding:5px 6px;">
            <div style="font-weight:700;color:#0f172a;font-size:9.5px;">${escapeHtml(item.productTitle)}</div>
            <div style="font-size:8.5px;color:#64748b;">${item.variantTitle ? `Variant: ${escapeHtml(item.variantTitle)} | ` : ''}SKU: ${escapeHtml(item.sku || 'NV-SKU-001')}</div>
          </td>
          <td style="font-family:monospace;color:#475569;font-size:9px;padding:5px 6px;">85189000</td>
          <td style="text-align:center;font-weight:700;padding:5px 6px;">${item.quantity}</td>
          <td style="text-align:right;padding:5px 6px;">${formatPrice(item.unitPrice)}</td>
          <td style="text-align:right;padding:5px 6px;">${formatPrice(itemTaxable)}</td>
          <td style="text-align:right;color:#64748b;padding:5px 6px;">${formatPrice(itemGst)}</td>
          <td style="text-align:right;font-weight:700;color:#0f172a;padding:5px 6px;">${formatPrice(itemTotal)}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SWADESH_Luxe_Invoice_${invoiceNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10px;
      line-height: 1.35;
    }
    .invoice-wrapper {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      page-break-inside: avoid;
      page-break-after: avoid;
      break-inside: avoid;
    }
    .header-table {
      width: 100%;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 8px;
      border-collapse: collapse;
    }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      border-radius: 4px;
      font-weight: 800;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .address-card {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-bottom: 8px;
      padding: 7px 10px;
      display: table;
      table-layout: fixed;
    }
    .col-half {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      font-size: 9.5px;
      line-height: 1.4;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      font-size: 9.5px;
    }
    .items-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8.5px;
      letter-spacing: 0.4px;
      padding: 5px 6px;
      border-bottom: 1px solid #cbd5e1;
    }
    .items-table td {
      border-bottom: 1px solid #e2e8f0;
    }
    .bottom-section {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 6px;
    }
    .bottom-left {
      display: table-cell;
      width: 56%;
      vertical-align: top;
      padding-right: 10px;
    }
    .bottom-right {
      display: table-cell;
      width: 44%;
      vertical-align: top;
    }
    .tax-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 9px;
      line-height: 1.45;
      margin-bottom: 6px;
    }
    .tax-row {
      display: flex;
      justify-content: space-between;
      color: #475569;
    }
    .tax-row.total {
      border-top: 1px solid #cbd5e1;
      margin-top: 3px;
      padding-top: 3px;
      font-weight: 700;
      color: #0f172a;
    }
    .terms-box {
      font-size: 8.5px;
      color: #64748b;
      line-height: 1.35;
    }
    .summary-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 9.5px;
      margin-bottom: 6px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 1.5px 0;
      color: #475569;
    }
    .summary-row.total {
      border-top: 1.5px solid #0f172a;
      margin-top: 4px;
      padding-top: 4px;
      font-size: 11px;
      font-weight: 900;
      color: #0f172a;
    }
    .signature-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 5px 8px;
      text-align: center;
      background: #fafafa;
    }
    .footer-note {
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      margin-top: 6px;
      font-size: 8.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- Header Table -->
    <table class="header-table">
      <tr>
        <td style="vertical-align:top;">
          <div style="font-size:16px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;">
            🇮🇳 SWADESH Luxe
          </div>
          <div style="font-weight:700;font-size:9.5px;color:#475569;margin-top:1px;">
            SWADESH Retail Technologies Private Limited
          </div>
          <div style="font-size:8.5px;color:#64748b;line-height:1.3;margin-top:2px;">
            Registered Office: DLF Cyber City, Tower B, Phase 2, Gurugram, Haryana - 122002, India<br/>
            <strong>GSTIN:</strong> 07AABCN1234F1Z5 | <strong>CIN:</strong> U74999DL2024PTC123456<br/>
            <strong>Email:</strong> support@swadeshluxe.in | <strong>Toll Free:</strong> 1800-SWADESH
          </div>
        </td>
        <td style="vertical-align:top;text-align:right;">
          <span class="badge">Tax Invoice / Bill of Supply</span>
          <div style="font-size:11px;font-weight:800;color:#0f172a;margin-top:3px;">
            Invoice No: <span style="font-family:monospace;">${invoiceNo}</span>
          </div>
          <div style="font-size:9px;color:#64748b;margin-top:1px;line-height:1.4;">
            Invoice Date: <strong style="color:#0f172a;">${invoiceDate}</strong><br/>
            Order No: <strong style="color:#0f172a;font-family:monospace;">${order.orderNumber}</strong><br/>
            Order Date: <strong style="color:#0f172a;">${orderDate}</strong>
          </div>
        </td>
      </tr>
    </table>

    <!-- Address & Dispatch Summary -->
    <div class="address-card">
      <div class="col-half" style="padding-right:8px;">
        <div style="font-weight:800;font-size:8.5px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;margin-bottom:2px;">
          Billing & Shipping Address
        </div>
        <div style="font-weight:700;color:#0f172a;">${escapeHtml(recipientName)}</div>
        <div style="color:#475569;">${escapeHtml(street)}</div>
        <div style="color:#475569;">${escapeHtml(city ? `${city}, ` : '')}${escapeHtml(state)}${postalCode ? ` - ${postalCode}` : ''}</div>
        <div style="color:#64748b;margin-top:1px;">
          <strong>Phone:</strong> ${escapeHtml(phone)} | <strong>Place of Supply:</strong> ${escapeHtml(state)} (State Code: 07)
        </div>
      </div>
      <div class="col-half" style="text-align:right;">
        <div style="font-weight:800;font-size:8.5px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;margin-bottom:2px;">
          Payment & Dispatch Summary
        </div>
        <div style="color:#475569;"><strong>Payment Mode:</strong> ${escapeHtml(paymentMode)}</div>
        <div style="color:#475569;"><strong>Payment Status:</strong> <span style="color:#059669;font-weight:700;">${escapeHtml(paymentStatus)}</span></div>
        <div style="color:#64748b;font-family:monospace;font-size:8.5px;">Txn Ref: ${escapeHtml(txnRef)}</div>
        <div style="color:#64748b;font-family:monospace;font-size:8.5px;">AWB / Tracking: ${escapeHtml(awb)}</div>
        <div style="color:#059669;font-weight:700;font-size:8.5px;margin-top:2px;">
          ✓ 100% Verified Digital GST Invoice
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align:center;width:24px;">#</th>
          <th style="text-align:left;">Item Description</th>
          <th style="text-align:left;width:75px;">HSN Code</th>
          <th style="text-align:center;width:35px;">Qty</th>
          <th style="text-align:right;width:75px;">Unit Price</th>
          <th style="text-align:right;width:75px;">Taxable Val</th>
          <th style="text-align:right;width:70px;">GST (18%)</th>
          <th style="text-align:right;width:80px;">Total (INR)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <!-- Bottom Section -->
    <div class="bottom-section">
      <div class="bottom-left">
        <!-- GST Tax Computation Summary -->
        <div class="tax-box">
          <div style="font-weight:800;font-size:8.5px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;margin-bottom:2px;">
            GST Tax Computation Summary
          </div>
          <div class="tax-row">
            <span>Taxable Amount</span>
            <span style="font-weight:600;color:#0f172a;">${formatPrice(taxableValue)}</span>
          </div>
          <div class="tax-row">
            <span>Central GST (CGST @ 9.00%)</span>
            <span style="font-weight:600;color:#0f172a;">${formatPrice(cgst)}</span>
          </div>
          <div class="tax-row">
            <span>State GST (SGST @ 9.00%)</span>
            <span style="font-weight:600;color:#0f172a;">${formatPrice(sgst)}</span>
          </div>
          <div class="tax-row total">
            <span>Total Tax Amount (18%)</span>
            <span>${formatPrice(totalTax)}</span>
          </div>
        </div>

        <!-- Terms -->
        <div class="terms-box">
          <div style="font-weight:700;color:#0f172a;margin-bottom:1px;">Terms & Conditions:</div>
          <div>1. Goods eligible for 7 to 14 days return/replacement as per SWADESH Luxe policy.</div>
          <div>2. This is a computer generated tax invoice and requires no physical signature.</div>
          <div>3. All disputes are subject to Gurugram / Delhi jurisdiction only.</div>
        </div>
      </div>

      <div class="bottom-right">
        <!-- Summary Box -->
        <div class="summary-box">
          <div class="summary-row">
            <span>Gross Subtotal</span>
            <span style="font-weight:600;color:#0f172a;">${formatPrice(subtotal)}</span>
          </div>
          ${
            discount > 0
              ? `
          <div class="summary-row" style="color:#059669;font-weight:600;">
            <span>Promotional Discount</span>
            <span>-${formatPrice(discount)}</span>
          </div>`
              : ''
          }
          <div class="summary-row">
            <span>Shipping & Handling</span>
            <span style="font-weight:600;color:#0f172a;">${
              shipping === 0
                ? '<span style="color:#059669;font-weight:700;">FREE</span>'
                : formatPrice(shipping)
            }</span>
          </div>
          <div class="summary-row">
            <span>Applicable GST (18%)</span>
            <span style="font-weight:600;color:#0f172a;">${formatPrice(totalTax)}</span>
          </div>
          <div class="summary-row total">
            <span>Grand Total (INR)</span>
            <span style="color:#e11d48;">${formatPrice(grandTotal)}</span>
          </div>
        </div>

        <!-- Signatory Box -->
        <div class="signature-box">
          <div style="font-size:8.5px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;">
            For SWADESH Retail Technologies Pvt Ltd
          </div>
          <div style="margin:2px 0;">
            <img src="/signature.png" alt="Signature" style="height:30px;width:auto;max-width:130px;display:inline-block;" />
          </div>
          <div style="font-size:9.5px;font-weight:800;color:#0f172a;">Mrityunjay Kumar</div>
          <div style="font-size:8px;color:#64748b;">Authorized Signatory (Finance & Compliance)</div>
        </div>
      </div>
    </div>

    <!-- Footer Note -->
    <div class="footer-note">
      <span>Thank you for shopping with SWADESH Luxe! • ॥ अतिथिदेवो भवः ॥</span>
      <span>www.swadeshluxe.in • 24x7 Concierge Support</span>
    </div>
  </div>
</body>
</html>`;
}

export function InvoiceModal({ order, isOpen, onClose }: InvoiceModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  const invoiceNo = `INV-2026-${(order.orderNumber || '').replace('ORD-', '')}`;
  const invoiceDate = formatDate(order.createdAt || new Date());
  const items = order.items || [];
  const subtotal = order.subtotal || 0;
  const discount = order.discountAmount || 0;
  const taxableValue = subtotal - discount;
  const cgst = Number((taxableValue * 0.09).toFixed(2));
  const sgst = Number((taxableValue * 0.09).toFixed(2));
  const totalTax = Number((cgst + sgst).toFixed(2));
  const shipping = order.shippingCost || 0;
  const grandTotal = order.totalAmount || Number((taxableValue + totalTax + shipping).toFixed(2));

  // 1-Page Isolated Print Handler (eliminates parent page leakage & 3-page bug)
  const handlePrint = () => {
    setIsPrinting(true);
    const html = generateInvoiceHtml(order);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      setIsPrinting(false);
      window.print();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print failed:', e);
      } finally {
        setIsPrinting(false);
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    };

    // Ensure images (signature) load before printing
    const images = doc.querySelectorAll('img');
    let loaded = 0;
    const total = images.length;

    if (total === 0) {
      setTimeout(triggerPrint, 250);
    } else {
      let isTriggered = false;
      const onImageDone = () => {
        loaded++;
        if (loaded === total && !isTriggered) {
          isTriggered = true;
          setTimeout(triggerPrint, 150);
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          onImageDone();
        } else {
          img.onload = onImageDone;
          img.onerror = onImageDone;
        }
      });

      // Fallback timeout in case image never fires
      setTimeout(() => {
        if (!isTriggered) {
          isTriggered = true;
          triggerPrint();
        }
      }, 700);
    }
  };

  // Direct HTML Invoice File Download
  const handleDownloadHtml = () => {
    const html = generateInvoiceHtml(order);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SWADESH_Luxe_Invoice_${invoiceNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="swadesh-invoice-modal-root"
      className="fixed inset-0 z-[100000] overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-background rounded-2xl sm:rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Top Control Bar */}
        <div className="p-3 sm:p-4 bg-muted/60 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="truncate">
              <h3 className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                Official GST Tax Invoice • {invoiceNo}
              </h3>
              <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Exact 1-Page A4 Ready
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Download HTML */}
            <Button
              onClick={handleDownloadHtml}
              size="sm"
              variant="outline"
              title="Download standalone HTML invoice"
              className="rounded-xl font-bold text-xs gap-1 h-9 px-2.5 sm:px-3 border-border hover:bg-muted"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save HTML</span>
            </Button>

            {/* Print / Save as PDF */}
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              size="sm"
              className="rounded-xl font-bold bg-[#ff3f6c] hover:bg-[#e0355f] text-white gap-1.5 h-9 px-3 sm:px-4 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'Preparing...' : 'Print / Save as PDF (1 Page)'}</span>
            </Button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* On-Screen Invoice Document Body */}
        <div
          id="swadesh-invoice-printable"
          className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-4 text-foreground bg-white dark:bg-zinc-950 text-xs font-sans"
        >
          {/* Header & Seller Info */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  🇮🇳
                </span>
                <span className="text-lg font-black tracking-tight text-foreground">
                  SWADESH Luxe
                </span>
              </div>
              <p className="text-[10.5px] font-bold text-muted-foreground mt-0.5">
                SWADESH Retail Technologies Private Limited
              </p>
              <p className="text-[9.5px] text-muted-foreground max-w-sm leading-relaxed mt-0.5">
                Registered Office: DLF Cyber City, Tower B, Phase 2, Gurugram, Haryana - 122002, India
              </p>
              <p className="text-[9.5px] text-muted-foreground">
                <strong>GSTIN:</strong> 07AABCN1234F1Z5 | <strong>CIN:</strong> U74999DL2024PTC123456
              </p>
              <p className="text-[9.5px] text-muted-foreground">
                <strong>Email:</strong> support@swadeshluxe.in | <strong>Toll Free:</strong> 1800-SWADESH
              </p>
            </div>

            <div className="text-left sm:text-right space-y-0.5">
              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-500/20">
                Tax Invoice / Bill of Supply
              </span>
              <p className="font-extrabold text-xs sm:text-sm pt-0.5 text-foreground">
                Invoice No: <span className="font-mono">{invoiceNo}</span>
              </p>
              <p className="text-muted-foreground text-[10px]">
                Invoice Date: <strong className="text-foreground">{invoiceDate}</strong>
              </p>
              <p className="text-muted-foreground text-[10px]">
                Order No: <strong className="font-mono text-foreground">{order.orderNumber}</strong>
              </p>
              <p className="text-muted-foreground text-[10px]">
                Order Date: <strong className="text-foreground">{formatDate(order.createdAt)}</strong>
              </p>
            </div>
          </div>

          {/* Billing & Shipping Address Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-muted/20 border border-border">
            <div className="space-y-0.5">
              <p className="font-extrabold text-[10px] uppercase tracking-wider text-muted-foreground">
                Billing & Shipping Address
              </p>
              <p className="font-bold text-xs text-foreground">
                {order.shippingAddress?.recipientName ||
                  (order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : '') ||
                  'Valued Customer'}
              </p>
              <p className="text-muted-foreground text-[10.5px]">
                {order.shippingAddress?.street || 'Customer Address'}
              </p>
              <p className="text-muted-foreground text-[10.5px]">
                {order.shippingAddress?.city ? `${order.shippingAddress.city}, ` : ''}
                {order.shippingAddress?.state || 'India'}
                {order.shippingAddress?.postalCode ? ` - ${order.shippingAddress.postalCode}` : ''}
              </p>
              <p className="text-muted-foreground text-[10px]">
                <strong>Phone:</strong> {order.shippingAddress?.phone || 'N/A'} |{' '}
                <strong>Place of Supply:</strong> {order.shippingAddress?.state || 'India'} (State Code: 07)
              </p>
            </div>

            <div className="space-y-0.5 sm:text-right">
              <p className="font-extrabold text-[10px] uppercase tracking-wider text-muted-foreground">
                Payment & Dispatch Summary
              </p>
              <p className="text-muted-foreground text-[10.5px]">
                <strong>Payment Mode:</strong>{' '}
                {order.payment?.provider || (order.status === 'CANCELLED' ? 'Cancelled' : 'Prepaid / UPI / Card')}
              </p>
              <p className="text-muted-foreground text-[10.5px]">
                <strong>Payment Status:</strong>{' '}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {order.payment?.status || (order.status === 'CANCELLED' ? 'CANCELLED' : 'PAID / CONFIRMED')}
                </span>
              </p>
              <p className="text-muted-foreground font-mono text-[9.5px]">
                <strong>Txn Ref:</strong>{' '}
                {order.payment?.transactionId || (order.id ? order.id.slice(0, 16).toUpperCase() : 'TXN-SWADESH')}
              </p>
              <p className="text-muted-foreground font-mono text-[9.5px]">
                <strong>AWB / Tracking:</strong> {order.shipment?.awbNumber || order.trackingNumber || 'SWD-EXP-IND'}
              </p>
              <div className="pt-0.5 flex sm:justify-end items-center gap-1 text-emerald-600 font-bold text-[9.5px]">
                <ShieldCheck className="w-3 h-3" /> 100% Verified Digital Invoice
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted text-[9px] font-black uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 px-2.5 text-center w-8">#</th>
                  <th className="py-2 px-2.5">Item Description</th>
                  <th className="py-2 px-2.5 w-24">HSN Code</th>
                  <th className="py-2 px-2.5 text-center w-12">Qty</th>
                  <th className="py-2 px-2.5 text-right w-24">Unit Price</th>
                  <th className="py-2 px-2.5 text-right w-24">Taxable Val</th>
                  <th className="py-2 px-2.5 text-right w-20">GST (18%)</th>
                  <th className="py-2 px-2.5 text-right w-24">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[10.5px]">
                {items.map((item, idx) => {
                  const itemTotal = Number(item.totalPrice || item.unitPrice * item.quantity);
                  const itemTaxable = Number((itemTotal / 1.18).toFixed(2));
                  const itemGst = Number((itemTotal - itemTaxable).toFixed(2));

                  return (
                    <tr key={item.id || idx} className="hover:bg-muted/20">
                      <td className="py-2 px-2.5 text-center font-bold text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 px-2.5">
                        <p className="font-bold text-foreground">{item.productTitle}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {item.variantTitle ? `Variant: ${item.variantTitle} | ` : ''}SKU: {item.sku || 'NV-SKU-001'}
                        </p>
                      </td>
                      <td className="py-2 px-2.5 font-mono text-muted-foreground text-[10px]">85189000</td>
                      <td className="py-2 px-2.5 text-center font-bold">{item.quantity}</td>
                      <td className="py-2 px-2.5 text-right font-medium">{formatPrice(item.unitPrice)}</td>
                      <td className="py-2 px-2.5 text-right font-medium">{formatPrice(itemTaxable)}</td>
                      <td className="py-2 px-2.5 text-right text-muted-foreground">{formatPrice(itemGst)}</td>
                      <td className="py-2 px-2.5 text-right font-extrabold text-foreground">
                        {formatPrice(itemTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Grand Total Calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
            {/* Tax Computation Table & Terms (Left) */}
            <div className="sm:col-span-7 space-y-2.5">
              <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1 text-[10px]">
                <p className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground">
                  GST Tax Computation Summary
                </p>
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxable Amount</span>
                  <span className="font-semibold text-foreground">{formatPrice(taxableValue)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Central GST (CGST @ 9.00%)</span>
                  <span className="font-semibold text-foreground">{formatPrice(cgst)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>State GST (SGST @ 9.00%)</span>
                  <span className="font-semibold text-foreground">{formatPrice(sgst)}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/60">
                  <span>Total Tax Amount (18%)</span>
                  <span>{formatPrice(totalTax)}</span>
                </div>
              </div>

              {/* Terms & Return policy */}
              <div className="text-[9px] text-muted-foreground space-y-0.5">
                <p className="font-bold text-foreground">Terms & Conditions:</p>
                <p>1. Goods once sold are eligible for 7 to 14 days return/replacement as per SWADESH Luxe policy.</p>
                <p>2. This is a computer generated invoice and requires no physical signature.</p>
                <p>3. All disputes are subject to Gurugram / Delhi jurisdiction only.</p>
              </div>
            </div>

            {/* Price Summary & Authorized Seal (Right) */}
            <div className="sm:col-span-5 space-y-2.5">
              <div className="p-3 rounded-xl border border-border bg-card space-y-1.5 text-[10.5px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Subtotal</span>
                  <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping & Handling</span>
                  <span className="font-semibold text-foreground">
                    {shipping === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : formatPrice(shipping)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Applicable GST (18%)</span>
                  <span className="font-semibold text-foreground">{formatPrice(totalTax)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm font-black text-foreground pt-1.5 border-t border-border">
                  <span>Grand Total (INR)</span>
                  <span className="text-[#ff3f6c]">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {/* Authorized Signatory Block */}
              <div className="p-2.5 rounded-xl border border-border text-center space-y-1 bg-muted/10">
                <p className="font-extrabold text-[9px] text-muted-foreground uppercase tracking-wider">
                  For SWADESH Retail Technologies Pvt Ltd
                </p>
                <div className="h-10 flex items-center justify-center py-0.5 bg-white/95 rounded-lg px-2 border border-border/40">
                  <img
                    src="/signature.png"
                    alt="Signature of Mrityunjay Kumar"
                    className="h-8 w-auto max-w-[150px] object-contain mx-auto select-none"
                  />
                </div>
                <div className="border-t border-border/60 pt-0.5">
                  <p className="text-[11px] font-black text-foreground font-sans tracking-wide">
                    Mrityunjay Kumar
                  </p>
                  <p className="text-[8px] text-muted-foreground font-semibold">
                    Authorized Signatory (Finance & Compliance)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer Note */}
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between text-[9px] text-muted-foreground gap-1">
            <span>Thank you for shopping with SWADESH Luxe! • ॥ अतिथिदेवो भवः ॥</span>
            <span>www.swadeshluxe.in • 24x7 Concierge Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
