import RazorpayCheckout from "../components/payment/RazorpayCheckout";
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-5xl font-bold text-indigo-600">
        Welcome to Freelancr 🚀
      </h1>
      <div>
        <RazorpayCheckout contractId="6abb92628e6d3e970ce10bc9" />
      </div>
    </main>
  );
}