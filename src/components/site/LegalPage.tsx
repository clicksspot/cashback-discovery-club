import { SiteShell } from "./SiteShell";

export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: [string, string][] }) {
  return (
    <SiteShell>
      <div className="container-page max-w-3xl py-14">
        <h1 className="text-4xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="mt-10 space-y-8">
          {sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="text-xl font-bold">{h}</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
