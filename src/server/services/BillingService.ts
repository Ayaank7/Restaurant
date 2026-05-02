import { prisma } from "../db/prisma";

export class BillingService {
  /**
   * Calculates the Subtotal, Taxes, Discounts, and Grand Total for an order.
   * Call this whenever an item is added to an order, or a discount code is applied.
   */
  static async calculateBill(orderId: string, discountCode?: string) {
    // 1. Fetch the order and all its items with their menu prices & taxes
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { menuItem: true } },
      },
    });

    if (!order) throw new Error("Order not found");

    let subTotal = 0;
    let taxAmount = 0;

    // 2. ITEM-LEVEL CALCULATION (Subtotal & Taxes)
    for (const item of order.orderItems) {
      const itemTotal = item.quantity * item.menuItem.price;
      subTotal += itemTotal;

      // Calculate tax for this specific item (e.g., 5% GST)
      const itemTax = itemTotal * (item.menuItem.taxRate / 100);
      taxAmount += itemTax;
    }

    // 3. DISCOUNT ENGINE
    let discountAmount = 0;
    let appliedDiscountId = order.discountId; // Keep existing discount if any

    // If a new discount code was provided by the waiter/admin
    if (discountCode) {
      const discount = await prisma.discount.findUnique({
        where: { code: discountCode },
      });

      if (discount && discount.isActive) {
        appliedDiscountId = discount.id;
        if (discount.type === "PERCENTAGE") {
          discountAmount = subTotal * (discount.value / 100);
        } else if (discount.type === "FLAT") {
          discountAmount = discount.value;
        }
      } else {
        throw new Error("Invalid or expired discount code");
      }
    }
    // Re-calculate existing discount if order was updated
    else if (order.discountId) {
      const existingDiscount = await prisma.discount.findUnique({
        where: { id: order.discountId },
      });
      if (existingDiscount) {
        if (existingDiscount.type === "PERCENTAGE") {
          discountAmount = subTotal * (existingDiscount.value / 100);
        } else if (existingDiscount.type === "FLAT") {
          discountAmount = existingDiscount.value;
        }
      }
    }

    // Ensure discount doesn't exceed subtotal
    if (discountAmount > subTotal) discountAmount = subTotal;

    // 4. FINAL GRAND TOTAL CALCULATION
    const grandTotal = subTotal - discountAmount + taxAmount;

    // 5. UPDATE THE ORDER IN THE DATABASE
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        subTotal,
        taxAmount,
        discountAmount,
        totalAmount: grandTotal,
        discountId: appliedDiscountId,
      },
    });

    return {
      subTotal,
      taxAmount,
      discountAmount,
      grandTotal,
      order: updatedOrder,
    };
  }
}
