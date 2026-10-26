/** Site browsing categories inferred from public brand text, not Impact's official taxonomy. */
export const STORE_CATEGORY_RULES = [
  { name: "Fashion", slug: "fashion", icon: "Shirt", terms: ["fashion", "clothing", "apparel", "footwear", "shoes", "sneakers", "jewelry", "jewellery", "watches", "handbags", "lingerie", "menswear", "womenswear", "eyewear", "sunglasses"] },
  { name: "Electronics", slug: "electronics", icon: "Laptop", terms: ["electronics", "smartphones", "laptops", "headphones", "cameras", "computers", "smartwatch", "projectors", "microphones", "audio equipment", "power stations", "3d printers"] },
  { name: "Home & Garden", slug: "home-garden", icon: "Sofa", terms: ["furniture", "home decor", "home décor", "garden", "gardening", "mattresses", "bedding", "kitchenware", "cookware", "lighting", "rugs", "home improvement", "appliances", "cleaning", "sofas"] },
  { name: "Beauty & Health", slug: "beauty-health", icon: "Sparkles", terms: ["beauty", "skincare", "skin care", "cosmetics", "makeup", "hair care", "haircare", "wellness", "supplements", "vitamins", "health", "fragrance", "perfume", "dental", "hearing aids"] },
  { name: "Travel", slug: "travel", icon: "Plane", terms: ["travel", "hotels", "hotel", "flights", "airline", "vacation", "holidays", "car rental", "cruises", "accommodation", "luggage", "tours"] },
  { name: "Sports & Outdoors", slug: "sports-outdoors", icon: "Dumbbell", terms: ["sports", "fitness", "outdoor", "outdoors", "camping", "hiking", "cycling", "bicycles", "golf", "fishing", "hunting", "workout", "gym equipment", "sporting goods"] },
  { name: "Software & Services", slug: "software-services", icon: "AppWindow", terms: ["software", "vpn", "hosting", "web hosting", "domains", "antivirus", "cybersecurity", "cloud storage", "data backup", "saas", "website builder", "productivity", "digital services", "esim"] },
  { name: "Food & Drink", slug: "food-drink", icon: "UtensilsCrossed", terms: ["food", "grocery", "groceries", "coffee", "tea", "wine", "meal", "meals", "snacks", "beverages", "restaurant", "chocolate", "bakery"] },
  { name: "Pets", slug: "pets", icon: "PawPrint", terms: ["pet", "pets", "dog", "dogs", "cat", "cats", "pet supplies", "pet food"] },
  { name: "Automotive", slug: "automotive", icon: "Car", terms: ["automotive", "auto parts", "car parts", "tires", "tyres", "motorcycle", "vehicle accessories", "dash cam"] },
  { name: "Education", slug: "education", icon: "GraduationCap", terms: ["education", "online courses", "learning", "tutoring", "language learning", "textbooks", "training courses"] },
  { name: "Finance", slug: "finance", icon: "Wallet", terms: ["banking", "financial services", "insurance", "credit cards", "loans", "investing", "money transfer", "tax software"] },
  { name: "Gifts & Flowers", slug: "gifts-flowers", icon: "Gift", terms: ["flowers", "florist", "gifts", "greeting cards", "personalized gifts", "personalised gifts"] },
  { name: "Games & Entertainment", slug: "games-entertainment", icon: "Gamepad2", terms: ["gaming", "video games", "games", "entertainment", "streaming", "concerts", "tickets", "toys", "hobbies"] },
] as const;

export const OTHER_STORES_CATEGORY = { name: "Other Stores", slug: "other-stores", icon: "ShoppingBag" };

function normalize(text: string) {
  return ` ${text.toLowerCase().replace(/[^a-z0-9é]+/g, " ").trim()} `;
}

export function inferStoreCategory(name: string, description: string | null | undefined): string {
  const title = normalize(name);
  const body = normalize(description ?? "");
  let bestSlug = OTHER_STORES_CATEGORY.slug;
  let bestScore = 0;
  for (const rule of STORE_CATEGORY_RULES) {
    let score = 0;
    for (const term of rule.terms) {
      const word = normalize(term);
      if (title.includes(word)) score += 5;
      if (body.includes(word)) score += 1;
    }
    if (score > bestScore) { bestScore = score; bestSlug = rule.slug; }
  }
  return bestSlug;
}

/** Existing selections always win; syncing must not erase an admin's categorization. */
export function resolveStoreCategory(existingId: string | null | undefined, inferredId: string | undefined): string | null {
  return existingId ?? inferredId ?? null;
}