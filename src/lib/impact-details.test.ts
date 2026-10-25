import { describe, expect, it } from "vitest";
import { countryLabel, extractImpactDetails, safeWebsite } from "./impact-details";

describe("documented Impact store details", () => {
  it("imports only documented public fields and deduplicates shipping destinations", () => {
    expect(extractImpactDetails({ CampaignDescription: "Brand description", AdvertiserUrl: "https://brand.example", CampaignUrl: "https://program.example", ShippingRegions: ["US", "UK", "US", "SOUTHAFRICA"], PrivateNotes: "private" })).toEqual({ description: "Brand description", advertiser_url: "https://brand.example/", campaign_url: "https://program.example/", shipping_regions: ["US", "UK", "SOUTHAFRICA"] });
  });
  it("does not fabricate shipping countries when none are provided", () => {
    expect(extractImpactDetails({}).shipping_regions).toBeUndefined();
    expect(extractImpactDetails({ ShippingRegions: [] }).shipping_regions).toEqual([]);
  });
  it("names Impact country enums without treating them as eligibility rules", () => {
    expect(["US", "UK", "SOUTHAFRICA", "NEWZEALAND", "CANADA"].map(countryLabel)).toEqual(["United States", "United Kingdom", "South Africa", "New Zealand", "Canada"]);
  });
  it("rejects unsafe website protocols and embedded credentials", () => {
    expect(safeWebsite("javascript:alert(1)")).toBeNull();
    expect(safeWebsite("https://user:password@example.com")).toBeNull();
    expect(safeWebsite("https://brand.example/shop")).toBe("https://brand.example/shop");
  });
});