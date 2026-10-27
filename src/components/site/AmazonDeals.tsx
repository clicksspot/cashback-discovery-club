import { ExternalLink, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmazonDisclosure } from "./AmazonDisclosure";

type AmazonOffer = { id: string; title: string; description: string; affiliate_url: string; image_url: string | null };

export function AmazonDeals({ offers }: { offers: AmazonOffer[] }) {
  return (
    <section className="container-page mt-16" aria-labelledby="amazon-deals-heading">
      <div className="mb-6 border-b border-border pb-5">
        <p className="text-sm font-semibold text-primary">Amazon.com · USA</p>
        <h2 id="amazon-deals-heading" className="mt-1 text-3xl font-extrabold">Amazon USA deals</h2>
        <p className="mt-2 text-sm text-muted-foreground">As an Amazon Associate I earn from qualifying purchases.</p>
      </div>
      {offers.length === 0 ? (
        <p className="py-6 text-muted-foreground">No Amazon offers are available right now.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <article key={offer.id} className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 shadow-card">
              {offer.image_url ? <img src={offer.image_url} alt={offer.title} loading="lazy" className="mb-4 aspect-[4/3] w-full rounded-md object-contain" /> : <div className="mb-4 flex h-16 items-center gap-3 text-muted-foreground"><ShoppingBag className="h-8 w-8" /><span className="text-sm font-semibold">Amazon USA</span></div>}
              <h3 className="break-words text-lg font-bold">{offer.title}</h3>
              {offer.description && <p className="mt-2 whitespace-pre-line break-words text-sm text-muted-foreground">{offer.description}</p>}
              <div className="mt-auto pt-5">
                <Button asChild className="h-auto min-h-11 w-full whitespace-normal">
                  <a href={offer.affiliate_url} target="_blank" rel="sponsored nofollow noopener noreferrer">Check price on Amazon <ExternalLink className="shrink-0" /></a>
                </Button>
                <AmazonDisclosure />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}