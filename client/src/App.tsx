import RazorpayCheckout from "./components/payment/RazorpayCheckout";

function App() {
  return (
    <div>
      <h1>Freelancr Payment Test</h1>

      <RazorpayCheckout
        contractId="6aa865d252f2325dde5b3f60"
      />
    </div>
  );
}

export default App;