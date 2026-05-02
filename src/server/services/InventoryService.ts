import { prisma } from '../db/prisma';

export class InventoryService {
  /**
   * Deducts raw materials from inventory based on the Recipe (BOM) of the items ordered.
   * Call this when an order status changes to 'paid' or 'served'.
   */
  static async deductInventoryForOrder(orderId: string) {
    // 1. Fetch the full order and its items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // 2. Loop through every item the customer ordered (e.g., 2 Margherita Pizzas)
    for (const item of order.orderItems) {
      
      // 3. Look up the exact recipe (BOM) for this menu item
      const recipeIngredients = await prisma.recipeIngredient.findMany({
        where: { menuItemId: item.menuItemId },
      });

      // 4. Deduct the raw materials from the main inventory
      for (const recipe of recipeIngredients) {
        // Calculation: Recipe requires 150g dough * 2 pizzas = 300g total deduction
        const totalAmountToDeduct = recipe.quantityRequired * item.quantity;

        await prisma.inventoryItem.update({
          where: { id: recipe.inventoryItemId },
          data: {
            currentStock: {
              decrement: totalAmountToDeduct, // Prisma's atomic decrement safely lowers the stock
            },
          },
        });
      }
    }

    return { success: true, message: 'Inventory strictly synced with Bill of Materials.' };
  }
}