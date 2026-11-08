import type { Item } from "./types.ts";
/** Names are stored on the same topic identity; missing values stay explicit. */
export function speciesNames(topic: Item) {
  if (topic.kind !== "species") return [];
  return [
    { label: "ES", language: "es", value: topic.spanish_name || "Sin confirmar" },
    { label: "EN", language: "en", value: topic.english_name || "Not verified" },
    { label: "Sci", language: "la", value: topic.scientific_name || "Not recorded" },
  ];
}
