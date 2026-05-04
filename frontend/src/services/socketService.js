import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(userId) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { userId },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToOrder(orderId, callback) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected');
      return;
    }

    this.socket.emit('order:subscribe', orderId);
    
    if (!this.listeners.has('order:status')) {
      this.listeners.set('order:status', []);
    }
    this.listeners.get('order:status').push({ orderId, callback });

    const statusHandler = (payload) => {
      if (payload.order_id === orderId) {
        callback(payload);
      }
    };

    this.socket.off('order:status', statusHandler);
    this.socket.on('order:status', statusHandler);

    return () => {
      this.socket?.off('order:status', statusHandler);
    };
  }

  subscribeToDriverLocation(orderId, callback) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected');
      return;
    }

    this.socket.emit('driver:subscribe', orderId);

    const locationHandler = (payload) => {
      if (payload.order_id === orderId) {
        callback(payload);
      }
    };

    this.socket.off('driver:location', locationHandler);
    this.socket.on('driver:location', locationHandler);

    return () => {
      this.socket?.off('driver:location', locationHandler);
    };
  }

  subscribeToOrdersForRole(role, callback) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected');
      return;
    }

    this.socket.emit('orders:subscribe', role);
    
    const handler = (payload) => callback(payload);
    this.socket.off('order:status', handler);
    this.socket.on('order:status', handler);

    return () => {
      this.socket?.off('order:status', handler);
    };
  }

  subscribeToPayment(callback) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected');
      return;
    }

    const handler = (payload) => callback(payload);
    this.socket.off('payment:update', handler);
    this.socket.on('payment:update', handler);

    return () => {
      this.socket?.off('payment:update', handler);
    };
  }
}

export const socketManager = new SocketManager();

/**
 * Hook to use WebSocket order updates
 */
export const useOrderUpdates = (orderId, userId) => {
  const [orderData, setOrderData] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!orderId || !userId) return;

    socketManager.connect(userId);
    unsubscribeRef.current = socketManager.subscribeToOrder(orderId, (payload) => {
      setOrderData(payload);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [orderId, userId]);

  return orderData;
};

/**
 * Hook to use WebSocket driver location updates
 */
export const useDriverLocationUpdates = (orderId, userId) => {
  const [location, setLocation] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!orderId || !userId) return;

    socketManager.connect(userId);
    unsubscribeRef.current = socketManager.subscribeToDriverLocation(orderId, (payload) => {
      setLocation(payload);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [orderId, userId]);

  return location;
};

/**
 * Hook to listen to all orders for a role
 */
export const useOrdersForRole = (role, userId) => {
  const [orders, setOrders] = useState([]);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    socketManager.connect(userId);
    unsubscribeRef.current = socketManager.subscribeToOrdersForRole(role, (payload) => {
      setOrders((prev) => {
        const existing = prev.find((o) => o.order_id === payload.order_id);
        if (existing) {
          return prev.map((o) => (o.order_id === payload.order_id ? { ...o, ...payload } : o));
        }
        return [...prev, payload];
      });
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [role, userId]);

  return orders;
};

export default socketManager;
