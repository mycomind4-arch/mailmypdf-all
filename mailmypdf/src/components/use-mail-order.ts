import { useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createOrder, getMailCheckoutQuote } from "@/lib/orders.functions";
import type { CreateOrderParams, CreateOrderResult } from "@/services/mail.service";

/** Reuse an unchanged unpaid draft and require fresh approval if its quoted price changes. */
export function useMailOrder(
  basis: string,
  priceCents: number,
  onPriceChanged: (cents: number) => void,
) {
  const create = useServerFn(createOrder);
  const quote = useServerFn(getMailCheckoutQuote);
  const prepared = useRef<{ basis: string; order: CreateOrderResult } | null>(null);
  return async (data: CreateOrderParams) => {
    if (prepared.current?.basis !== basis)
      prepared.current = { basis, order: await create({ data }) };
    const order = prepared.current.order;
    const current = await quote({ data: { orderId: order.orderId, token: order.token } });
    if (current.totalCents !== priceCents) {
      onPriceChanged(current.totalCents);
      return null;
    }
    return order;
  };
}
