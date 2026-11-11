import CartView from "./cart-view";

export const dynamic = "force-dynamic";

export default function CartPage() {
  return (
    <>
      <h1>Your cart</h1>
      <CartView />
    </>
  );
}
