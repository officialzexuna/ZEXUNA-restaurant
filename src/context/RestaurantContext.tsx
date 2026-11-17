import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { fetchAdminProfile } from '../services/authentication';
import { DEFAULT_SETTINGS, DEMO_CATEGORIES, DEMO_MENU_ITEMS, DEMO_OFFERS } from '../data/demoSeed';
import type {
  AdminRecord,
  CartItem,
  MenuCategory,
  MenuItem,
  Offer,
  RestaurantSettings,
} from '../types/restaurant';

interface RestaurantContextValue {
  categories: MenuCategory[];
  items: MenuItem[];
  offers: Offer[];
  settings: RestaurantSettings;
  seeded: boolean;
  tablesSeeded: boolean;
  catalogLoading: boolean;
  catalogError: string | null;
  refreshCatalog: () => Promise<void>;

  user: User | null;
  adminProfile: AdminRecord | null;
  authReady: boolean;
  isAdmin: boolean;
  refreshAdminProfile: () => Promise<void>;

  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: MenuItem, qty?: number) => void;
  updateCartQty: (itemId: string, qty: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  totalCartCount: number;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<MenuCategory[]>(DEMO_CATEGORIES);
  const [items, setItems] = useState<MenuItem[]>(DEMO_MENU_ITEMS);
  const [offers, setOffers] = useState<Offer[]>(DEMO_OFFERS);
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULT_SETTINGS);
  const [seeded, setSeeded] = useState(false);
  const [tablesSeeded, setTablesSeeded] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminRecord | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const resp = await fetch('/api/catalog');
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to load menu catalog');
      setCategories(data.categories || DEMO_CATEGORIES);
      setItems(data.items || DEMO_MENU_ITEMS);
      setOffers(data.offers || []);
      setSettings(data.settings || DEFAULT_SETTINGS);
      setSeeded(Boolean(data.seeded));
      setTablesSeeded(Boolean(data.tablesSeeded));
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : 'Unable to reach catalog service');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const refreshAdminProfile = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      setAdminProfile(null);
      return;
    }
    const profile = await fetchAdminProfile(current.uid);
    setAdminProfile(profile);
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const profile = await fetchAdminProfile(nextUser.uid);
        setAdminProfile(profile);
      } else {
        setAdminProfile(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const addToCart = useCallback((item: MenuItem, qty: number = 1) => {
    if (!item.available) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.item.itemId === item.itemId);
      if (existing) {
        return prev.map((c) =>
          c.item.itemId === item.itemId ? { ...c, quantity: c.quantity + qty } : c
        );
      }
      return [...prev, { item, quantity: qty }];
    });
  }, []);

  const updateCartQty = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.item.itemId !== itemId));
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.item.itemId === itemId ? { ...c, quantity: Math.min(50, qty) } : c))
    );
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.itemId !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const totalCartCount = cart.reduce((sum, entry) => sum + entry.quantity, 0);
  const isAdmin = Boolean(user && user.emailVerified && adminProfile && adminProfile.active);

  return (
    <RestaurantContext.Provider
      value={{
        categories,
        items,
        offers,
        settings,
        seeded,
        tablesSeeded,
        catalogLoading,
        catalogError,
        refreshCatalog,
        user,
        adminProfile,
        authReady,
        isAdmin,
        refreshAdminProfile,
        cart,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        totalCartCount,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant(): RestaurantContextValue {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurant must be used inside RestaurantProvider');
  return ctx;
}
