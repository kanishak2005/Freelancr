import { useEffect, useState } from "react";
import { api } from "../../lib/axios";

interface RazorpayCheckoutProps {
  contractId: string;
}

const RazorpayCheckout = ({
  contractId,
}: RazorpayCheckoutProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (window.Razorpay) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

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

      const response = await api.post(
        "/payments/create-order",
        {
          contract: contractId,
        }
      );

      const { order } = response.data.data;

      console.log("Razorpay order created:", order);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,

        amount: order.amount,

        currency: order.currency,

        name: "Freelancr",

        description: "Freelance Contract Payment",

        order_id: order.id,

        handler: (paymentResponse: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          console.log(
            "Payment successful:",
            paymentResponse
          );
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

      alert(
        error.response?.data?.message ||
          "Failed to initialize payment"
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
    >
      {isLoading
        ? "Creating Order..."
        : isLoaded
        ? "Pay Now"
        : "Loading Razorpay..."}
    </button>
  );
};

export default RazorpayCheckout;