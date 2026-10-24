// Example restaurants: a cocktail bar, a pizza & shawarma spot and a café.
// They show off how one data model carries three very different businesses.

import { ALL_OPTION_TEMPLATES, optionGroupFromTemplate, presetFor } from './presets'
import type { CategoryKey, ItemTag, Restaurant, TimeWindow, WeeklyHours } from './types'

export interface DemoItem {
  name: string
  description?: string
  price: number
  tags?: ItemTag[]
  // Option template keys (presets.ts)
  options?: string[]
  // Combo slots: choices by item name (+ upcharge)
  combo?: { name: string; choices: [string, number][] }[]
  status?: 'available' | 'sold-out'
  schedule?: TimeWindow[]
}

export interface DemoRestaurant {
  restaurant: Omit<Restaurant, 'id' | 'ownerScope' | 'createdAt' | 'theme'> & { category: CategoryKey }
  menu: { section: string; items: DemoItem[] }[]
  promotions: { name: string; description?: string; percentOff: number; schedule: TimeWindow[]; sections: string[] }[]
}

const daily = (open: string, close: string): WeeklyHours => Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, [{ open, close }]]))
const WEEKDAYS = [1, 2, 3, 4, 5]
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

export const DEMO_RESTAURANTS: DemoRestaurant[] = [
  {
    restaurant: {
      slug: 'velvet-hour',
      name: 'Velvet Hour',
      tagline: 'Cocktails after dark · Osu',
      description: 'A low-lit cocktail lounge pouring Ghanaian flavours into the classics — hibiscus, mango, smoked pineapple.',
      category: 'cocktail-bar',
      menuKind: 'drinks',
      currency: 'GHS',
      address: 'Oxford Street, Osu',
      city: 'Accra',
      phone: '0302 000 111',
      whatsapp: '0244 000 111',
      hours: {
        0: [{ open: '16:00', close: '01:00' }],
        1: [],
        2: [{ open: '17:00', close: '01:00' }],
        3: [{ open: '17:00', close: '01:00' }],
        4: [{ open: '17:00', close: '02:00' }],
        5: [{ open: '17:00', close: '03:00' }],
        6: [{ open: '17:00', close: '03:00' }],
      },
      fulfilment: {
        pickup: { enabled: true, prepMinutes: 10 },
        delivery: { enabled: false, fee: 0, minOrder: 0, etaMinutes: 0 },
        dineIn: { enabled: true, tables: ['Bar 1', 'Bar 2', 'Bar 3', 'Bar 4', 'Booth A', 'Booth B', 'Booth C', 'Terrace 1', 'Terrace 2'] },
      },
      payments: {
        cash: true,
        momo: { enabled: true, number: '0244 000 111', accountName: 'Velvet Hour Ltd', network: 'mtn' },
        payAtTable: true,
      },
      acceptingOrders: true,
      servesAlcohol: true,
    },
    menu: [
      {
        section: 'Signature cocktails',
        items: [
          {
            name: 'Accra Sunset',
            description: 'Aged rum, ripe mango, sobolo reduction, lime.',
            price: 95,
            tags: ['signature', 'popular', 'alcoholic'],
            options: ['ice'],
          },
          {
            name: 'Hibiscus Negroni',
            description: 'Gin, hibiscus-infused vermouth, bitter orange.',
            price: 110,
            tags: ['signature', 'alcoholic'],
            options: ['ice'],
          },
          {
            name: 'Smoked Pineapple Old Fashioned',
            description: 'Bourbon, charred pineapple syrup, Angostura, smoked under glass.',
            price: 120,
            tags: ['signature', 'alcoholic'],
          },
        ],
      },
      {
        section: 'Classics',
        items: [
          {
            name: 'Mojito',
            description: 'White rum, mint, lime, soda.',
            price: 85,
            tags: ['popular', 'alcoholic'],
            options: ['ice', 'garnish'],
          },
          { name: 'Margarita', description: 'Tequila, triple sec, lime, salted rim.', price: 90, tags: ['alcoholic'], options: ['ice'] },
          { name: 'Espresso Martini', description: 'Vodka, fresh espresso, coffee liqueur.', price: 100, tags: ['alcoholic'] },
        ],
      },
      {
        section: 'Mocktails',
        items: [
          {
            name: 'Sobolo Spritz',
            description: 'Hibiscus, ginger, clove and sparkling water.',
            price: 55,
            tags: ['non-alcoholic', 'popular'],
            options: ['ice'],
          },
          { name: 'Virgin Mojito', description: 'Mint, lime, cane sugar, soda.', price: 50, tags: ['non-alcoholic'], options: ['ice'] },
        ],
      },
      {
        section: 'Spirits',
        items: [
          {
            name: 'Bombay Sapphire Gin',
            description: 'With your choice of mixer.',
            price: 60,
            tags: ['alcoholic'],
            options: ['serve', 'mixer', 'ice'],
          },
          { name: 'Jameson Irish Whiskey', price: 55, tags: ['alcoholic'], options: ['serve', 'ice'] },
          { name: 'Hennessy VS', price: 75, tags: ['alcoholic'], options: ['serve', 'ice'] },
        ],
      },
      {
        section: 'Wine & bubbles',
        items: [
          { name: 'House Red', description: 'Smooth South African Merlot.', price: 70, tags: ['alcoholic'], options: ['glass'] },
          { name: 'Prosecco', description: 'Crisp, dry Italian fizz.', price: 80, tags: ['alcoholic'], options: ['glass'] },
        ],
      },
      {
        section: 'Beers',
        items: [
          { name: 'Club Lager', price: 30, tags: ['alcoholic'] },
          { name: 'Guinness Foreign Extra', price: 35, tags: ['alcoholic'], status: 'sold-out' },
        ],
      },
      {
        section: 'Bar bites',
        items: [
          {
            name: 'Spiced Kelewele Cups',
            description: 'Ginger-chilli plantain, roasted peanuts.',
            price: 45,
            tags: ['vegetarian', 'spicy'],
          },
          {
            name: 'Chicken Suya Skewers',
            description: 'Grilled, dusted with yaji, onion & tomato.',
            price: 65,
            tags: ['spicy', 'popular'],
          },
          {
            name: 'Date Night for Two',
            description: 'Two cocktails of your choice and a bite to share.',
            price: 260,
            tags: ['sharing'],
            combo: [
              {
                name: 'First cocktail',
                choices: [
                  ['Accra Sunset', 0],
                  ['Hibiscus Negroni', 10],
                  ['Mojito', 0],
                  ['Sobolo Spritz', 0],
                ],
              },
              {
                name: 'Second cocktail',
                choices: [
                  ['Accra Sunset', 0],
                  ['Hibiscus Negroni', 10],
                  ['Mojito', 0],
                  ['Sobolo Spritz', 0],
                ],
              },
              {
                name: 'Bite',
                choices: [
                  ['Spiced Kelewele Cups', 0],
                  ['Chicken Suya Skewers', 15],
                ],
              },
            ],
          },
        ],
      },
    ],
    promotions: [
      {
        name: 'Happy hour',
        description: '25% off signature and classic cocktails',
        percentOff: 25,
        schedule: [{ days: WEEKDAYS, from: '17:00', to: '19:00' }],
        sections: ['Signature cocktails', 'Classics'],
      },
    ],
  },
  {
    restaurant: {
      slug: 'blaze-pizza-shawarma',
      name: 'Blaze Pizza & Shawarma',
      tagline: 'Hot, loaded, fast · East Legon',
      description: 'Stone-baked pizzas and loaded shawarma, made to order and out the door in minutes.',
      category: 'fast-food',
      menuKind: 'food',
      currency: 'GHS',
      address: 'Lagos Avenue, East Legon',
      city: 'Accra',
      phone: '0302 000 222',
      whatsapp: '0554 000 222',
      hours: daily('11:00', '23:30'),
      fulfilment: {
        pickup: { enabled: true, prepMinutes: 20 },
        delivery: { enabled: true, fee: 15, minOrder: 60, area: 'East Legon, Airport, Madina', etaMinutes: 40 },
        dineIn: { enabled: false, tables: [] },
      },
      payments: {
        cash: true,
        momo: { enabled: true, number: '0554 000 222', accountName: 'Blaze Foods', network: 'telecel' },
        payAtTable: false,
      },
      acceptingOrders: true,
      servesAlcohol: false,
    },
    menu: [
      {
        section: 'Combos',
        items: [
          {
            name: 'Shawarma Meal',
            description: 'Shawarma, fries and a cold drink.',
            price: 85,
            tags: ['popular'],
            combo: [
              {
                name: 'Shawarma',
                choices: [
                  ['Classic Shawarma', 0],
                  ['Shawarma Platter', 40],
                ],
              },
              {
                name: 'Side',
                choices: [
                  ['Fries', 0],
                  ['Loaded Fries', 12],
                ],
              },
              {
                name: 'Drink',
                choices: [
                  ['Coca-Cola', 0],
                  ['Sprite', 0],
                  ['Malta Guinness', 3],
                ],
              },
            ],
          },
          {
            name: 'Pizza Night',
            description: 'Any pizza, wings and a 1.5 L drink.',
            price: 165,
            combo: [
              {
                name: 'Pizza',
                choices: [
                  ['Margherita', 0],
                  ['Pepperoni Feast', 15],
                  ['BBQ Chicken', 20],
                  ['Veggie Supreme', 10],
                ],
              },
              {
                name: 'Side',
                choices: [
                  ['Hot Wings (6)', 0],
                  ['Fries', 0],
                ],
              },
              { name: 'Drink', choices: [['Coca-Cola 1.5 L', 0]] },
            ],
          },
        ],
      },
      {
        section: 'Pizzas',
        items: [
          {
            name: 'Margherita',
            description: 'Tomato, mozzarella, basil.',
            price: 65,
            tags: ['vegetarian'],
            options: ['pizza-size', 'crust', 'toppings'],
          },
          {
            name: 'Pepperoni Feast',
            description: 'Double pepperoni, mozzarella, oregano.',
            price: 85,
            tags: ['popular'],
            options: ['pizza-size', 'crust', 'toppings'],
          },
          {
            name: 'BBQ Chicken',
            description: 'Smoky BBQ base, chicken, red onion, sweetcorn.',
            price: 90,
            options: ['pizza-size', 'crust', 'toppings'],
          },
          {
            name: 'Veggie Supreme',
            description: 'Peppers, mushrooms, onion, olives, corn.',
            price: 80,
            tags: ['vegetarian'],
            options: ['pizza-size', 'crust', 'toppings'],
          },
        ],
      },
      {
        section: 'Shawarma',
        items: [
          {
            name: 'Classic Shawarma',
            description: 'Wrapped in fresh pita with cabbage, carrots and your sauces.',
            price: 50,
            tags: ['popular'],
            options: ['protein', 'sauces', 'shawarma-extras', 'pepper'],
          },
          {
            name: 'Shawarma Platter',
            description: 'Sliced shawarma meat, fries, salad, pita and dips.',
            price: 95,
            tags: ['sharing'],
            options: ['protein', 'sauces', 'pepper'],
          },
        ],
      },
      {
        section: 'Burgers',
        items: [
          {
            name: 'Blaze Burger',
            description: 'Beef patty, cheddar, pickles, blaze sauce.',
            price: 70,
            tags: ['new', 'spicy'],
            options: ['pepper'],
          },
        ],
      },
      {
        section: 'Fries & sides',
        items: [
          { name: 'Fries', price: 25, tags: ['vegetarian'] },
          { name: 'Loaded Fries', description: 'Cheese sauce, shawarma chicken, jalapeños.', price: 40 },
          { name: 'Hot Wings (6)', description: 'Crispy wings tossed in house hot sauce.', price: 55, tags: ['spicy'] },
        ],
      },
      {
        section: 'Drinks',
        items: [
          { name: 'Coca-Cola', price: 15 },
          { name: 'Sprite', price: 15 },
          { name: 'Malta Guinness', price: 18 },
          { name: 'Coca-Cola 1.5 L', price: 30 },
        ],
      },
    ],
    promotions: [
      {
        name: 'Late-night slice',
        description: '15% off every pizza',
        percentOff: 15,
        schedule: [{ days: ALL_DAYS, from: '21:00', to: '23:30' }],
        sections: ['Pizzas'],
      },
    ],
  },
  {
    restaurant: {
      slug: 'kofi-and-crumb',
      name: 'Kofi & Crumb',
      tagline: 'Slow coffee, warm bakes · Airport Residential',
      description: 'Single-origin coffee, Ghana-grown cocoa and pastries baked every morning.',
      category: 'cafe',
      menuKind: 'mixed',
      currency: 'GHS',
      address: 'Liberation Road, Airport Residential',
      city: 'Accra',
      phone: '0302 000 333',
      whatsapp: '0204 000 333',
      hours: {
        0: [{ open: '08:00', close: '16:00' }],
        1: [{ open: '07:00', close: '19:00' }],
        2: [{ open: '07:00', close: '19:00' }],
        3: [{ open: '07:00', close: '19:00' }],
        4: [{ open: '07:00', close: '19:00' }],
        5: [{ open: '07:00', close: '19:00' }],
        6: [{ open: '07:00', close: '19:00' }],
      },
      fulfilment: {
        pickup: { enabled: true, prepMinutes: 10 },
        delivery: { enabled: true, fee: 12, minOrder: 40, area: 'Airport, Cantonments, Labone', etaMinutes: 35 },
        dineIn: { enabled: true, tables: ['1', '2', '3', '4', '5', '6', '7', '8', 'Window 1', 'Window 2'] },
      },
      payments: {
        cash: true,
        momo: { enabled: true, number: '0204 000 333', accountName: 'Kofi & Crumb', network: 'airteltigo' },
        payAtTable: true,
      },
      acceptingOrders: true,
      servesAlcohol: false,
    },
    menu: [
      {
        section: 'Breakfast',
        items: [
          {
            name: 'Avocado Toast',
            description: 'Sourdough, smashed avocado, chilli flakes, poached egg.',
            price: 55,
            tags: ['vegetarian', 'popular'],
          },
          { name: 'Pancake Stack', description: 'Fluffy pancakes, honey butter, fresh pineapple.', price: 50, tags: ['vegetarian'] },
          { name: 'Full Kofi Breakfast', description: 'Eggs your way, sausage, beans, toast, fried plantain.', price: 75 },
        ],
      },
      {
        section: 'Coffee',
        items: [
          { name: 'Espresso', price: 20, options: ['coffee-extras'] },
          {
            name: 'Cappuccino',
            description: 'Velvety microfoam over a double shot.',
            price: 30,
            tags: ['popular'],
            options: ['cup', 'milk', 'sweetness', 'coffee-extras'],
          },
          { name: 'Flat White', price: 32, options: ['milk', 'sweetness', 'coffee-extras'] },
          { name: 'Caramel Latte', price: 38, options: ['cup', 'milk', 'temp', 'coffee-extras'] },
          {
            name: 'Ghana Cocoa Mocha',
            description: 'Espresso with Ghana-grown dark cocoa.',
            price: 38,
            tags: ['signature'],
            options: ['cup', 'milk', 'temp', 'coffee-extras'],
          },
        ],
      },
      {
        section: 'Tea & chocolate',
        items: [
          { name: 'Hot Chocolate', description: 'Rich Ghana cocoa, steamed milk.', price: 30, options: ['cup', 'milk', 'sweetness'] },
          { name: 'Lemongrass & Ginger Tea', price: 20, tags: ['vegan'], options: ['sweetness'] },
        ],
      },
      {
        section: 'Iced & blended',
        items: [
          { name: 'Iced Latte', price: 35, options: ['cup', 'milk', 'sweetness', 'coffee-extras'] },
          { name: 'Iced Hibiscus Tea', price: 25, tags: ['vegan'], options: ['sweetness'] },
        ],
      },
      {
        section: 'Pastries & cakes',
        items: [
          { name: 'Butter Croissant', price: 22, tags: ['vegetarian'] },
          { name: 'Banana Bread', description: 'Toasted, with salted butter.', price: 20, tags: ['vegetarian', 'popular'] },
          { name: 'Chocolate Brownie', price: 25, tags: ['vegetarian'] },
          {
            name: 'Coffee & Pastry',
            description: 'Any coffee with a pastry — the morning classic.',
            price: 45,
            tags: ['popular'],
            combo: [
              {
                name: 'Coffee',
                choices: [
                  ['Cappuccino', 0],
                  ['Flat White', 0],
                  ['Caramel Latte', 5],
                ],
              },
              {
                name: 'Pastry',
                choices: [
                  ['Butter Croissant', 0],
                  ['Banana Bread', 0],
                  ['Chocolate Brownie', 3],
                ],
              },
            ],
          },
        ],
      },
      {
        section: 'Sandwiches',
        items: [
          { name: 'Chicken Club', description: 'Grilled chicken, bacon, lettuce, tomato, toasted.', price: 60 },
          { name: 'Halloumi & Roast Veg', description: 'On focaccia with pesto.', price: 55, tags: ['vegetarian'] },
        ],
      },
    ],
    promotions: [
      {
        name: 'Afternoon pick-me-up',
        description: '10% off iced drinks',
        percentOff: 10,
        schedule: [{ days: WEEKDAYS, from: '14:00', to: '17:00' }],
        sections: ['Iced & blended'],
      },
    ],
  },
]

export const templateGroup = (key: string) => {
  const t = ALL_OPTION_TEMPLATES.find((x) => x.key === key)
  return t ? optionGroupFromTemplate(t) : null
}

export const demoTheme = (category: CategoryKey) => structuredCloneSafe(presetFor(category).theme)

const structuredCloneSafe = <T>(v: T): T => JSON.parse(JSON.stringify(v))
