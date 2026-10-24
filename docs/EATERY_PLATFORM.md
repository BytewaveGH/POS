# Eatery platform: design notes

Sellix Eats lets many different food and drink businesses each sell under their own brand. They share one data model, one backend and one set of components. Only a per-restaurant **theme config** changes how a storefront looks.

| Where                                                | Who                   | What                                                                                |
| ---------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| `/eat`                                               | Customers, no sign-in | Directory of every restaurant. Each card is styled with that restaurant's theme.    |
| `/eat/<slug>` (`?table=<name>` from a table QR code) | Customers             | Branded storefront: menu, options, deals, ordering.                                 |
| `/eat/<slug>/checkout`                               | Customers             | Cart, pickup / delivery / at my table, details, payment (cash, MoMo, pay at table). |
| `/eat/<slug>/order/<code>`                           | Customers             | Live order status. Updates every 10 s.                                              |
| `/eatery`                                            | Owners and staff      | Overview, plus onboarding for a business with no restaurant yet.                    |
| `/eatery/orders`                                     | `canManageSales`      | Live board: New → In the kitchen → Ready / on the way → Done.                       |
| `/eatery/menu`                                       | `canManageProducts`   | Sections, items, option groups, combos, availability, time-based deals.             |
| `/eatery/brand`                                      | `canManageProducts`   | Theme editor with presets, a contrast checker and a live phone preview.             |
| `/eatery/settings`                                   | `canManageOperations` | Details, hours, ways to order, payments, table QR codes.                            |

One business (tenant) can own several restaurants. A switcher on each owner page selects which one is being managed.

## 1. Design rationale

**Brand first, then menu.** A cocktail bar and a shawarma spot shouldn't be the same template in different colours. Their difference is the _mood_: how the page opens, how dense the menu is, the shape of things, the voice. So a theme controls five independent dimensions, not just a palette:

1. **Colour:** six roles: page, cards, text, secondary text, brand colour, accent.
2. **Type:** a display face for headings and a body face. Headings can be set in capitals.
3. **Layout:**
   - the hero: _cinematic_, _poster_, _cozy_ or _minimal_;
   - the menu: _elegant list_, _bold grid_, _cozy cards_ or _compact list_.
4. **Shape and texture:** corner radius (sharp → pill) and a CSS-only pattern (art deco, halftone, steam, kente, embers, sprinkles, citrus, dots).
5. **Voice:** button and basket wording, e.g. "Add to tab" and "Your tab" for a bar, "Your box" for a bakery.

Because the dimensions are independent, eight presets give clearly different results. Owners can mix them: a juice bar can take the cocktail bar's list layout and keep its citrus colours.

**Presets by category.** Each preset is a complete starting point:

- a theme;
- starter menu sections, some already timed, e.g. breakfast until 11:30;
- reusable option templates (pizza sizes and crusts, shawarma proteins and sauces, cocktail ice and mixers, coffee milk and sweetness);
- default ways to order.

| Preset                        | Mood                        | Type                       | Hero / menu              | Pattern   |
| ----------------------------- | --------------------------- | -------------------------- | ------------------------ | --------- |
| Cocktail bar & lounge         | Midnight and gold, intimate | Playfair Display + DM Sans | Cinematic / elegant list | Art deco  |
| Pizza, shawarma & fast food   | Red and mustard, loud       | Bebas Neue (caps) + Outfit | Poster / bold grid       | Halftone  |
| Café & coffee shop            | Cream and espresso, warm    | Fraunces + Nunito          | Cozy / cozy cards        | Steam     |
| Local dishes & chop bar       | Forest green and gold       | Outfit + Nunito            | Poster / cozy cards      | Kente     |
| Grill & barbecue              | Charcoal and ember          | Oswald (caps) + DM Sans    | Cinematic / bold grid    | Embers    |
| Bakery & pastry               | Berry on blush              | Pacifico + Nunito          | Cozy / bold grid         | Sprinkles |
| Juice & smoothie bar          | Leaf and mango              | Outfit                     | Poster / bold grid       | Citrus    |
| Restaurant (sells everything) | Neutral, legible            | DM Sans                    | Minimal / compact list   | Dots      |

**Mobile-first and fast.**

- Fonts are self-hosted (`@fontsource`, SIL OFL). Each `@font-face` downloads only when a page uses it, so a storefront fetches one or two families.
- Patterns are CSS and inline SVG, and items without photos get branded initial tiles. A menu needs no image downloads at all.
- Item options open in a bottom sheet on phones and a centred dialog on desktop.
- Tap targets are at least 44 px, inputs are 16 px so iOS doesn't zoom, and the safe-area insets are respected.

**Accessible whatever the owner picks.** `resolveTheme()` checks the text, secondary text, price and button-label colour pairs against WCAG AA (4.5:1), and buttons against the page at 3:1.

- When a pair fails, the storefront renders an adjusted colour. It keeps the hue and moves toward black or white.
- The editor shows each pair's contrast ratio, and **Fix contrast** saves the corrected colours.
- All eight presets pass as shipped (`tests/eatery-core.test.ts`).

The storefront also has:

- visible focus rings in the brand's readable colour;
- tags, sold-out states and deals that use text and icons, never colour alone;
- `prefers-reduced-motion` support;
- real radio and checkbox inputs in the option sheet;
- an 18+ notice wherever alcohol is sold.

**Adding a new kind of restaurant** means adding one entry to `PRESETS` in `src/lib/eatery/presets.ts`: theme, sections and option templates. Nothing else in the app switches on the category. A new look, such as a new hero or pattern, is one case in `hero.tsx` or `patternStyle()`.

## 2. Data model

All types live in `src/lib/eatery/types.ts`, and every kind of restaurant uses the same records:

```
Restaurant ─┬─ MenuCategory ── MenuItem ─┬─ optionGroups: OptionGroup[] ── choices: OptionChoice[]
            │                            └─ combo?: { slots: ComboSlot[] ── choices: { itemId, upcharge }[] }
            ├─ Promotion   (percentOff + schedule, scoped to categories/items or the whole menu)
            └─ Order ── lines: OrderLine[]   (priced by the server from OrderLineInput)
```

**Restaurant** has the fields `ownerScope`, `slug`, `name`, `tagline`, `description`, `category` and `menuKind` (`drinks` | `food` | `mixed`), plus these settings:

| Field                                  | Contents                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `theme`                                | The theme config (§3)                                                             |
| `currency`                             | Currency code, default `GHS`                                                      |
| `address`, `city`, `phone`, `whatsapp` | Contact details                                                                   |
| `hours`                                | `WeeklyHours`; overnight periods are allowed                                      |
| `fulfilment`                           | Pickup (prep minutes), delivery (fee, minimum order, ETA, area), dine-in (tables) |
| `payments`                             | Cash, MoMo (number, name, network), pay at table                                  |
| `acceptingOrders`                      | Pauses ordering when off                                                          |
| `servesAlcohol`                        | Turns on the 18+ notice                                                           |

**Flexible menus come from one structure:**

- **Variants:** an option group of kind `variant` with `min = max = 1`, e.g. pizza size, crust, shawarma protein, serve (single/double), ice.
- **Add-ons:** kind `addon` with `min..max`, e.g. toppings (up to 5), sauces (up to 3), mixers, extra shot. Each choice has a `priceDelta` and its own `soldOut` flag.
- **Combos:** a fixed `price` plus `combo.slots`. The customer picks one item per slot, e.g. main, side and drink, and premium picks carry an `upcharge`.
- **Availability:** `status` (`available` | `sold-out` | `hidden`) plus an optional `schedule` of `TimeWindow`s on the item or its category, e.g. breakfast 07:00–11:30.
- **Time-based pricing:** a `Promotion` with `percentOff` and `schedule`, e.g. happy hour Mon–Fri 17:00–19:00. The best live promotion applies, and promotions don't stack.

**Orders never trust the client.** The customer sends ids, choices and quantities only. `priceOrder()` in `src/lib/eatery/menu.ts` works out each line's unit price, deal discount, subtotal, delivery fee and total, and lists any problems. The local data source and the backend (`BACKEND_REQUIREMENTS.md` §7) apply the same rules.

The customer's device keeps `{ slug, code, accessKey }` so it can follow the order. Statuses run `placed → accepted → preparing → ready | out-for-delivery → completed`, or `cancelled`, and `history` records when each one happened.

## 3. Theme configuration format

The theme is stored as JSON on `restaurant.theme` (`ThemeConfig` in `src/lib/eatery/theme.ts`):

```json
{
  "version": 1,
  "preset": "cocktail-bar",
  "colors": {
    "background": "#0E0B12",
    "surface": "#1A1520",
    "text": "#F5EFE6",
    "muted": "#B9AFC2",
    "primary": "#D4A84F",
    "accent": "#B4527A"
  },
  "fonts": { "display": "playfair", "body": "dm-sans" },
  "uppercaseHeadings": false,
  "shape": "soft",
  "hero": "cinematic",
  "menuLayout": "elegant-list",
  "pattern": "deco",
  "imagery": { "logoUrl": "https://…", "coverUrl": "https://…", "coverOverlay": 0.6 },
  "copy": { "add": "Add to tab", "cart": "Your tab" }
}
```

| Field                  | Values                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `fonts.display`        | `playfair`, `fraunces`, `oswald`, `bebas`, `pacifico`, `outfit`, `dm-sans`, `nunito`, `mulish` |
| `fonts.body`           | `outfit`, `dm-sans`, `nunito`, `mulish` (script and poster faces are headings only)            |
| `shape`                | `sharp`, `soft`, `rounded`, `pill`                                                             |
| `hero`                 | `cinematic`, `poster`, `cozy`, `minimal`                                                       |
| `menuLayout`           | `elegant-list`, `bold-grid`, `cozy-cards`, `compact-list`                                      |
| `pattern`              | `none`, `deco`, `halftone`, `steam`, `kente`, `ember`, `sprinkles`, `citrus`, `dots`           |
| `imagery.coverOverlay` | 0–0.85; the storefront never uses less than 0.35 over a photo, so the name stays readable      |

At render time, `<ThemeScope theme>` turns the config into CSS custom properties: `--e-bg`, `--e-surface`, `--e-text`, `--e-muted`, `--e-primary`, `--e-on-primary`, `--e-primary-text`, `--e-accent`, `--e-on-accent`, `--e-border`, `--e-radius`, `--e-radius-control`, `--e-font-display`, `--e-font-body` and `--e-heading-case`. The contrast-safe values are already applied. Every storefront component reads only these variables (`src/components/eatery/storefront.css`), which is why one set of components renders every brand.

## 4. Code map

| Path                                    | Contents                                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/eatery/`                       | `types`, `theme`, `color` (WCAG maths), `presets`, `menu` (hours, availability, deals, pricing), `seed` (example restaurants), `data-source` (local + API), `hooks`, `cart`, `setup` |
| `src/components/eatery/`                | `ThemeScope`, `Cover`, `BrandMark`, `Hero`, `MenuView`, `ItemSheet`, `Storefront`, `RestaurantCard`, fonts and CSS                                                                   |
| `src/app/[locale]/(eatery-public)/eat/` | Customer pages, outside the dashboard shell and public in `middleware.ts`                                                                                                            |
| `src/app/[locale]/(eatery)/eatery/`     | Owner pages                                                                                                                                                                          |

## 5. Local mode (until the backend ships)

With `NEXT_PUBLIC_EATERY_DATA_SOURCE=local`, everything lives in this browser's `localStorage`. That includes customers' orders, so an order placed on a phone won't reach the owner's laptop.

To try the full loop, open the storefront and the orders board as two tabs of the same browser; the tabs sync automatically. The three example restaurants (Velvet Hour, Blaze Pizza & Shawarma, Kofi & Crumb) appear in the directory on first visit. **Add the examples** on `/eatery` hands them to the signed-in business.
