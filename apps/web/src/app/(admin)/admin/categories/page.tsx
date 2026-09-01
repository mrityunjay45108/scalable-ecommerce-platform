'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Layers, AlertCircle } from 'lucide-react';
import { CategoryDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [parentId, setParentId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCategories = async () => {
    try {
      const data = await apiClient.get('/categories/flat');
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setImageUrl('');
    setParentId('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (cat: CategoryDto) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImageUrl(cat.imageUrl || '');
    setParentId(cat.parentId || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        name,
        slug: slug || undefined,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        parentId: parentId || null,
      };

      if (editingCategory) {
        await apiClient.put(`/categories/${editingCategory.id}`, payload);
      } else {
        await apiClient.post('/categories', payload);
      }

      setShowModal(false);
      await fetchCategories();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await apiClient.delete(`/categories/${id}`);
      await fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Category Taxonomy</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage category tree, slugs, and storefront navigation hierarchy</p>
        </div>
        <Button onClick={handleOpenCreate} className="rounded-2xl gap-2 font-bold shadow-md">
          <Plus className="w-4 h-4" /> Create Category
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="p-5 rounded-3xl border bg-card shadow-sm space-y-3 relative flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">{cat.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cat.description || 'No description'}</p>
              {cat.parent && (
                <p className="text-[10px] text-primary font-semibold mt-2">
                  Parent: {cat.parent.name}
                </p>
              )}
            </div>

            <div className="pt-3 border-t text-[11px] text-muted-foreground flex justify-between items-center">
              <span>Slug: <strong className="font-mono text-foreground">{cat.slug}</strong></span>
              <span className="font-semibold">{cat.productsCount || 0} products</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Category Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCategory && !slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }
                  }}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Slug (Optional)</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. audio-headphones"
                  className="w-full h-9 px-3 rounded-xl border bg-background font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Parent Category (Optional)</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                >
                  <option value="">None (Top-Level Category)</option>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Banner Image URL (Optional)</label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-background"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
