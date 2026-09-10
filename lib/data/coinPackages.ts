export interface CoinPackage {
  id: string;
  price: number;
  coins: number;
  bonusLabel?: string;
}

export const coinPackages: CoinPackage[] = [
  { id: "coins-1.99", price: 1.99, coins: 200 },
  { id: "coins-4.99", price: 4.99, coins: 550 },
  { id: "coins-9.99", price: 9.99, coins: 1150, bonusLabel: "+15% bonus" },
  { id: "coins-24.99", price: 24.99, coins: 3000, bonusLabel: "+20% bonus" },
  { id: "coins-49.99", price: 49.99, coins: 6500, bonusLabel: "+30% bonus" },
  { id: "coins-99.99", price: 99.99, coins: 14000, bonusLabel: "Best Value" },
];

export function getCoinPackage(id: string): CoinPackage | undefined {
  return coinPackages.find((p) => p.id === id);
}
