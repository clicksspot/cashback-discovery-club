import { describe, expect, it } from "vitest";
import { isAmazonUSA } from "./amazon";

describe("Amazon USA identification", () => {
  it("recognizes Amazon USA offers for affiliate-only disclosure", () => {
    expect(isAmazonUSA({ name: "Amazon USA", slug: "amazon-usa" })).toBe(true);
    expect(isAmazonUSA({ name: "Store", slug: "store", website_url: "https://www.amazon.com/" })).toBe(true);
    expect(isAmazonUSA({ name: "Store", slug: "store", tracking_link: "https://amzn.to/example" })).toBe(true);
  });
  it("does not label unrelated stores or lookalike domains as Amazon USA", () => {
    expect(isAmazonUSA({ name: "Amazonas Fashion", slug: "amazonas-fashion" })).toBe(false);
    expect(isAmazonUSA({ name: "Store", slug: "store", website_url: "https://amazon.com.example.org/" })).toBe(false);
    expect(isAmazonUSA({ name: "Amazon UK", slug: "amazon-uk", website_url: "https://amazon.co.uk/" })).toBe(false);
  });
});