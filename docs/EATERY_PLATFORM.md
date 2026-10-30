# Eatery platform: design notes

Sellix Eats lets many different food and drink businesses each sell under their own brand. They share one data model, one backend and one set of components. Only a per-restaurant **theme config** changes how a storefront looks.

| Where                                                | Who                   | What                                                                                                                                                    |
| ---------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/eat`                                               | Customers, no sign-in | Directory of every restaurant. Each card is styled with that restaurant's theme.                                                                        |
| `/eat/<slug>` (`?table=<name>` from a table QR code) | Customers             | Branded storefront: menu, options, deals, ordering.                                                                                                     |
| `/eat/<slug>/checkout`                               | Customers             | Cart, pickup / delivery / at my table, details, payment (cash, MoMo, pay at table).                                                                     |
| `/eat/<slug>/order/<code>`                           | Customers             | Live order status. Updates every 10 s.                                                                                                                  |
| `/eatery`                                            | Owners and staff      | Overview, plus onboarding for a business with no restaurant yet.                                                                                        |
| `/eatery/sales`                                      | `canViewReports`      | Sales: transactions (search, filters, detail, reprint, mark paid, cancel), daily totals, by-hour/by-day chart, CSV export, printable end-of-day report. |
| `/eatery/pos`                                        | `canManageSales`      | Counter POS: tap to ring up dine-in or take-away orders; accept or decline incoming online orders.                                                      |
| `/eatery/orders`                                     | `canManageSales`      | Live board: New → In the kitchen → Ready / on the way → Done.                                                                                           |
| `/eatery/stock`                                      | `canManageStock`      | Ingredients and stock, recipes and margins, expenses, stock history.                                                                                    |
| `/eatery/menu`                                       | `canManageProducts`   | Sections, items, option groups, combos, availability, time-based deals.                                                                                 |
| `/eatery/brand`                                      | `canManageProducts`   | Theme editor with presets, a contrast checker and a live phone preview.                                                                                 |
| `/eatery/settings`                                   | `canManageOperations` | Details, hours, ways to order, payments, table QR codes.                                                                                                |

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
  "surface": "outlined",
  "backdrop": "solid",
  "imagery": { "logoUrl": "https://…", "coverUrl": "https://…", "coverOverlay": 0.6 },
  "copy": { "add": "Add to tab", "cart": "Your tab" }
}
```

| Field                  | Values                                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fonts.display`        | `playfair`, `fraunces`, `instrument`, `syne`, `space-grotesk`, `oswald`, `bebas`, `pacifico`, `outfit`, `inter`, `dm-sans`, `nunito`, `mulish`                                                       |
| `fonts.body`           | `space-grotesk`, `outfit`, `inter`, `dm-sans`, `nunito`, `mulish` (script, poster and editorial faces are headings only)                                                                             |
| `shape`                | `sharp`, `soft`, `rounded`, `pill`                                                                                                                                                                   |
| `hero`                 | `cinematic`, `poster`, `cozy`, `minimal`                                                                                                                                                             |
| `menuLayout`           | `elegant-list`, `bold-grid`, `cozy-cards`, `compact-list`                                                                                                                                            |
| `pattern`              | `none`, `deco`, `halftone`, `steam`, `kente`, `ember`, `sprinkles`, `citrus`, `dots`, `grid`, `waves`                                                                                                |
| `surface` (optional)   | `outlined` (default), `elevated` (soft shadow), `glass` (frosted over the backdrop; solid where blur isn't supported or reduced transparency is requested), `brutal` (thick ink border, hard shadow) |
| `backdrop` (optional)  | `solid` (default), `gradient`, `mesh`; colour washes stay at 16% or less so the contrast checks still hold                                                                                           |
| `imagery.coverOverlay` | 0–0.85; the storefront never uses less than 0.35 over a photo, so the name stays readable                                                                                                            |

At render time, `<ThemeScope theme>` turns the config into CSS custom properties: `--e-bg`, `--e-surface`, `--e-text`, `--e-muted`, `--e-primary`, `--e-on-primary`, `--e-primary-text`, `--e-accent`, `--e-on-accent`, `--e-border`, `--e-radius`, `--e-radius-control`, `--e-font-display`, `--e-font-body` and `--e-heading-case`. The contrast-safe values are already applied. Every storefront component reads only these variables (`src/components/eatery/storefront.css`), which is why one set of components renders every brand.

### Modern styles

Next to the eight presets by kind of place, `src/lib/eatery/styles.ts` defines ten styles by taste. Any restaurant can wear any of them:

| Style        | Look                                    | Type                       | Surface / backdrop             |
| ------------ | --------------------------------------- | -------------------------- | ------------------------------ |
| Noir         | Monochrome luxury, dark                 | Instrument Serif + Inter   | Outlined / solid               |
| Swiss        | Strict grid, signal red                 | Space Grotesk + Inter      | Outlined / solid, grid pattern |
| Aurora Glass | Frosted cards over a colour mesh, dark  | Syne + Inter               | Glass / mesh                   |
| Neo-brutal   | Ink outlines, hard shadows, loud colour | Space Grotesk (caps)       | Bold ink / solid               |
| Editorial    | Food-magazine spread                    | Instrument Serif + DM Sans | Elevated / solid               |
| Soft Clay    | Pastel, rounded, tactile                | Outfit + Inter             | Elevated / gradient            |
| Sage & Stone | Muted greens, natural, calm             | Fraunces + Inter           | Elevated / solid               |
| Night Market | Neon street food after dark             | Bebas Neue + Space Grotesk | Outlined / mesh                |
| Citrus Pop   | Electric blue and lime on white         | Syne + Space Grotesk       | Elevated / solid               |
| Champagne    | Ivory and bronze, daylight luxury       | Playfair + Inter           | Elevated / solid, art deco     |

`applyStyle()` changes every visual setting and keeps the restaurant's logo, cover photo, wording and kind of place. The editor shows each style as a live miniature of the restaurant's own storefront, with its name and dishes. All ten pass WCAG AA as shipped.

### Festival editions

`src/lib/eatery/festivals.ts` lists 13 festivals: New Year, Valentine's Day, Independence Day, Ramadan, Eid al-Fitr, Easter, Mother's Day, Eid al-Adha, Father's Day, Pink October, Halloween, Black Friday and Christmas. While one is on, the public pages mark it, then go back to normal the day after. **The restaurant's brand always leads.**

- **A touch (default):** the owner's colours stay. The festival adds a slim bar at the very top in its own colours (a dark shade with a hairline of festival colours, such as the Ghana flag for Independence Day), a round seal on the header with the festival's name and year set around the rim, a ring in the festival colour around the logo, and that colour as the accent (deal banners, badges).
- **Full festival colours (opt-in):** all of the above, plus the festival's light or dark palette, whichever matches the owner's page background.
- Fonts, layout, photos, pattern and wording never change.
- **Nothing is saved into the owner's colours.** `useStorefront` and `useDirectory` (`hooks.ts`) apply the festival as they read the restaurant. `theme.festival` exists only at runtime and is never saved.
- **Owner settings** are saved in the theme as `seasonal` (optional; defaults shown): `{ "auto": true, "intensity": "accent", "banner": true, "off": [], "skipped": [], "messages": {} }`. `off` lists festivals turned off for good. `skipped` lists single occurrences (`"halloween:2026"`) that return the next year. `messages` holds the owner's own line for a festival's bar, up to 90 characters.
- **Overlaps:** the shorter festival wins, so Halloween replaces Pink October in the last week of October. If the owner skips Halloween, Pink October shows again.
- **Moving dates** are calculated: Easter (Good Friday to Easter Monday), Mother's and Father's Day, and Black Friday (Monday to Cyber Monday). Ramadan and the two Eids come from a table of expected dates for 2025–2030; extend it each year.
- **Editor:** Brand & theme → Start from a style → Festivals. It has the settings, a spotlight on one festival (seal, bar preview, message, preview on the phone, skip or remove this year) and the year ahead as an agenda with an on/off switch per festival.
- Bar text, seal ink and every full palette pass WCAG AA (`tests/eatery-festivals.test.tsx`).

## 4. Counter, ingredients and profit

**Counter POS** (`/eatery/pos`):

- Staff tap items onto a ticket. Items with sizes or extras open the same option sheet customers use.
- They choose dine-in (with a table) or take-away, and payment by cash, MoMo or card. Payment can be now or later; for cash, the POS works out the change.
- **Charge** creates a counter order that is already accepted.
- The printed receipt carries a QR code. Scanning it opens the customer's own order page, which pings them when the order is ready.
- Online orders waiting for a decision appear at the top of the POS and on the orders board, with a chime and a system notification. Accepting one updates the customer's page within 10 seconds. The customer gets a sound, a vibration and, if they allowed it, a system notification.

**Sales patterns** (overview), for the last 7, 30 or 90 days, measured in sales or orders:

- **Summary tiles:** total with the change against the previous period, average open day with the best day, strongest weekday and peak hour, and quietest weekday and hour.
- **Plain-language insights,** e.g. "Fridays are your strongest day — 32% above an average day", "12pm–2pm brings 41% of sales", "Tuesdays run 25% below average — a good day for a deal".
- **Charts:**

  - daily trend, with a 7-day average and the best and slowest days marked;
  - weekday × hour heatmap of averages, in a single blue that deepens with sales;
  - average by weekday and by hour.

  Every chart has hover/focus details and a **View as table** option. Cancelled orders and closed days aren't counted as lows. Rules: `src/lib/eatery/patterns.ts`.

**Sales** (`/eatery/sales`):

- Periods (today, yesterday, this week, this month, 30 days, custom) with net sales, a trend against the previous period, orders and average, how it was paid, and what's still unpaid.
- **Transactions:** search by code, customer, phone or item, and filter by channel, type, payment method, payment status and order status. Each order opens a full record: items with options, payment and change, timeline and profit, with reprint, mark paid and cancel.
- **Daily totals:** one row per day (orders, net sales, cash, MoMo, card, at table, unpaid, average) with a totals row. Tap a day to see its transactions.
- **Export CSV** for either view, opening cleanly in Excel. **Day report** prints an end-of-day (Z) report with a cash-count line.
- On the POS, **Today** shows the cashier today's takings and orders (reprint, collect), since cashiers often can't see reports.

**Ingredients** (`/eatery/stock`):

- Each ingredient has a unit, an average cost and a stock level.
- **Bought** adds stock and re-averages the cost. **Waste** removes stock and counts it against profit. **Count** sets the actual level.
- A **recipe** says what one portion of a menu item uses. Option choices can add to or swap ingredients, e.g. Large adds dough and cheese, Beef replaces chicken.
- When an order is accepted, its ingredients leave stock and the order records its cost. Cancelling puts them back.

**Profit** (overview), per period (today, this week, this month, 30 days):

- Sales.
- Ingredients used.
- Gross profit.
- Waste and running costs (rent, wages, gas, electricity…).
- Net profit, with a breakdown bar and the best earners by profit.
- Warnings when sold items have no recipe (cost understated) and when ingredients are running low.

**Buying units vs using units** (`src/lib/eatery/units.ts`):

- Each ingredient has a _use_ unit (what recipes and stock count in) and, optionally, how it's bought: tissue bought by the **pack of 50 pieces** at ₵7 is ₵0.14 a piece. Stock shows as "2 packs + 34 pieces"; purchases, waste and counts are entered as packs and pieces.
- kg↔g and l↔ml convert automatically, so a recipe can say "250 g" of rice bought in 25 kg bags. Recipe lines are always stored in the ingredient's own unit; the unit the owner typed is kept only to show it back.
- About 30 ready-made items (tissue, takeaway boxes, Coke by the crate, rice by the bag, gas by the cylinder…) fill in units and pack sizes; the owner only checks the price.
- Changing how an ingredient is counted (e.g. fixing tissue from "pack" to "pieces, 50 a pack") converts its stock and every recipe using it.

**Recipes** say what _one serving_ uses (a plate, cup, glass or slice). Each line shows its cost; the footer shows cost, price, profit and margin. A new ingredient can be created without leaving the recipe.

**Packaging & extras** (tissue, boxes, bags, straws) are set once — for every order, take-away only or dine-in only, once per order or per item — instead of being added to every recipe. They leave stock and count in the order's cost.

**Guard rails:** half a pack/crate/bag or more per serving with no pack size set gets a warning with a one-tap **Set pack size** fix; any line over half the price, or a dish costing more than it sells for, is flagged.

Rules: `src/lib/eatery/costing.ts` and `units.ts`. Contract: `BACKEND_REQUIREMENTS.md` §7.5.

## 5. Code map

| Path                                    | Contents                                                                                                                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/eatery/`                       | `types`, `theme`, `color` (WCAG maths), `presets`, `styles`, `festivals`, `menu` (hours, availability, deals, pricing), `seed` (example restaurants), `data-source` (local + API), `hooks`, `cart`, `setup` |
| `src/components/eatery/`                | `ThemeScope`, `Cover`, `BrandMark`, `Hero`, `MenuView`, `ItemSheet`, `Storefront`, `RestaurantCard`, fonts and CSS                                                                                          |
| `src/app/[locale]/(eatery-public)/eat/` | Customer pages, outside the dashboard shell and public in `middleware.ts`                                                                                                                                   |
| `src/app/[locale]/(eatery)/eatery/`     | Owner pages                                                                                                                                                                                                 |

## 6. Local mode (until the backend ships)

With `NEXT_PUBLIC_EATERY_DATA_SOURCE=local`, everything lives in this browser's `localStorage`. That includes customers' orders, so an order placed on a phone won't reach the owner's laptop.

To try the full loop, open the storefront and the orders board as two tabs of the same browser; the tabs sync automatically. The three example restaurants (Velvet Hour, Blaze Pizza & Shawarma, Kofi & Crumb) appear in the directory on first visit. **Add the examples** on `/eatery` hands them to the signed-in business.
