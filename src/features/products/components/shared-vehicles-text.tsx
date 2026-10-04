"use client";

import { useCodeDictionary } from "@/features/product-codes/hooks/useCodeDictionary";

import { vehicleLabel, type SharedVehicle } from "../lib/shared-vehicles";

/** "YAMAHA Acruzo, HONDA Vision" — xe dùng chung ngoài cặp hãng/dòng chính (0096). */
export function SharedVehiclesText({ vehicles }: { vehicles: SharedVehicle[] }) {
  const { dictionary } = useCodeDictionary();
  if (vehicles.length === 0) return <span className="text-chu-phu">—</span>;
  const labels = vehicles.map((v) => vehicleLabel(dictionary, v) ?? v.brandCode);
  return <>{labels.join(", ")}</>;
}
