'use client';

import React, { useEffect, useState } from 'react';
import { Star, Trash2, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'HIDDEN' | 'VERIFIED'>('ALL');

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/reviews/admin/all');
      setReviews(data.data || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleToggleHide = async (id: string) => {
    try {
      await apiClient.patch(`/reviews/admin/${id}/toggle-hide`);
      await fetchReviews();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle review visibility');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    try {
      await apiClient.delete(`/reviews/admin/${id}`);
      await fetchReviews();
    } catch (err: any) {
      alert(err.message || 'Failed to delete review');
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'HIDDEN') return r.isHidden;
    if (filter === 'VERIFIED') return r.isVerifiedPurchase;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Review Moderation Queue</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Moderate ratings, hide inappropriate reviews, and verify verified purchase authenticity
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilter('ALL')}
            className="rounded-xl text-xs font-bold"
          >
            All ({reviews.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'HIDDEN' ? 'default' : 'outline'}
            onClick={() => setFilter('HIDDEN')}
            className="rounded-xl text-xs font-bold text-amber-600"
          >
            Hidden ({reviews.filter((r) => r.isHidden).length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'VERIFIED' ? 'default' : 'outline'}
            onClick={() => setFilter('VERIFIED')}
            className="rounded-xl text-xs font-bold text-emerald-600"
          >
            Verified Only
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Review Content</th>
                <th className="p-4">Verification</th>
                <th className="p-4">Visibility</th>
                <th className="p-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {isLoading ? 'Loading reviews...' : 'No reviews match current filter.'}
                  </td>
                </tr>
              ) : (
                filteredReviews.map((r: any) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-muted/20 transition-colors ${
                      r.isHidden ? 'bg-amber-500/5 opacity-70' : ''
                    }`}
                  >
                    <td className="p-4 font-bold text-foreground max-w-[160px]">
                      <p className="line-clamp-1">{r.product?.title}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{r.product?.slug}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{r.user?.firstName} {r.user?.lastName}</p>
                      <p className="text-[10px] text-muted-foreground">{r.user?.email}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="font-black text-foreground">{r.rating}/5</span>
                      </div>
                    </td>
                    <td className="p-4 max-w-sm">
                      {r.title && <p className="font-bold text-foreground mb-0.5">{r.title}</p>}
                      <p className="text-muted-foreground line-clamp-2">{r.comment}</p>
                      <span className="text-[10px] text-muted-foreground/80 mt-1 block">{formatDate(r.createdAt)}</span>
                    </td>
                    <td className="p-4">
                      {r.isVerifiedPurchase ? (
                        <Badge variant="success" className="text-[10px] gap-1 inline-flex items-center">
                          <ShieldCheck className="w-3 h-3" /> Verified Buyer
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Unverified</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      {r.isHidden ? (
                        <Badge variant="destructive" className="text-[10px]">Hidden</Badge>
                      ) : (
                        <Badge variant="default" className="bg-emerald-600 text-[10px]">Visible</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button
                        size="sm"
                        variant={r.isHidden ? 'default' : 'outline'}
                        onClick={() => handleToggleHide(r.id)}
                        className="rounded-xl text-xs font-semibold gap-1.5"
                      >
                        {r.isHidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Restore
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Hide Review
                          </>
                        )}
                      </Button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        title="Delete Review"
                        className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 inline-flex items-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
