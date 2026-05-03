import { getStore } from "../store";

type DiscountDefinition = {
  code: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  isActive: boolean;
};

const DISCOUNTS: DiscountDefinition[] = [
  { code: "STAFF50", type: "PERCENTAGE", value: 50, isActive: true },
  { code: "FESTIVAL200", type: "FLAT", value: 200, isActive: true },
];

function findDiscount(code: string) {
  return DISCOUNTS.find((discount) => discount.code.toLowerCase() === code.toLowerCase());
}

export class BillingService {
  /**
   * Calculates the Subtotal, Taxes, Discounts, and Grand Total for an order.
   * Call this whenever an item is added to an order, or a discount code is applied.
   */
  static async calculateBill(orderId: string, discountCode?: string) {
    const store = getStore();
    const order = store.orders.find((candidate) => candidate.id === orderId);

    if (!order) throw new Error("Order not found");

    let subTotal = 0;
    let taxAmount = 0;

    for (const item of order.items) {
      const itemTotal = item.quantity * item.price;
      subTotal += itemTotal;

      const itemTax = itemTotal * 0.08;
      taxAmount += itemTax;
    }

    let discountAmount = 0;
    let appliedDiscountCode = order.discountCode ?? null;

    if (discountCode) {
      const discount = findDiscount(discountCode);

      if (discount && discount.isActive) {
        appliedDiscountCode = discount.code;
        if (discount.type === "PERCENTAGE") {
          discountAmount = subTotal * (discount.value / 100);
        } else if (discount.type === "FLAT") {
          discountAmount = discount.value;
        }
      } else {
        throw new Error("Invalid or expired discount code");
      }
    }
    else if (order.discountCode) {
      const existingDiscount = findDiscount(order.discountCode);
      if (existingDiscount) {
        if (existingDiscount.type === "PERCENTAGE") {
          discountAmount = subTotal * (existingDiscount.value / 100);
        } else if (existingDiscount.type === "FLAT") {
          discountAmount = existingDiscount.value;
        }
      }
    }

    if (discountAmount > subTotal) discountAmount = subTotal;

    const grandTotal = subTotal - discountAmount + taxAmount;

    const updatedOrder = {
      ...order,
      subTotal,
      taxAmount,
      discountAmount,
      totalAmount: grandTotal,
      discountCode: appliedDiscountCode,
      updatedAt: Date.now(),
    };

    store.orders = store.orders.map((candidate) =>
      candidate.id === orderId ? updatedOrder : candidate,
    );

    return {
      subTotal,
      taxAmount,
      discountAmount,
      grandTotal,
      order: updatedOrder,
    };
  }
}
