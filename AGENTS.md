<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Money rules (shopper share, cashback rounding, tracking link subId1) live in `src/lib/cashback.ts` with tests; reuse them instead of re-deriving. Why: one source of truth for payouts.
- All Impact API access goes through `src/lib/impact.server.ts`, loaded only via dynamic import inside server handlers. Why: it reads secrets and uses the admin database client.
- Site-wide admin settings are key/value rows in `app_settings`, typed and defaulted in `src/lib/settings.ts`. Why: admins can change any setting without schema changes.
- Withdrawals are created only through the `request_withdrawal` database function. Why: balance and minimum checks must be atomic and server-enforced.
- Public pages read data through server functions in `src/lib/public.functions.ts`; signed-in and admin pages use the browser client under row-level security.
