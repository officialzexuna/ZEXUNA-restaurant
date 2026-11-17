import React, { useState } from 'react';
import { ASSETS } from '../../data/demoSeed';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  adminDeleteMenuItem,
  adminUpsertMenuCategory,
  adminUpsertMenuItem,
} from '../../services/database';
import type { MenuItem } from '../../types/restaurant';
import { formatCurrency } from '../../utils/pricing';

export function MenuManagement() {
  const { items, categories, settings, refreshCatalog } = useRestaurant();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.categoryId || 'chicken-biryani');
  const [imageUrl, setImageUrl] = useState<string>(ASSETS.chickenBiryani);
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [vegetarian, setVegetarian] = useState(false);
  const [allergensText, setAllergensText] = useState('Dairy');
  const [available, setAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  function loadItemIntoForm(item: MenuItem) {
    setEditingId(item.itemId);
    setName(item.name);
    setDescription(item.description);
    setCategoryId(item.categoryId);
    setImageUrl(item.imageUrl);
    setOriginalPrice(String(item.originalPrice));
    setDiscountedPrice(item.discountedPrice ? String(item.discountedPrice) : '');
    setVegetarian(item.vegetarian);
    setAllergensText((item.allergens || []).join(', '));
    setAvailable(item.available);
    setFeatured(item.featured);
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setDescription('');
    setCategoryId(categories[0]?.categoryId || 'chicken-biryani');
    setImageUrl(ASSETS.chickenBiryani);
    setOriginalPrice('');
    setDiscountedPrice('');
    setVegetarian(false);
    setAllergensText('');
    setAvailable(true);
    setFeatured(false);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.length < 480) {
        setImageUrl(reader.result);
      } else {
        setError('For Firestore size limits, please provide a hosted image URL or select a culinary asset preset below.');
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveDish(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const slug =
        editingId ||
        `${name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 48)}-${Date.now().toString(36)}`;
      const parsedOrig = Number(originalPrice);
      const parsedDisc = discountedPrice.trim() ? Number(discountedPrice) : null;

      if (Number.isNaN(parsedOrig) || parsedOrig < 0) {
        throw new Error('Original price must be a non-negative number.');
      }
      if (parsedDisc !== null && (Number.isNaN(parsedDisc) || parsedDisc < 0 || parsedDisc > parsedOrig)) {
        throw new Error('Discounted price must be between 0 and original price.');
      }

      await adminUpsertMenuItem({
        itemId: slug,
        name: name.trim(),
        description: description.trim(),
        categoryId,
        imageUrl: imageUrl.trim() || ASSETS.chickenBiryani,
        originalPrice: parsedOrig,
        discountedPrice: parsedDisc,
        vegetarian,
        allergens: allergensText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20),
        available,
        featured,
        isDemo: false,
      });

      await refreshCatalog();
      setMessage(editingId ? `Updated "${name.trim()}".` : `Created "${name.trim()}".`);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save dish');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDish(item: MenuItem) {
    setError(null);
    try {
      await adminDeleteMenuItem(item.itemId);
      await refreshCatalog();
      setMessage(`Deleted "${item.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete dish');
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setError(null);
    try {
      const catId = newCatName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      await adminUpsertMenuCategory({
        categoryId: catId,
        name: newCatName.trim(),
        description: newCatDesc.trim() || newCatName.trim(),
        imageUrl: ASSETS.heroFallback,
        displayOrder: categories.length + 1,
        active: true,
      });
      await refreshCatalog();
      setNewCatName('');
      setNewCatDesc('');
      setMessage(`Added category "${newCatName.trim()}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
    }
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#C9A45C] mb-1">Catalog Control</p>
        <h1 className="font-display text-3xl text-white">Menu Management</h1>
      </div>

      {message && (
        <div className="p-4 bg-[#121212] border border-[#C9A45C]/50 text-xs text-[#E6CC91]">
          {message}
        </div>
      )}
      {error && (
        <div role="alert" className="p-4 bg-red-950/40 border border-red-500/40 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Dish Form */}
        <form
          onSubmit={handleSaveDish}
          className="xl:col-span-5 bg-[#121212] border border-white/10 p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-white">
              {editingId ? 'Edit Dish' : 'Add New Dish'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-[#C9A45C] hover:underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div>
            <label htmlFor="dish-name" className="block text-xs text-[#B8B8B8] mb-1">
              Dish Name
            </label>
            <input
              id="dish-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white"
            />
          </div>

          <div>
            <label htmlFor="dish-cat" className="block text-xs text-[#B8B8B8] mb-1">
              Category
            </label>
            <select
              id="dish-cat"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white"
            >
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dish-desc" className="block text-xs text-[#B8B8B8] mb-1">
              Description
            </label>
            <textarea
              id="dish-desc"
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="dish-orig-price" className="block text-xs text-[#B8B8B8] mb-1">
                Original Price ({settings.currency})
              </label>
              <input
                id="dish-orig-price"
                type="number"
                min="0"
                step="0.01"
                required
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 font-mono text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="dish-disc-price" className="block text-xs text-[#B8B8B8] mb-1">
                Discounted Price (Optional)
              </label>
              <input
                id="dish-disc-price"
                type="number"
                min="0"
                step="0.01"
                value={discountedPrice}
                onChange={(e) => setDiscountedPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 font-mono text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="dish-image-url" className="block text-xs text-[#B8B8B8] mb-1">
              Food Image URL or Culinary Asset
            </label>
            <input
              id="dish-image-url"
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-xs text-white mb-2"
            />
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                { label: 'Chicken Biryani', val: ASSETS.chickenBiryani },
                { label: 'Mutton Biryani', val: ASSETS.muttonBiryani },
                { label: 'Veg Biryani', val: ASSETS.vegBiryani },
                { label: 'Starters', val: ASSETS.starters },
                { label: 'Main Course', val: ASSETS.mainCourse },
                { label: 'Dessert', val: ASSETS.desserts },
                { label: 'Beverage', val: ASSETS.beverages },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setImageUrl(preset.val)}
                  className="px-2 py-1 text-[11px] bg-[#090909] border border-white/15 text-[#B8B8B8] hover:text-white"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-xs text-[#B8B8B8]"
            />
          </div>

          <div>
            <label htmlFor="dish-allergens" className="block text-xs text-[#B8B8B8] mb-1">
              Allergens (comma-separated)
            </label>
            <input
              id="dish-allergens"
              type="text"
              value={allergensText}
              onChange={(e) => setAllergensText(e.target.value)}
              placeholder="Dairy, Tree Nuts, Gluten"
              className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-xs text-white"
            />
          </div>

          <div className="flex flex-wrap gap-5 pt-1 text-xs text-[#B8B8B8]">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vegetarian}
                onChange={(e) => setVegetarian(e.target.checked)}
                className="accent-[#C9A45C]"
              />
              <span>Vegetarian</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="accent-[#C9A45C]"
              />
              <span>Available</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="accent-[#C9A45C]"
              />
              <span>Featured</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] disabled:opacity-50"
          >
            {saving ? 'Saving to Firestore...' : editingId ? 'Update Dish' : 'Create Dish'}
          </button>
        </form>

        {/* Menu List & Category Creator */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-[#121212] border border-white/10 p-6 space-y-4">
            <h2 className="font-display text-xl text-white">Menu Inventory ({items.length})</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.itemId}
                  className="bg-[#090909] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#B8B8B8] mb-1">
                      <span>{item.categoryId}</span>
                      <span>·</span>
                      <span>{item.vegetarian ? 'Veg' : 'Non-Veg'}</span>
                      <span>·</span>
                      <span className={item.available ? 'text-emerald-400' : 'text-red-400'}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </span>
                      {item.isDemo && (
                        <>
                          <span>·</span>
                          <span className="text-[#C9A45C]">Demo Record</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">{item.name}</h3>
                    <p className="font-mono text-xs text-[#E6CC91] mt-1 tabular-nums">
                      {formatCurrency(item.discountedPrice ?? item.originalPrice, settings.currency)}
                      {item.discountedPrice !== null && (
                        <span className="text-[#B8B8B8] line-through ml-2">
                          {formatCurrency(item.originalPrice, settings.currency)}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => loadItemIntoForm(item)}
                      className="px-3 py-1.5 border border-[#C9A45C]/40 text-xs text-[#E6CC91] hover:bg-[#1C1C1C]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteDish(item)}
                      className="px-3 py-1.5 border border-red-500/40 text-xs text-red-300 hover:bg-red-950/40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleAddCategory}
            className="bg-[#121212] border border-white/10 p-6 space-y-4"
          >
            <h2 className="font-display text-lg text-white">Add Menu Category</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name"
                className="px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
              />
              <input
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Short description"
                className="px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1C1C1C] border border-[#C9A45C]/40 text-xs font-semibold text-[#E6CC91] uppercase tracking-wider hover:bg-[#C9A45C] hover:text-[#090909]"
            >
              Save Category
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
