const CROP_KEYS = {
  wheat: "cropWheat",
  cotton: "cropCotton",
  sugarcane: "cropSugarcane",
  rice: "cropRice",
  maize: "cropMaize",
  corn: "cropMaize",
  potato: "cropPotato",
  potatoes: "cropPotato",
  vegetable: "cropVegetables",
  vegetables: "cropVegetables",
};

export function localizeCropName(value, t, lang) {
  const text = String(value || "").trim();
  if (!text || lang !== "ur") return text;
  const key = CROP_KEYS[text.toLowerCase()];
  return key ? t(key) : text;
}

export function localizeFarmSize(value, t, lang) {
  const text = String(value || "").trim();
  if (!text || lang !== "ur") return text;
  return text.replace(/\bacres?\b/gi, t("commonAcres"));
}
