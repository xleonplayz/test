// The product catalog. Prices are net amounts in euro cents; taxes and
// discounts are computed by the pricing service.
export const products = [
  { sku: "TEA-001", name: "Sencha Green Tea", category: "food", priceCents: 1290, stock: 40,
    description: "Steamed Japanese green tea, 100 g, fresh and grassy." },
  { sku: "TEA-002", name: "Assam Breakfast", category: "food", priceCents: 990, stock: 55,
    description: "Strong black tea from Assam, 125 g, malty with a hint of honey." },
  { sku: "CUP-010", name: "Stoneware Cup", category: "goods", priceCents: 1850, stock: 20,
    description: "Hand-glazed stoneware cup, 250 ml, dishwasher safe." },
  { sku: "POT-020", name: "Cast Iron Teapot", category: "goods", priceCents: 4900, stock: 8,
    description: "Classic tetsubin teapot with a stainless steel infuser, 0.8 l." },
  { sku: "BOK-100", name: "The Book of Tea", category: "books", priceCents: 1400, stock: 15,
    description: "Okakura's classic essay on tea and aesthetics, hardcover." },
  { sku: "KIT-200", name: "Matcha Starter Kit", category: "goods", priceCents: 3500, stock: 12,
    description: "Bamboo whisk, scoop and bowl, with 30 g of ceremonial matcha." },
];

export function findProduct(sku) {
  return products.find((p) => p.sku === sku) || null;
}
