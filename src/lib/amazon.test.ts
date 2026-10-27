import { describe, expect, it } from "vitest";
import { amazonAffiliateUrl, isAmazonUSA } from "./amazon";

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

describe("Direct SiteStripe links", () => {
  it("preserves Amazon USA affiliate links exactly without cashback tracking", () => {
    const link = "https://www.amazon.com/dp/B000000000?tag=example-20&linkCode=ll1";
    expect(amazonAffiliateUrl(link)).toBe(link);
    expect(amazonAffiliateUrl("https://amzn.to/example")).toBe("https://amzn.to/example");
  });
  it("rejects untagged links, other marketplaces and unsafe destinations", () => {
    for (const link of ["https://amazon.com/dp/example", "https://amazon.co.uk/?tag=example-21", "https://amazon.com.evil.org/?tag=example-20", "http://amzn.to/example", "https://user:pass@amazon.com/?tag=example-20", "javascript:alert(1)"]) {
      expect(amazonAffiliateUrl(link)).toBeNull();
    }
  });
});