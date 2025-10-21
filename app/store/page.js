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
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Chess Store</h1>
        <p className="text-sm text-gray-600">Buy boards, pieces, clocks, books, and study materials.</p>
      </div>

      {error && (
        <Card className="mb-6 border-red-300/60 bg-red-50/80 text-red-700">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">Loading...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
            {products.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>{currencyFormat(p.price, p.currency)}</CardDescription>
                </CardHeader>
                <CardContent>
                  {p.images?.[0]?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0].url} alt={p.name} className="mb-3 h-40 w-full rounded-lg object-cover" />
                  )}
                  <p className="text-sm text-gray-600 min-h-10">{p.description || ''}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">In stock: {p.stock}</span>
                    <Button size="sm" onClick={() => addToCart(p.id)}>Add to cart</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Cart</CardTitle>
              <CardDescription>Review items and checkout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.length === 0 && <p className="text-sm text-gray-500">Cart is empty</p>}
              {cartItems.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{quantity} × {currencyFormat(product.price, product.currency)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={() => removeFromCart(product.id)}>-</Button>
                    <span>{quantity}</span>
                    <Button size="icon" variant="outline" onClick={() => addToCart(product.id)}>+</Button>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="text-lg font-semibold">{currencyFormat(total, currency)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button className="w-full" onClick={checkout} disabled={ordering || cartItems.length === 0}> {ordering ? 'Processing...' : 'Checkout'} </Button>
                {orderResult && (
                  <p className="text-sm text-green-600">Order placed! ID: {orderResult.id}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
