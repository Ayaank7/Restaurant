import type {
  InventoryItem,
  MenuItem,
  Order,
  Recipe,
  Session,
  StaffUser,
  Table,
} from "./types";

// In-memory data store. Singleton on the server. Easily swappable for a DB later.
// Using globalThis to survive HMR in dev.
interface RosStore {
  tables: Table[];
  sessions: Session[];
  menuItems: MenuItem[];
  orders: Order[];
  inventory: InventoryItem[];
  recipes: Recipe[];
  staff: StaffUser[];
}

const g = globalThis as unknown as { __rosStore?: RosStore };

function seed(): RosStore {
  const tables: Table[] = [
    { id: "T1", label: "01", capacity: 2, status: "available", currentSessionId: null, zone: "Window" },
    { id: "T2", label: "02", capacity: 4, status: "available", currentSessionId: null, zone: "Main Floor" },
    { id: "T3", label: "03", capacity: 4, status: "available", currentSessionId: null, zone: "Main Floor" },
    { id: "T4", label: "04", capacity: 6, status: "available", currentSessionId: null, zone: "Banquette" },
    { id: "T5", label: "05", capacity: 2, status: "available", currentSessionId: null, zone: "Bar" },
  ];

  const menuItems: MenuItem[] = [
    { id: "M1", name: "Charred Sourdough", description: "Cultured butter, smoked sea salt, garden herbs.", price: 9, category: "Openers", image: "dish-sourdough", tag: "Vegetarian" },
    { id: "M2", name: "Oysters on Ice", description: "Six rock oysters, shallot mignonette, lemon.", price: 24, category: "Openers", image: "dish-oysters" },
    { id: "M3", name: "Heritage Beetroot", description: "Smoked curd, pickled pine, elderberry.", price: 18, category: "Openers", image: "dish-beetroot", tag: "Signature" },
    { id: "M4", name: "Heirloom Tomato", description: "Whipped ricotta, basil oil, toasted pine.", price: 17, category: "Openers", image: "dish-tomato", tag: "Vegetarian" },
    { id: "M5", name: "Caesar, Reimagined", description: "Little gem, aged parmesan, white anchovy.", price: 16, category: "Openers", image: "dish-caesar" },
    { id: "M6", name: "Roasted Turbot", description: "Lemon verbena beurre blanc, fennel pollen.", price: 38, category: "Mains", image: "dish-turbot", tag: "Signature" },
    { id: "M7", name: "Dry-Aged Ribeye", description: "Bone marrow, peppercorn jus, watercress.", price: 54, category: "Mains", image: "dish-ribeye" },
    { id: "M8", name: "Truffle Gnocchi", description: "Brown butter, parmesan, black truffle.", price: 28, category: "Mains", image: "dish-gnocchi", tag: "Vegetarian" },
    { id: "M9", name: "Salt-Baked Celeriac", description: "Brown butter, sage, hazelnut crumb.", price: 22, category: "Mains", image: "dish-celeriac", tag: "Vegan" },
    { id: "M10", name: "Burrata & Fig", description: "Honeycomb, aged balsamic, mint.", price: 19, category: "Openers", image: "dish-burrata", tag: "Vegetarian" },
    { id: "M11", name: "Dark Chocolate Tart", description: "Maldon salt, single-origin olive oil.", price: 14, category: "Desserts", image: "dish-tart" },
    { id: "M12", name: "Vanilla Panna Cotta", description: "Raspberry coulis, fresh mint.", price: 12, category: "Desserts", image: "dish-pannacotta" },
  ];

  const inventory: InventoryItem[] = [
    { ingredient: "Beef", stock: 24, unit: "portions" },
    { ingredient: "Turbot", stock: 18, unit: "portions" },
    { ingredient: "Truffle", stock: 12, unit: "g" },
    { ingredient: "Burrata", stock: 16, unit: "balls" },
    { ingredient: "Sourdough", stock: 30, unit: "slices" },
  ];

  const recipes: Recipe[] = [
    { menuItemId: "M1", ingredient: "Sourdough", quantityRequired: 2 },
    { menuItemId: "M6", ingredient: "Turbot", quantityRequired: 1 },
    { menuItemId: "M7", ingredient: "Beef", quantityRequired: 1 },
    { menuItemId: "M8", ingredient: "Truffle", quantityRequired: 3 },
    { menuItemId: "M10", ingredient: "Burrata", quantityRequired: 1 },
  ];

  const staff: StaffUser[] = [
    { id: "U1", name: "Alex Admin", email: "admin@maison.test", password: "admin123", role: "ADMIN" },
    { id: "U2", name: "Wren Waiter", email: "waiter@maison.test", password: "waiter123", role: "WAITER" },
    { id: "U3", name: "Kai Kitchen", email: "kitchen@maison.test", password: "kitchen123", role: "KITCHEN" },
  ];

  return { tables, sessions: [], menuItems, orders: [], inventory, recipes, staff };
}

export function getStore(): RosStore {
  if (!g.__rosStore) {
    g.__rosStore = seed();
  }
  return g.__rosStore;
}
