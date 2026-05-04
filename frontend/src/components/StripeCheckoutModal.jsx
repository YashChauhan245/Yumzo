import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import '../styles/stripe-checkout.css';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

/**
 * Card input form component
 */
const CardInputForm = ({ orderId, amount, onSuccess, onLoading }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error('Stripe not loaded');
      return;
    }

    setIsProcessing(true);
    onLoading(true);

    try {
      // Create payment intent on backend
      const createIntentRes = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/payments/${orderId}/stripe/create-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      const intentData = await createIntentRes.json();

      if (!intentData.success) {
        toast.error(intentData.message || 'Failed to create payment intent');
        setIsProcessing(false);
        onLoading(false);
        return;
      }

      const { clientSecret, paymentIntentId } = intentData.data;

      // Confirm payment with Stripe
      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (error) {
        toast.error(error.message);
        setIsProcessing(false);
        onLoading(false);
        return;
      }

      // Confirm payment on backend
      const confirmRes = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/payments/${orderId}/stripe/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ orderId, paymentIntentId }),
        }
      );

      const confirmData = await confirmRes.json();

      if (confirmData.success) {
        toast.success('Payment successful!');
        onSuccess(confirmData.data);
      } else {
        toast.error(confirmData.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('An error occurred during payment');
    } finally {
      setIsProcessing(false);
      onLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <div className="form-group">
        <label>Card Details</label>
        <div className="card-element-wrapper">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#fa755a',
                },
              },
            }}
          />
        </div>
      </div>

      <div className="amount-display">
        <p>Amount to Pay: ₹{amount.toFixed(2)}</p>
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="pay-button"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
};

/**
 * Stripe Checkout Modal Component
 */
export const StripeCheckoutModal = ({ isOpen, orderId, amount, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content stripe-modal">
        <div className="modal-header">
          <h2>Secure Payment</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <Elements stripe={stripePromise}>
            <CardInputForm
              orderId={orderId}
              amount={amount}
              onSuccess={(data) => {
                onSuccess(data);
                onClose();
              }}
              onLoading={setIsLoading}
            />
          </Elements>

          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Processing your payment...</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <p className="secure-badge">
            🔒 Secured by Stripe - Your payment information is encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Payment Method Selection Component
 */
export const PaymentMethodSelector = ({ selectedMethod, onMethodChange }) => {
  return (
    <div className="payment-methods">
      <div className="method-group">
        <label>
          <input
            type="radio"
            value="stripe"
            checked={selectedMethod === 'stripe'}
            onChange={(e) => onMethodChange(e.target.value)}
          />
          <span>💳 Stripe Card Payment</span>
        </label>
      </div>

      <div className="method-group">
        <label>
          <input
            type="radio"
            value="upi"
            checked={selectedMethod === 'upi'}
            onChange={(e) => onMethodChange(e.target.value)}
          />
          <span>📱 UPI Payment</span>
        </label>
      </div>

      <div className="method-group">
        <label>
          <input
            type="radio"
            value="cash_on_delivery"
            checked={selectedMethod === 'cash_on_delivery'}
            onChange={(e) => onMethodChange(e.target.value)}
          />
          <span>💵 Cash on Delivery</span>
        </label>
      </div>
    </div>
  );
};

export default StripeCheckoutModal;
