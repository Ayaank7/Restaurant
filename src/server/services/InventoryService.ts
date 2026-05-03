import { getStore } from '../store';
import { publish } from '../events';

export class InventoryService {
  /**
   * Deducts raw materials from inventory based on the Recipe (BOM) of the items ordered.
   * Call this when an order status changes to 'paid' or 'served'.
   */
  static async deductInventoryForOrder(orderId: string) {
    const store = getStore();
    const order = store.orders.find((candidate) => candidate.id === orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.inventoryDeductedAt) {
      return { success: true, message: 'Inventory already synced for this order.' };
    }

    let inventoryChanged = false;

    for (const item of order.items) {
      const recipes = store.recipes.filter((recipe) => recipe.menuItemId === item.menuItemId);

      for (const recipe of recipes) {
        const inventoryItem = store.inventory.find((candidate) => candidate.ingredient === recipe.ingredient);
        if (!inventoryItem) {
          continue;
        }

        const totalAmountToDeduct = recipe.quantityRequired * item.quantity;
        inventoryItem.stock = Math.max(0, inventoryItem.stock - totalAmountToDeduct);
        inventoryChanged = true;
      }
    }

    if (inventoryChanged) {
      publish({ type: 'INVENTORY_UPDATED', inventory: [...store.inventory] });
    }

    store.orders = store.orders.map((candidate) =>
      candidate.id === orderId
        ? { ...candidate, inventoryDeductedAt: Date.now(), updatedAt: Date.now() }
        : candidate,
    );
    publish({ type: 'ORDER_UPDATED', order: store.orders.find((candidate) => candidate.id === orderId)! });

    return { success: true, message: 'Inventory strictly synced with Bill of Materials.' };
  }
}