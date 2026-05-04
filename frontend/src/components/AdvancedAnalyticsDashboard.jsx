import React, { useState } from 'react';
import {
  useRevenueAnalytics,
  useOrderAnalytics,
  useTopDishes,
  useTopRestaurants,
  useCustomerAnalytics,
  useDeliveryAnalytics,
} from '../services/phase3Queries';
import '../styles/advanced-analytics.css';

/**
 * Date Range Picker Component
 */
const DateRangePicker = ({ onDateRangeChange }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState('30days');

  const handlePreset = (presetType) => {
    setPreset(presetType);
    const end = new Date();
    let start = new Date();

    switch (presetType) {
      case '7days':
        start.setDate(end.getDate() - 7);
        break;
      case '30days':
        start.setDate(end.getDate() - 30);
        break;
      case '90days':
        start.setDate(end.getDate() - 90);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        break;
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    setStartDate(startStr);
    setEndDate(endStr);
    onDateRangeChange({ startDate: startStr, endDate: endStr });
  };

  const handleCustom = () => {
    if (startDate && endDate) {
      onDateRangeChange({ startDate, endDate });
    }
  };

  return (
    <div className="date-range-picker">
      <div className="preset-buttons">
        <button
          className={`preset-btn ${preset === '7days' ? 'active' : ''}`}
          onClick={() => handlePreset('7days')}
        >
          Last 7 Days
        </button>
        <button
          className={`preset-btn ${preset === '30days' ? 'active' : ''}`}
          onClick={() => handlePreset('30days')}
        >
          Last 30 Days
        </button>
        <button
          className={`preset-btn ${preset === '90days' ? 'active' : ''}`}
          onClick={() => handlePreset('90days')}
        >
          Last 90 Days
        </button>
        <button
          className={`preset-btn ${preset === 'year' ? 'active' : ''}`}
          onClick={() => handlePreset('year')}
        >
          Last Year
        </button>
      </div>

      <div className="custom-date-inputs">
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPreset('custom');
          }}
          placeholder="Start Date"
        />
        <span>to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPreset('custom');
          }}
          placeholder="End Date"
        />
        <button className="apply-btn" onClick={handleCustom}>
          Apply
        </button>
      </div>
    </div>
  );
};

/**
 * Key Metrics Card
 */
const MetricCard = ({ title, value, unit = '', trend = null, icon = '' }) => {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div className="metric-content">
        <p className="metric-title">{title}</p>
        <p className="metric-value">
          {unit}
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {trend && (
          <p className={`metric-trend ${trend.positive ? 'positive' : 'negative'}`}>
            {trend.positive ? '📈' : '📉'} {trend.text}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Revenue Analytics Section
 */
const RevenueSection = ({ dateRange }) => {
  const { data, isLoading, error } = useRevenueAnalytics(dateRange);

  if (isLoading) return <div className="loading">Loading revenue data...</div>;
  if (error) return <div className="error">Failed to load revenue data</div>;
  if (!data?.data) return null;

  const { totalRevenue, transactionCount, averageOrderValue, paymentMethodBreakdown } = data.data;

  return (
    <div className="analytics-section">
      <h2>💰 Revenue Analytics</h2>
      <div className="metrics-grid">
        <MetricCard title="Total Revenue" value={totalRevenue.toFixed(2)} unit="₹" icon="💵" />
        <MetricCard title="Transactions" value={transactionCount} icon="📊" />
        <MetricCard title="Average Order Value" value={averageOrderValue.toFixed(2)} unit="₹" icon="🎯" />
      </div>

      <div className="payment-breakdown">
        <h3>Payment Methods</h3>
        <div className="breakdown-items">
          {Object.entries(paymentMethodBreakdown).map(([method, data]) => (
            <div key={method} className="breakdown-item">
              <span className="method-name">{method.replace('_', ' ')}</span>
              <span className="method-stats">
                {data.count} transactions • ₹{data.amount.toFixed(2)}
              </span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(data.amount / totalRevenue) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Order Analytics Section
 */
const OrderSection = ({ dateRange }) => {
  const { data, isLoading, error } = useOrderAnalytics(dateRange);

  if (isLoading) return <div className="loading">Loading order data...</div>;
  if (error) return <div className="error">Failed to load order data</div>;
  if (!data?.data) return null;

  const { totalOrders, totalValue, completionRate, cancellationRate, statusBreakdown } = data.data;

  return (
    <div className="analytics-section">
      <h2>📦 Order Analytics</h2>
      <div className="metrics-grid">
        <MetricCard title="Total Orders" value={totalOrders} icon="🛒" />
        <MetricCard title="Total Value" value={totalValue.toFixed(2)} unit="₹" icon="💵" />
        <MetricCard
          title="Completion Rate"
          value={completionRate.toFixed(1)}
          unit="%"
          icon="✅"
        />
        <MetricCard
          title="Cancellation Rate"
          value={cancellationRate.toFixed(1)}
          unit="%"
          icon="❌"
        />
      </div>

      <div className="status-breakdown">
        <h3>Order Status Distribution</h3>
        <div className="breakdown-items">
          {Object.entries(statusBreakdown).map(([status, count]) => (
            <div key={status} className="breakdown-item">
              <span className="status-name">{status.replace('_', ' ')}</span>
              <span className="status-count">{count}</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(count / totalOrders) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Top Dishes Section
 */
const TopDishesSection = ({ dateRange }) => {
  const { data, isLoading, error } = useTopDishes(dateRange);

  if (isLoading) return <div className="loading">Loading top dishes...</div>;
  if (error) return <div className="error">Failed to load top dishes</div>;
  if (!data?.data?.dishes) return null;

  return (
    <div className="analytics-section">
      <h2>🍽️ Top Dishes</h2>
      <div className="table-container">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Dish Name</th>
              <th>Orders</th>
              <th>Quantity Sold</th>
              <th>Revenue</th>
              <th>Avg Price</th>
            </tr>
          </thead>
          <tbody>
            {data.data.dishes.map((dish, idx) => (
              <tr key={dish.foodId} className={idx % 2 === 0 ? 'even' : 'odd'}>
                <td>{dish.name}</td>
                <td>{dish.ordersCount}</td>
                <td>{dish.totalQuantitySold}</td>
                <td>₹{dish.totalRevenue.toFixed(2)}</td>
                <td>₹{dish.averagePrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Top Restaurants Section
 */
const TopRestaurantsSection = ({ dateRange }) => {
  const { data, isLoading, error } = useTopRestaurants(dateRange);

  if (isLoading) return <div className="loading">Loading top restaurants...</div>;
  if (error) return <div className="error">Failed to load top restaurants</div>;
  if (!data?.data?.restaurants) return null;

  return (
    <div className="analytics-section">
      <h2>⭐ Top Restaurants</h2>
      <div className="table-container">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Restaurant Name</th>
              <th>Rating</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>Avg Order Value</th>
            </tr>
          </thead>
          <tbody>
            {data.data.restaurants.map((restaurant, idx) => (
              <tr key={restaurant.restaurantId} className={idx % 2 === 0 ? 'even' : 'odd'}>
                <td>{restaurant.restaurantName}</td>
                <td>⭐ {restaurant.rating}</td>
                <td>{restaurant.totalOrders}</td>
                <td>₹{restaurant.totalRevenue.toFixed(2)}</td>
                <td>₹{restaurant.averageOrderValue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Customer Analytics Section
 */
const CustomerSection = ({ dateRange }) => {
  const { data, isLoading, error } = useCustomerAnalytics(dateRange);

  if (isLoading) return <div className="loading">Loading customer data...</div>;
  if (error) return <div className="error">Failed to load customer data</div>;
  if (!data?.data) return null;

  const {
    activeCustomers,
    newCustomers,
    repeatCustomers,
    repeatCustomerRate,
    averageCustomerLifetimeValue,
  } = data.data;

  return (
    <div className="analytics-section">
      <h2>👥 Customer Analytics</h2>
      <div className="metrics-grid">
        <MetricCard title="Active Customers" value={activeCustomers} icon="👤" />
        <MetricCard title="New Customers" value={newCustomers} icon="🆕" />
        <MetricCard title="Repeat Customers" value={repeatCustomers} icon="🔄" />
        <MetricCard
          title="Repeat Customer Rate"
          value={repeatCustomerRate.toFixed(1)}
          unit="%"
          icon="📊"
        />
        <MetricCard
          title="Avg Lifetime Value"
          value={averageCustomerLifetimeValue.toFixed(2)}
          unit="₹"
          icon="💎"
        />
      </div>
    </div>
  );
};

/**
 * Delivery Analytics Section
 */
const DeliverySection = ({ dateRange }) => {
  const { data, isLoading, error } = useDeliveryAnalytics(dateRange);

  if (isLoading) return <div className="loading">Loading delivery data...</div>;
  if (error) return <div className="error">Failed to load delivery data</div>;
  if (!data?.data) return null;

  const { totalDeliveries, averageDeliveryTime, deliveriesByDriver } = data.data;

  return (
    <div className="analytics-section">
      <h2>🚚 Delivery Analytics</h2>
      <div className="metrics-grid">
        <MetricCard title="Total Deliveries" value={totalDeliveries} icon="📦" />
        <MetricCard
          title="Avg Delivery Time"
          value={averageDeliveryTime.toFixed(1)}
          unit=" min"
          icon="⏱️"
        />
      </div>

      {deliveriesByDriver.length > 0 && (
        <div className="driver-breakdown">
          <h3>Deliveries by Driver</h3>
          <div className="breakdown-items">
            {deliveriesByDriver.map((driver) => (
              <div key={driver.driverId} className="breakdown-item">
                <span className="driver-name">{driver.driverName}</span>
                <span className="driver-count">{driver.deliveries} deliveries</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(driver.deliveries / Math.max(...deliveriesByDriver.map((d) => d.deliveries), 1)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main Advanced Analytics Dashboard
 */
export const AdvancedAnalyticsDashboard = () => {
  // Calculate default date range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const defaultStartDate = thirtyDaysAgo.toISOString().split('T')[0];
  const defaultEndDate = today.toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });

  return (
    <div className="advanced-analytics-dashboard">
      <div className="dashboard-header">
        <h1>📊 Advanced Analytics Dashboard</h1>
        <DateRangePicker onDateRangeChange={setDateRange} />
      </div>

      <div className="analytics-container">
        <RevenueSection dateRange={dateRange} />
        <OrderSection dateRange={dateRange} />
        <TopDishesSection dateRange={dateRange} />
        <TopRestaurantsSection dateRange={dateRange} />
        <CustomerSection dateRange={dateRange} />
        <DeliverySection dateRange={dateRange} />
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
