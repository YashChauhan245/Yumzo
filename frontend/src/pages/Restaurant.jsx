import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import EmptyState from '../components/ui/EmptyState';
import { MenuSkeleton } from '../components/ui/Skeletons';
import PaginationControls from '../components/ui/PaginationControls';
import { cartAPI, getApiErrorMessage, restaurantsAPI } from '../services/api';

const withFallbackImage = (event, fallbackSrc) => {
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackSrc;
};

const cuisineFallbacks = {
  'North Indian': '/images/dishes/indian.png',
  'Italian': '/images/dishes/italian.png',
  'Japanese': '/images/dishes/japanese.png',
  'American': '/images/dishes/american.png',
  'Healthy': '/images/dishes/healthy.png',
  'Chinese': '/images/dishes/chinese.png',
  'South Indian': '/images/dishes/south_indian.png',
  'Mexican': '/images/dishes/mexican.png',
  'Mediterranean': '/images/dishes/mediterranean.png',
};

const getFallbackImage = (cuisine) => {
  return cuisineFallbacks[cuisine] || '/images/dishes/indian.png';
};

const MENU_CACHE_TTL_MS = 60 * 1000;
const REVIEWS_CACHE_TTL_MS = 60 * 1000;
const menuCache = new Map();
const reviewsCache = new Map();

const isFreshCache = (entry, ttlMs) => {
  return Boolean(entry) && Date.now() - entry.savedAt < ttlMs;
};

const Restaurant = () => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [foodType, setFoodType] = useState('all');
  const [addingItemId, setAddingItemId] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPagination, setReviewsPagination] = useState({
    page: 1,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
  });
  const [averageRating, setAverageRating] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [comboGoal, setComboGoal] = useState('quick_lunch');
  const [comboLoading, setComboLoading] = useState(false);
  const [smartCombo, setSmartCombo] = useState(null);
  const [addingCombo, setAddingCombo] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [id]);

  const loadMenu = useCallback(async (selectedCategory = category) => {
    setLoading(true);
    try {
      const menuCacheKey = `${id}::${selectedCategory || 'all'}`;
      const cachedMenu = menuCache.get(menuCacheKey);

      let data;
      if (isFreshCache(cachedMenu, MENU_CACHE_TTL_MS)) {
        data = cachedMenu.data;
      } else {
        const response = await restaurantsAPI.getMenu(id, {
          category: selectedCategory || undefined,
        });
        data = response?.data;
        menuCache.set(menuCacheKey, { data, savedAt: Date.now() });
      }

      setRestaurant(data?.data?.restaurant || null);
      setMenuItems(data?.data?.menuItems || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load menu.'));
      setRestaurant(null);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, [category, id]);

  useEffect(() => {
    loadMenu(category);
  }, [category, loadMenu]);

  const loadReviews = useCallback(async (requestedPage = 1) => {
    try {
      const reviewsCacheKey = `${id}::${requestedPage}`;
      const cachedReviews = reviewsCache.get(reviewsCacheKey);

      let data;
      if (isFreshCache(cachedReviews, REVIEWS_CACHE_TTL_MS)) {
        data = cachedReviews.data;
      } else {
        const response = await restaurantsAPI.getReviews(id, { page: requestedPage, limit: 5 });
        data = response?.data;
        reviewsCache.set(reviewsCacheKey, { data, savedAt: Date.now() });
      }

      setReviews(data?.data?.reviews || []);
      setAverageRating(Number(data?.data?.average_rating || 0));
      setReviewsPagination(
        data?.pagination || {
          page: requestedPage,
          totalPages: 1,
          hasPrevPage: requestedPage > 1,
          hasNextPage: false,
        },
      );
    } catch {
      setReviews([]);
      setAverageRating(0);
    }
  }, [id]);

  useEffect(() => {
    loadReviews(reviewsPage);
  }, [reviewsPage, loadReviews]);

  const categories = useMemo(() => {
    const set = new Set(menuItems.map((item) => item.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  const visibleMenuItems = useMemo(() => {
    if (foodType === 'veg') {
      return menuItems.filter((item) => item.is_veg);
    }
    if (foodType === 'nonveg') {
      return menuItems.filter((item) => !item.is_veg);
    }
    return menuItems;
  }, [menuItems, foodType]);

  const handleAddToCart = async (menuItemId) => {
    setAddingItemId(menuItemId);
    try {
      await cartAPI.addItem({ menu_item_id: menuItemId, quantity: 1 });
      window.dispatchEvent(new Event('cart:updated'));
      toast.success('Item added to cart');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not add item to cart.'));
    } finally {
      setAddingItemId('');
    }
  };

  const handleSubmitReview = async () => {
    setSubmittingReview(true);
    try {
      await restaurantsAPI.addReview(id, {
        rating: Number(reviewRating),
        review_text: reviewText.trim() || undefined,
      });

      // Review submission changes restaurant aggregates and paginated review list.
      for (const key of reviewsCache.keys()) {
        if (key.startsWith(`${id}::`)) reviewsCache.delete(key);
      }
      for (const key of menuCache.keys()) {
        if (key.startsWith(`${id}::`)) menuCache.delete(key);
      }

      toast.success('Review saved');
      setReviewText('');
      await Promise.all([loadReviews(1), loadMenu(category)]);
      setReviewsPage(1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not submit review.'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBuildCombo = async () => {
    setComboLoading(true);
    try {
      const { data } = await restaurantsAPI.getSmartCombo(id, { goal: comboGoal });
      const combo = data?.data?.combo || null;
      setSmartCombo(combo);
      if (combo?.items?.length) {
        toast.success('Smart combo ready');
      } else {
        toast('No combo could be generated from available menu items.');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not build smart combo right now.'));
      setSmartCombo(null);
    } finally {
      setComboLoading(false);
    }
  };

  const handleAddComboToCart = async () => {
    if (!smartCombo?.items?.length) return;
    setAddingCombo(true);
    try {
      await Promise.all(
        smartCombo.items.map((item) => cartAPI.addItem({ menu_item_id: item.id, quantity: 1 })),
      );
      window.dispatchEvent(new Event('cart:updated'));
      toast.success('Smart combo added to cart');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not add full combo to cart.'));
    } finally {
      setAddingCombo(false);
    }
  };

  return (
    <AppLayout>
      <div className="restaurant-page">
      <section className="surface-card rounded-2xl p-6 md:p-7">
        <h1 className="restaurant-title text-2xl font-semibold tracking-tight text-white md:text-3xl">{restaurant?.name || 'Restaurant menu'}</h1>
        <p className="restaurant-subtitle mt-2 text-sm text-[#A1A1AA]">{restaurant?.description || 'Explore available dishes and add your favorites to cart.'}</p>
        <p className="restaurant-rating mt-2 text-sm text-[#D4D4D8]">
          Average rating: {(Number.isFinite(averageRating) && averageRating > 0 ? averageRating : Number(restaurant?.rating || 0)).toFixed(1)} / 5
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((value) => {
            const active = (value === 'All' && category === '') || value === category;
            return (
              <button
                key={value}
                onClick={() => setCategory(value === 'All' ? '' : value)}
                className={`restaurant-filter-btn rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'border-[#3A3A3A] bg-[#3A3A3A] text-white' : 'border-[#2A2A2A] bg-[#0B0B0B] text-[#A1A1AA] hover:text-white'
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setFoodType('all')}
            className={`restaurant-filter-btn rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              foodType === 'all' ? 'border-[#3A3A3A] bg-[#3A3A3A] text-white' : 'border-[#2A2A2A] bg-[#0B0B0B] text-[#A1A1AA] hover:text-white'
            }`}
          >
            Show All
          </button>
          <button
            onClick={() => setFoodType('veg')}
            className={`restaurant-filter-btn rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              foodType === 'veg' ? 'border-[#3A3A3A] bg-[#3A3A3A] text-white' : 'border-[#2A2A2A] bg-[#0B0B0B] text-[#A1A1AA] hover:text-white'
            }`}
          >
            Veg Only
          </button>
          <button
            onClick={() => setFoodType('nonveg')}
            className={`restaurant-filter-btn rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              foodType === 'nonveg' ? 'border-[#3A3A3A] bg-[#3A3A3A] text-white' : 'border-[#2A2A2A] bg-[#0B0B0B] text-[#A1A1AA] hover:text-white'
            }`}
          >
            Non-Veg Only
          </button>
        </div>
      </section>

      <section className="mt-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <MenuSkeleton key={idx} />
            ))}
          </div>
        ) : visibleMenuItems.length === 0 ? (
          <EmptyState
            title="No matching items"
            description="Try changing category or veg/non-veg filter to see more dishes."
            ctaLabel="Back to restaurants"
            ctaTo="/home"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleMenuItems.map((item) => (
              <article key={item.id} className="restaurant-menu-card menu-card surface-card rounded-2xl p-5 transition-colors">
                <div className="restaurant-menu-image-wrap mb-3 overflow-hidden rounded-xl bg-[#0B0B0B]">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-32 w-full object-cover"
                      loading="lazy"
                      onError={(event) => withFallbackImage(event, getFallbackImage(restaurant?.cuisine_type))}
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-3xl">🍲</div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="restaurant-menu-title text-lg font-semibold text-white">{item.name}</h3>
                  {item.is_veg ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-600" />
                      Veg
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-600" />
                      Non-Veg
                    </span>
                  )}
                </div>
                <p className="restaurant-menu-desc mt-1 line-clamp-2 text-sm text-[#A1A1AA]">{item.description || 'Delicious dish prepared fresh.'}</p>
                <div className="soft-divider mt-4 flex items-center justify-between pt-4">
                  <p className="restaurant-menu-price text-lg font-semibold text-white">₹{item.price}</p>
                  <button
                    onClick={() => handleAddToCart(item.id)}
                    disabled={addingItemId === item.id}
                    className="restaurant-primary-btn rounded-lg bg-[#3A3A3A] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2F2F2F] disabled:opacity-60"
                  >
                    {addingItemId === item.id ? 'Adding...' : 'Add to cart'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <article className="restaurant-combo-card surface-card rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="restaurant-section-title text-lg font-semibold text-white">Smart Combo Builder</h2>
              <p className="restaurant-muted mt-1 text-sm text-[#A1A1AA]">
                Pick a goal and get a practical combo based on real constraints, not just popularity.
              </p>
            </div>
            {smartCombo?.used_ai ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                Gemini 2.5 Flash
              </span>
            ) : (
              <span className="restaurant-fallback-chip rounded-full border border-[#2A2A2A] bg-[#0B0B0B] px-3 py-1 text-xs font-semibold text-[#A1A1AA]">
                Constraint fallback
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { id: 'quick_lunch', label: 'Quick Lunch' },
              { id: 'high_protein', label: 'High Protein' },
              { id: 'under_200', label: 'Under ₹200' },
            ].map((option) => {
              const active = comboGoal === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setComboGoal(option.id)}
                  className={`restaurant-filter-btn rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? 'border-[#3A3A3A] bg-[#3A3A3A] text-white' : 'border-[#2A2A2A] bg-[#0B0B0B] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleBuildCombo}
              disabled={comboLoading}
              className="restaurant-primary-btn rounded-xl bg-[#3A3A3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F2F2F] disabled:opacity-60"
            >
              {comboLoading ? 'Building combo...' : 'Suggest combo'}
            </button>
            {smartCombo?.items?.length ? (
              <button
                onClick={handleAddComboToCart}
                disabled={addingCombo}
                className="restaurant-secondary-btn rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white hover:border-[#3A3A3A] disabled:opacity-60"
              >
                {addingCombo ? 'Adding combo...' : 'Add combo to cart'}
              </button>
            ) : null}
          </div>

          {smartCombo ? (
            <div className="restaurant-combo-result mt-4 rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="restaurant-section-title text-base font-semibold text-white">{smartCombo.combo_name || 'Suggested combo'}</h3>
                <p className="restaurant-section-title text-sm font-semibold text-white">Total: ₹{Number(smartCombo.total_price || 0).toFixed(0)}</p>
              </div>
              {smartCombo.explanation ? (
                <p className="restaurant-muted mt-1 text-sm text-[#A1A1AA]">{smartCombo.explanation}</p>
              ) : null}

              {smartCombo.items?.length ? (
                <div className="mt-3 space-y-2">
                  {smartCombo.items.map((item) => (
                    <div key={item.id} className="restaurant-combo-item rounded-lg border border-[#1C1C1C] bg-[#111111] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="restaurant-section-title text-sm font-semibold text-white">{item.name}</p>
                        <p className="restaurant-rating text-sm text-[#D4D4D8]">₹{Number(item.price || 0).toFixed(0)}</p>
                      </div>
                      {item.reason ? <p className="restaurant-muted mt-1 text-xs text-[#A1A1AA]">{item.reason}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="restaurant-muted mt-2 text-sm text-[#A1A1AA]">No matching combo found with current menu.</p>
              )}
            </div>
          ) : null}
        </article>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <article className="surface-card rounded-2xl p-5">
          <h2 className="restaurant-section-title text-lg font-semibold text-white">Customer reviews</h2>
          {reviews.length === 0 ? (
            <p className="restaurant-muted mt-3 text-sm text-[#A1A1AA]">No reviews yet. Be the first to rate this restaurant.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="restaurant-review-item rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] p-3">
                  <div className="flex items-center justify-between">
                    <p className="restaurant-section-title text-sm font-semibold text-white">{review.user_name}</p>
                    <p className="restaurant-muted text-xs text-[#A1A1AA]">{review.rating}/5</p>
                  </div>
                  {review.review_text ? <p className="restaurant-rating mt-1 text-sm text-[#D4D4D8]">{review.review_text}</p> : null}
                </div>
              ))}

              <PaginationControls
                page={reviewsPagination.page}
                totalPages={reviewsPagination.totalPages}
                hasPrevPage={reviewsPagination.hasPrevPage}
                hasNextPage={reviewsPagination.hasNextPage}
                onPrev={() => setReviewsPage((prev) => Math.max(1, prev - 1))}
                onNext={() => setReviewsPage((prev) => prev + 1)}
              />
            </div>
          )}
        </article>

        <article className="surface-card rounded-2xl p-5">
          <h2 className="restaurant-section-title text-lg font-semibold text-white">Rate this restaurant</h2>
          <p className="restaurant-muted mt-1 text-sm text-[#A1A1AA]">You can update your rating anytime.</p>

          <div className="mt-4">
            <label className="restaurant-section-title mb-1 block text-sm font-medium text-white">Rating</label>
            <select
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              className="restaurant-input w-full rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] px-3 py-2 text-sm text-white"
            >
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>{rating} / 5</option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <label className="restaurant-section-title mb-1 block text-sm font-medium text-white">Review (optional)</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="Write your experience"
              className="restaurant-input w-full rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] px-3 py-2 text-sm text-white"
            />
          </div>

          <button
            onClick={handleSubmitReview}
            disabled={submittingReview}
            className="restaurant-primary-btn mt-4 rounded-xl bg-[#3A3A3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F2F2F] disabled:opacity-60"
          >
            {submittingReview ? 'Saving...' : 'Submit review'}
          </button>
        </article>
      </section>
      </div>
    </AppLayout>
  );
};

export default Restaurant;
