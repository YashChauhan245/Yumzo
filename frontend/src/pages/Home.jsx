import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import EmptyState from '../components/ui/EmptyState';
import { RestaurantSkeleton } from '../components/ui/Skeletons';
import PaginationControls from '../components/ui/PaginationControls';
import { restaurantsAPI } from '../services/api';

const withFallbackImage = (event, fallbackSrc) => {
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackSrc;
};

/* ─── Fallback restaurant data with images ───────── */
const fallbackRestaurants = [
  {
    id: 'r1', name: 'Spice Garden', city: 'Mumbai', cuisine_type: 'North Indian',
    rating: 4.8, delivery_time: '30-40 min', price_range: '₹₹',
    image_url: '/images/dishes/indian.png',
    description: 'Authentic North Indian flavors with handmade butter naan, smoky tandoori kebabs, and rich curries prepared fresh daily.',
  },
  {
    id: 'r2', name: 'Pizza Paradiso', city: 'Bangalore', cuisine_type: 'Italian',
    rating: 4.6, delivery_time: '25-35 min', price_range: '₹₹₹',
    image_url: '/images/dishes/italian.png',
    description: 'Wood-fired Neapolitan pizzas, handmade pastas, and classic Italian desserts. A slice of Italy in every bite.',
  },
  {
    id: 'r3', name: 'Sushi Samurai', city: 'Delhi', cuisine_type: 'Japanese',
    rating: 4.9, delivery_time: '35-45 min', price_range: '₹₹₹₹',
    image_url: '/images/dishes/japanese.png',
    description: 'Premium sushi rolls, fresh sashimi, and authentic ramen bowls prepared by our trained Japanese chefs.',
  },
  {
    id: 'r4', name: 'Burger Republic', city: 'Pune', cuisine_type: 'American',
    rating: 4.5, delivery_time: '20-30 min', price_range: '₹₹',
    image_url: '/images/dishes/american.png',
    description: 'Juicy smash burgers, loaded fries, crispy wings, and thick shakes. American comfort food at its finest.',
  },
  {
    id: 'r5', name: 'Green Bowl Co.', city: 'Mumbai', cuisine_type: 'Healthy',
    rating: 4.7, delivery_time: '20-25 min', price_range: '₹₹',
    image_url: '/images/dishes/healthy.png',
    description: 'Nutritious Buddha bowls, fresh smoothies, and protein-packed meals for the health-conscious foodie.',
  },
  {
    id: 'r6', name: 'Dragon Wok', city: 'Hyderabad', cuisine_type: 'Chinese',
    rating: 4.4, delivery_time: '25-35 min', price_range: '₹₹',
    image_url: '/images/dishes/chinese.png',
    description: 'Fiery Indo-Chinese cuisine with crispy wontons, hakka noodles, and mouth-watering Manchurian gravies.',
  },
  {
    id: 'r7', name: 'Dosa Junction', city: 'Chennai', cuisine_type: 'South Indian',
    rating: 4.8, delivery_time: '15-25 min', price_range: '₹',
    image_url: '/images/dishes/south_indian.png',
    description: 'Crispy dosas, fluffy idlis, and authentic filter coffee. Traditional South Indian breakfast and meals.',
  },
  {
    id: 'r8', name: 'Taco Fiesta', city: 'Goa', cuisine_type: 'Mexican',
    rating: 4.6, delivery_time: '25-35 min', price_range: '₹₹',
    image_url: '/images/dishes/mexican.png',
    description: 'Loaded tacos, cheesy quesadillas, fresh guacamole, and fiery salsas. Taste Mexico in every bite.',
  },
  {
    id: 'r9', name: 'Beirut Bites', city: 'Bangalore', cuisine_type: 'Mediterranean',
    rating: 4.7, delivery_time: '30-40 min', price_range: '₹₹₹',
    image_url: '/images/dishes/mediterranean.png',
    description: 'Authentic falafel wraps, creamy hummus, and grilled shawarma platters with warm pita bread.',
  },
];

const cuisineFilters = ['All', 'North Indian', 'Italian', 'Japanese', 'American', 'Healthy', 'Chinese', 'South Indian', 'Mexican', 'Mediterranean'];

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCuisine, setActiveCuisine] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(5); // ₹ to ₹₹₹₹₹
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const loadRestaurants = useCallback(async (requestedPage = 1) => {
    setLoading(true);
    try {
      const { data } = await restaurantsAPI.getAll({
        page: requestedPage,
        limit: 9,
        cuisine: activeCuisine === 'All' ? undefined : activeCuisine,
      });
      const apiRestaurants = data?.data?.restaurants || [];
      const nextPagination = data?.pagination;

      setPagination(
        nextPagination || {
          page: requestedPage,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: requestedPage > 1,
        },
      );

      setRestaurants(apiRestaurants.length > 0 ? apiRestaurants : fallbackRestaurants);
    } catch {
      setRestaurants(fallbackRestaurants);
      setPagination({
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    } finally {
      setLoading(false);
    }
  }, [activeCuisine]);

  useEffect(() => {
    loadRestaurants(page);
  }, [page, loadRestaurants]);

  useEffect(() => {
    setPage(1);
  }, [activeCuisine]);

  const filteredRestaurants = useMemo(() => {
    let result = restaurants;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((item) =>
        item.name?.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q) ||
        item.cuisine_type?.toLowerCase().includes(q)
      );
    }
    if (activeCuisine !== 'All') {
      result = result.filter(r => r.cuisine_type === activeCuisine);
    }
    // Filter by minimum rating
    result = result.filter(r => {
      const rating = Number(r.rating) || 0;
      return rating >= minRating;
    });
    // Filter by price range (convert ₹ to number: 1=₹, 2=₹₹, etc)
    result = result.filter(r => {
      const priceStr = r.price_range || '₹₹';
      const priceLevel = priceStr.length; // Count ₹ symbols
      return priceLevel <= maxPrice;
    });
    return result;
  }, [restaurants, search, activeCuisine, minRating, maxPrice]);

  const getFallbackRating = (name = '') => {
    const options = ['4.2', '4.5', '4.8'];
    const hash = String(name)
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return options[hash % options.length];
  };

  const getDisplayRating = (rating, restaurantName) => {
    const parsed = Number(rating);
    if (!Number.isFinite(parsed) || parsed <= 0) return getFallbackRating(restaurantName);
    return parsed.toFixed(1);
  };

  return (
    <AppLayout>
      <div className="home-page">
      <section className="hero-section rounded-2xl px-6 py-6 md:px-8 md:py-7">
        <div className="max-w-3xl">
          <div className="home-chip inline-flex items-center rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] px-3 py-1 text-xs font-medium text-[#A1A1AA]">
            9 restaurants available nearby
          </div>

          <h1 className="home-hero-title mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Discover restaurants and order faster
          </h1>

          <p className="home-hero-subtitle mt-2 text-sm leading-relaxed text-[#A1A1AA] md:text-base">
            Browse menus, filter by cuisine, and jump directly to checkout from a clean product-style dashboard.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search restaurants, cuisines, cities..."
                className="home-search-input w-full rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-[#71717A] focus:border-[#3A3A3A]"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="home-filter-btn relative rounded-xl bg-[#3A3A3A] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2F2F2F] flex items-center gap-2"
              title="Toggle advanced filters"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
              {(minRating > 0 || maxPrice < 5) && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                  {Number(minRating > 0) + Number(maxPrice < 5)}
                </span>
              )}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
              <div className="grid gap-5 md:grid-cols-2">
                {/* Rating Filter */}
                <div>
                  <label className="mb-3 flex items-center justify-between text-sm font-medium text-white">
                    <span>Minimum Rating</span>
                    <span className="text-xs font-bold text-blue-400">{minRating.toFixed(1)} ★</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                  <div className="mt-2 flex justify-between text-xs text-[#71717A]">
                    <span>0.0</span>
                    <span>5.0</span>
                  </div>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className="mb-3 flex items-center justify-between text-sm font-medium text-white">
                    <span>Maximum Price</span>
                    <span className="text-xs font-bold text-blue-400">
                      {'₹'.repeat(maxPrice)} {maxPrice < 5 ? '(' + maxPrice + ')' : '(Any)'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                  <div className="mt-2 flex justify-between text-xs text-[#71717A]">
                    <span>Budget</span>
                    <span>Premium</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setMinRating(0);
                  setMaxPrice(5);
                  setShowFilters(false);
                }}
                className="mt-4 w-full rounded-lg border border-[#2A2A2A] bg-[#0B0B0B] py-2 text-sm font-medium text-[#A1A1AA] transition-colors hover:text-white"
              >
                Reset Filters
              </button>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { num: '9+', label: 'Restaurants' },
              { num: '54+', label: 'Dishes' },
              { num: '4.7', label: 'Avg Rating' },
              { num: '25 min', label: 'Avg Delivery' },
            ].map(s => (
              <div key={s.label} className="home-stat-card rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] px-3 py-3">
                <p className="home-stat-number text-lg font-semibold text-white">{s.num}</p>
                <p className="home-stat-label text-xs text-[#A1A1AA]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {cuisineFilters.map(cuisine => (
            <button
              key={cuisine}
              onClick={() => setActiveCuisine(cuisine)}
              className={`home-cuisine-btn whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                activeCuisine === cuisine
                  ? 'active border-[#3A3A3A] bg-[#3A3A3A] text-white'
                  : 'border-[#2A2A2A] bg-[#1A1A1A] text-[#A1A1AA] hover:text-white'
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-4">
          <div>
            <h2 className="home-section-title text-xl font-semibold tracking-tight text-white md:text-2xl">
              {activeCuisine === 'All' ? 'All Restaurants' : activeCuisine}
            </h2>
            <p className="home-section-subtitle mt-1 text-sm text-[#A1A1AA]">{filteredRestaurants.length} restaurants available</p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, idx) => (
              <RestaurantSkeleton key={idx} />
            ))}
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <EmptyState
            title="No restaurants found"
            description="Try another cuisine or search term."
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRestaurants.map((restaurant) => (
              <article
                key={restaurant.id}
                className="home-restaurant-card restaurant-card group surface-card overflow-hidden rounded-2xl transition-colors"
              >
                <div className="relative overflow-hidden">
                  {restaurant.image_url ? (
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                      className="h-44 w-full object-cover"
                      loading="lazy"
                      onError={(event) => withFallbackImage(event, '/images/dishes/indian.png')}
                    />
                  ) : (
                    <div className="home-no-image flex h-44 items-center justify-center bg-[#0B0B0B] text-4xl">🍽️</div>
                  )}

                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="home-card-pill rounded-lg border border-[#2A2A2A] bg-[#0B0B0B] px-2 py-1 text-[11px] font-medium text-white">
                      {restaurant.delivery_time || '25-35 min'}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="home-card-pill flex items-center gap-1 rounded-lg border border-[#2A2A2A] bg-[#0B0B0B] px-2 py-1 text-[11px] font-medium text-white">
                      ★ {getDisplayRating(restaurant.rating, restaurant.name)}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3">
                    <span className="home-card-pill home-cuisine-pill rounded-lg border border-[#2A2A2A] bg-[#0B0B0B] px-2 py-1 text-[11px] font-medium text-[#A1A1AA]">
                      {restaurant.cuisine_type || 'Multi-cuisine'}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="home-restaurant-name text-base font-semibold text-white">{restaurant.name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span className="home-meta-text text-xs text-[#A1A1AA]">{restaurant.city}</span>
                        <span className="home-meta-dot text-[#71717A]">•</span>
                        <span className="home-meta-text text-xs text-[#A1A1AA]">{restaurant.price_range || '₹₹'}</span>
                      </div>
                    </div>
                  </div>

                  <p className="home-restaurant-desc mt-3 line-clamp-2 text-sm leading-relaxed text-[#A1A1AA]">{restaurant.description || 'Fresh and tasty meals delivered fast.'}</p>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span className="home-open-text text-xs text-[#A1A1AA]">Open now</span>
                    </div>
                    <Link
                      to={`/restaurants/${restaurant.id}`}
                      className="home-view-menu-btn inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] px-3 py-2 text-xs font-medium text-white transition-colors hover:border-[#3A3A3A] hover:text-[#D4D4D8]"
                    >
                      View Menu
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>
              </article>
              ))}
            </div>

            <PaginationControls
              page={pagination.page || page}
              totalPages={pagination.totalPages || 1}
              hasPrevPage={pagination.hasPrevPage && !loading}
              hasNextPage={pagination.hasNextPage && !loading}
              onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
              onNext={() => setPage((prev) => prev + 1)}
              className="mt-6"
            />
          </>
        )}
      </section>

      <section className="mb-4 mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="home-reels-title text-xl font-semibold tracking-tight text-white md:text-2xl">Food Reels</h2>
            <p className="home-reels-subtitle mt-1 text-sm text-[#A1A1AA]">Trending cooking videos from chefs</p>
          </div>
          <Link to="/reels" className="home-reels-link text-sm font-medium text-[#D4D4D8] transition-colors hover:text-white">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { img: '/images/reels/reel1.png', title: 'Wok Mastery 🔥', views: '12K' },
            { img: '/images/reels/reel2.png', title: 'Chocolate Lava 🍫', views: '28K' },
            { img: '/images/reels/reel3.png', title: 'Fresh Naan 🫓', views: '8K' },
            { img: '/images/reels/reel4.png', title: 'Latte Art ☕', views: '15K' },
            { img: '/images/reels/reel5.png', title: 'Sushi Roll 🍣', views: '21K' },
            { img: '/images/reels/reel6.png', title: 'Cheese Pull 🧀', views: '34K' },
          ].map((reel, i) => (
            <Link key={i} to="/reels" className="home-reel-card group relative aspect-9/14 overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A]">
              <img
                src={reel.img}
                alt={reel.title}
                className="h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-100"
                loading="lazy"
                onError={(event) => withFallbackImage(event, '/images/restaurants/collage.png')}
              />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="home-reel-title text-xs font-medium text-white">{reel.title}</p>
                <div className="mt-1 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  <span className="home-reel-views text-[10px] text-[#A1A1AA]">{reel.views} views</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      </div>
    </AppLayout>
  );
};

export default Home;
