export const activity = [
  { id: 1, type: "valuation", text: "Valuation completed for Range Rover Velar 2022", time: "2m ago" },
  { id: 2, type: "alert", text: "New market match: BMW M-Series under 150K", time: "18m ago" },
  { id: 3, type: "edit", text: "Listing updated — Mercedes S-Class price adjusted", time: "1h ago" },
  { id: 4, type: "valuation", text: "AI scan finished — Audi Q5 condition score 92", time: "3h ago" },
  { id: 5, type: "alert", text: "Inventory threshold reached for SUVs", time: "5h ago" },
];

export const trendData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  listings: 18 + Math.round(Math.sin(i / 1.5) * 8 + i * 1.4),
  valuations: 32 + Math.round(Math.cos(i / 1.8) * 10 + i * 1.8),
}));
