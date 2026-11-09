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

/** Community names are collective common names, never species Latin names. */
export function communityNames(topic: Item) {
  if (topic.kind !== "habitat" || !topic.spanish_name || !topic.english_name) return [];
  return [
    { label: "ES", language: "es", value: topic.spanish_name },
    { label: "EN", language: "en", value: topic.english_name },
  ];
}

export function topicNames(topic: Item) {
  return topic.kind === "species" ? speciesNames(topic) : communityNames(topic);
}
