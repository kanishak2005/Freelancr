import { useEffect, useState } from "react";
import {
  createPaymentOrder,
  verifyPayment,
  type PaymentRecord,
} from "../../services/payments.api";

interface RazorpayCheckoutProps {
  contractId: string;
  onSuccess?: (payment: PaymentRecord) => void;
  onError?: (error: any) => void;
}

const RazorpayCheckout = ({
  contractId,
  onSuccess,
  onError,
}: RazorpayCheckoutProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (window.Razorpay) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      setIsLoaded(true);
      console.log("Razorpay Checkout loaded successfully");
    };

    script.onerror = () => {
      console.error("Failed to load Razorpay Checkout");
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async () => {
    try {
      setIsLoading(true);

      const response = await createPaymentOrder(contractId);
      const { order } = response.data;

      console.log("Razorpay order created:", order);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Freelancr",
        description: "Freelance Contract Payment",
        order_id: order.id,
        handler: async (paymentResponse: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            console.log("Verifying payment with backend:", paymentResponse);
            const verifyRes = await verifyPayment(paymentResponse);
            console.log("Payment verification completed:", verifyRes);
            onSuccess?.(verifyRes.data);
          } catch (verifyError: any) {
            console.error("Payment verification failed:", verifyError);
            onError?.(verifyError);
            alert(
              verifyError.response?.data?.message ||
                "Payment verification failed"
            );
          }
        },
        theme: {
          color: "#3399cc",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error(
        "Payment initialization failed:",
        error.response?.data || error
      );
      onError?.(error);
      alert(
        error.response?.data?.message || "Failed to initialize payment"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={!isLoaded || isLoading}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors w-full sm:w-auto"
    >
      {isLoading ? (
        <>
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Initializing Gateway...
        </>
      ) : isLoaded ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Fund with Razorpay
        </>
      ) : (
        "Loading Razorpay..."
      )}
    </button>
  );
};

export default RazorpayCheckout;