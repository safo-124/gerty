'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const currencyFormat = (n, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(Number(n || 0));

export default function StorePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState({}); // productId -> quantity
  const [email, setEmail] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  useEffect(() => {
    (async () => {
      setError('');
      setLoading(true);
      try {
        const res = await fetch('/api/store/products');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load products');
        setProducts(data.products || []);
      } catch (e) {
        setError(e.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addToCart = (id) => setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const removeFromCart = (id) => setCart((prev) => {
    const q = (prev[id] || 0) - 1;
    const next = { ...prev };
    if (q <= 0) delete next[id]; else next[id] = q;
    return next;
  });
  const clearCart = () => setCart({});

  const cartItems = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return Object.entries(cart).map(([productId, quantity]) => ({ product: map.get(productId), quantity }));
  }, [cart, products]);

  const total = useMemo(() => cartItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0), [cartItems]);
  const currency = products[0]?.currency || 'USD';

  const checkout = async () => {
    setOrdering(true);
    setOrderResult(null);
    setError('');
    try {
      const items = cartItems.map((ci) => ({ productId: ci.product.id, quantity: ci.quantity }));
      if (items.length === 0) throw new Error('Your cart is empty');
      if (!email) throw new Error('Please enter an email');
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed');
      setOrderResult(data.order);
      clearCart();
    } catch (e) {
      setError(e.message || 'Checkout failed');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 relative overflow-hidden">
      {/* Animated background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-pink-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-200/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="relative container max-w-7xl mx-auto px-4 py-12">
        {/* Hero Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 mb-4">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-sm font-semibold text-purple-700 uppercase tracking-wider">Premium Chess Equipment</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Chess Store
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover premium chess boards, pieces, clocks, books, and study materials for players at every level
          </p>
        </div>

        {error && (
          <div className="mb-8 max-w-4xl mx-auto rounded-2xl bg-red-50/80 backdrop-blur-sm border-2 border-red-200 p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-bold text-red-900 mb-1">Something went wrong</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-purple-100 shadow-xl">
                <div className="w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-700 font-medium text-lg">Loading products...</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* Products Grid */}
            <div className="grid gap-6 sm:grid-cols-2 auto-rows-fr">
              {products.map((p) => (
                <div key={p.id} className="group rounded-3xl border-2 border-purple-100 bg-white/80 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col">
                  {/* Product Image */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 aspect-[4/3]">
                    {p.images?.[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={p.images[0].url} 
                        alt={p.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-20 h-20 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md">
                      <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {currencyFormat(p.price, p.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Product Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-2">
                      {p.description || 'Premium chess equipment for enthusiasts'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-purple-100">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">{p.stock} in stock</span>
                      </div>
                      <button
                        onClick={() => addToCart(p.id)}
                        className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-5 py-2 text-sm font-semibold shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Add to cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Shopping Cart */}
            <div className="lg:sticky lg:top-8 h-fit">
              <div className="rounded-3xl border-2 border-purple-200 bg-white/90 backdrop-blur-md shadow-xl overflow-hidden">
                {/* Cart Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Your Cart</h2>
                      <p className="text-purple-100 text-sm">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</p>
                    </div>
                  </div>
                </div>

                {/* Cart Content */}
                <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <p className="text-gray-500 font-medium">Your cart is empty</p>
                      <p className="text-sm text-gray-400 mt-1">Add some items to get started</p>
                    </div>
                  ) : (
                    cartItems.map(({ product, quantity }) => (
                      <div key={product.id} className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/30 p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1">{product.name}</h4>
                            <p className="text-sm text-gray-600">
                              {quantity} × {currencyFormat(product.price, product.currency)}
                            </p>
                          </div>
                          <div className="font-bold text-purple-600">
                            {currencyFormat(product.price * quantity, product.currency)}
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-3 bg-white rounded-lg p-2 border border-purple-100">
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-600 font-bold transition-colors flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-bold text-gray-900">{quantity}</span>
                          <button
                            onClick={() => addToCart(product.id)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-green-100 hover:text-green-600 text-gray-600 font-bold transition-colors flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart Footer */}
                {cartItems.length > 0 && (
                  <div className="border-t-2 border-purple-100 p-6 space-y-4 bg-gradient-to-br from-purple-50/50 to-pink-50/50">
                    <div className="flex items-center justify-between text-lg">
                      <span className="font-semibold text-gray-700">Subtotal</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {currencyFormat(total, currency)}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <input
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none transition-all bg-white"
                      />
                      <button
                        onClick={checkout}
                        disabled={ordering || cartItems.length === 0}
                        className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-4 font-bold text-lg shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-300 hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {ordering ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Checkout Now
                          </>
                        )}
                      </button>
                      {orderResult && (
                        <div className="rounded-xl bg-green-50 border-2 border-green-200 p-4 animate-fade-in">
                          <div className="flex items-center gap-2 text-green-700">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold">Order placed successfully!</span>
                          </div>
                          <p className="text-sm text-green-600 mt-1 ml-7">Order ID: {orderResult.id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
