import { describe, expect, it } from "vitest";
import { inferStoreCategory, resolveStoreCategory } from "./store-categories";

describe("store browsing categories", () => {
  it("groups brands using public descriptions", () => {
    for (const [description, slug] of [
      ["Clothing, shoes and handbags", "fashion"], ["Laptops and headphones", "electronics"],
      ["Garden furniture and mattresses", "home-garden"], ["Skincare and cosmetics", "beauty-health"],
      ["Hotels and flights", "travel"], ["Camping and hiking", "sports-outdoors"],
      ["Data backup software", "software-services"], ["Coffee and chocolate", "food-drink"],
      ["Pet supplies for dogs", "pets"], ["Auto parts and tires", "automotive"],
      ["Online courses and tutoring", "education"], ["Banking and insurance", "finance"],
      ["Flowers and personalized gifts", "gifts-flowers"], ["Video games and gaming", "games-entertainment"],
    ]) expect(inferStoreCategory("Brand", description)).toBe(slug);
  });
  it("gives unknown stores an honest fallback rather than guessing a vertical", () => {
    expect(inferStoreCategory("Example Brand", "Welcome to our website")).toBe("other-stores");
    expect(inferStoreCategory("Brand", null)).toBe("other-stores");
  });
  it("matches words rather than incidental substrings", () => {
    expect(inferStoreCategory("Educated", "Our team is passionate about the best products")).toBe("other-stores");
  });
  it("prioritizes a category in the brand name over incidental description mentions", () => {
    expect(inferStoreCategory("Pet Store", "Food, gifts and toys for your family")).toBe("pets");
  });
  it("preserves admin-selected categories and fills only missing assignments", () => {
    expect(resolveStoreCategory("admin-choice", "inferred-choice")).toBe("admin-choice");
    expect(resolveStoreCategory(null, "inferred-choice")).toBe("inferred-choice");
    expect(resolveStoreCategory(null, undefined)).toBeNull();
  });
});