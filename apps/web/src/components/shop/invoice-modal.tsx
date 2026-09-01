'use client';

import React, { useRef } from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  Building2,
  CheckCircle2,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { OrderDto } from '@ecommerce/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface InvoiceModalProps {
  order: OrderDto;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceModal({ order, isOpen, onClose }: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNo = `INV-2026-${order.orderNumber.replace('ORD-', '')}`;
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

  return (
    <div className="fixed inset-0 z-[100000] overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-background rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Control Bar (Hidden in Print) */}
        <div className="p-4 bg-muted/50 border-b border-border flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-sm sm:text-base text-foreground">
              Official GST Tax Invoice • {invoiceNo}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="rounded-xl font-bold bg-[#ff3f6c] hover:bg-[#e0355f] text-white gap-1.5 shadow-md"
            >
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div
          ref={printRef}
          className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 text-foreground bg-white dark:bg-zinc-950 text-xs font-sans print:p-0 print:overflow-visible print:bg-white print:text-black"
        >
          {/* Header & Seller Info */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-[#ff3f6c] text-white flex items-center justify-center font-black text-base shadow">
                  N
                </span>
                <span className="text-xl font-black tracking-tight text-foreground print:text-black">
                  NovaStore
                </span>
              </div>
              <p className="text-[11px] font-bold text-muted-foreground mt-1">
                NovaStore Retail Technologies Private Limited
              </p>
              <p className="text-[10px] text-muted-foreground max-w-xs leading-relaxed">
                Registered Office: DLF Cyber City, Tower B, Phase 2, Gurugram, Haryana - 122002, India
              </p>
              <p className="text-[10px] text-muted-foreground">
                <strong>GSTIN:</strong> 07AABCN1234F1Z5 | <strong>CIN:</strong> U74999DL2024PTC123456
              </p>
              <p className="text-[10px] text-muted-foreground">
                <strong>Email:</strong> support@novastore.com | <strong>Toll Free:</strong> 1800-123-9999
              </p>
            </div>

            <div className="text-right sm:text-right space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider border border-emerald-500/20">
                Tax Invoice / Bill of Supply
              </span>
              <p className="font-extrabold text-sm pt-1">
                Invoice No: <span className="font-mono">{invoiceNo}</span>
              </p>
              <p className="text-muted-foreground text-[11px]">
                Invoice Date: <strong>{invoiceDate}</strong>
              </p>
              <p className="text-muted-foreground text-[11px]">
                Order No: <strong className="font-mono">{order.orderNumber}</strong>
              </p>
              <p className="text-muted-foreground text-[11px]">
                Order Date: <strong>{formatDate(order.createdAt)}</strong>
              </p>
            </div>
          </div>

          {/* Billing & Shipping Address Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-2xl bg-muted/30 border border-border">
            <div className="space-y-1">
              <p className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                Billing & Shipping Address
              </p>
              <p className="font-bold text-sm text-foreground print:text-black">
                {order.shippingAddress?.recipientName || 'Valued Customer'}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress?.street}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.postalCode}
              </p>
              <p className="text-muted-foreground">
                <strong>Phone:</strong> {order.shippingAddress?.phone || 'N/A'}
              </p>
              <p className="text-muted-foreground">
                <strong>Place of Supply:</strong> {order.shippingAddress?.state || 'India'} (State Code: 07)
              </p>
            </div>

            <div className="space-y-1 sm:text-right">
              <p className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                Payment & Dispatch Summary
              </p>
              <p className="text-muted-foreground">
                <strong>Payment Mode:</strong> {order.payment?.provider || 'Prepaid / UPI / Card'}
              </p>
              <p className="text-muted-foreground">
                <strong>Payment Status:</strong>{' '}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {order.payment?.status || 'PAID / CONFIRMED'}
                </span>
              </p>
              {order.payment?.transactionId && (
                <p className="text-muted-foreground font-mono text-[10px]">
                  <strong>Txn Ref:</strong> {order.payment.transactionId}
                </p>
              )}
              {order.trackingNumber && (
                <p className="text-muted-foreground font-mono text-[10px]">
                  <strong>AWB / Tracking:</strong> {order.trackingNumber}
                </p>
              )}
              <div className="pt-1 flex sm:justify-end items-center gap-1 text-emerald-600 font-bold text-[10px]">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Verified Digital Invoice
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-border rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted text-[10px] font-black uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="p-3 text-center w-10">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">HSN Code</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Taxable Val</th>
                  <th className="p-3 text-right">GST (18%)</th>
                  <th className="p-3 text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[11px]">
                {items.map((item, idx) => {
                  const itemTotal = Number(item.totalPrice || item.unitPrice * item.quantity);
                  const itemTaxable = Number((itemTotal / 1.18).toFixed(2));
                  const itemGst = Number((itemTotal - itemTaxable).toFixed(2));

                  return (
                    <tr key={item.id || idx} className="hover:bg-muted/20">
                      <td className="p-3 text-center font-bold text-muted-foreground">{idx + 1}</td>
                      <td className="p-3">
                        <p className="font-bold text-foreground print:text-black">{item.productTitle}</p>
                        <p className="text-[10px] text-muted-foreground">Variant: {item.variantTitle} | SKU: {item.sku || 'NV-SKU-001'}</p>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">85189000</td>
                      <td className="p-3 text-center font-bold">{item.quantity}</td>
                      <td className="p-3 text-right font-medium">{formatPrice(item.unitPrice)}</td>
                      <td className="p-3 text-right font-medium">{formatPrice(itemTaxable)}</td>
                      <td className="p-3 text-right text-muted-foreground">{formatPrice(itemGst)}</td>
                      <td className="p-3 text-right font-extrabold text-foreground print:text-black">
                        {formatPrice(itemTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Grand Total Calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
            {/* Tax Computation Table (Left) */}
            <div className="sm:col-span-7 space-y-3">
              <div className="p-3.5 rounded-2xl border border-border bg-muted/20 space-y-1.5 text-[11px]">
                <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
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
              <div className="text-[10px] text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">Terms & Conditions:</p>
                <p>1. Goods once sold are eligible for 7 to 14 days return/replacement as per NovaStore policy.</p>
                <p>2. This is a computer generated invoice and requires no physical signature.</p>
                <p>3. All disputes are subject to Gurugram / Delhi jurisdiction only.</p>
              </div>
            </div>

            {/* Price Summary & Authorized Seal (Right) */}
            <div className="sm:col-span-5 space-y-3">
              <div className="p-4 rounded-2xl border border-border bg-card space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Subtotal</span>
                  <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Coupon / Promotional Discount</span>
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
                <div className="flex justify-between text-sm sm:text-base font-black text-foreground pt-2.5 border-t border-border">
                  <span>Grand Total (INR)</span>
                  <span className="text-[#ff3f6c]">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {/* Authorized Signatory Block */}
              <div className="p-3 rounded-2xl border border-border text-center space-y-1 bg-muted/10">
                <p className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider">
                  For NovaStore Retail Technologies Pvt Ltd
                </p>
                <div className="h-10 flex items-center justify-center font-serif italic text-primary font-bold text-sm">
                  Authorized Signatory
                </div>
                <p className="text-[9px] text-muted-foreground">Authorized Signatory (Finance & Compliance)</p>
              </div>
            </div>
          </div>

          {/* Bottom Footer Note */}
          <div className="pt-4 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Thank you for shopping with NovaStore!</span>
            <span>www.novastore.com • Support 24x7</span>
          </div>
        </div>

      </div>
    </div>
  );
}
