import { OrderStatus } from '../types';

export const ORDER_STAGES = [
  { status: 'requested', label: 'Submitted' },
  { status: 'received', label: 'Marked as received' },
  { status: 'slicing', label: 'In progress (slicer)' },
  { status: 'printing', label: 'In printer / printing' },
  { status: 'ready', label: 'Ready for pickup' },
  { status: 'completed', label: 'Complete' },
] as const;

export function orderStageIndex(status: OrderStatus): number {
  const normalized: OrderStatus =
    status === 'underReview' || status === 'accepted' ? 'received' :
    status === 'inProduction' ? 'printing' : status;
  return ORDER_STAGES.findIndex(stage => stage.status === normalized);
}

export function orderStatusLabel(status: OrderStatus): string {
  const index = orderStageIndex(status);
  return index >= 0 ? ORDER_STAGES[index].label : status === 'declined' ? 'Declined (legacy)' : status;
}

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = orderStageIndex(status);
  return index >= 0 && index < ORDER_STAGES.length - 1 ? ORDER_STAGES[index + 1].status : null;
}

export function previousOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = orderStageIndex(status);
  return index > 0 ? ORDER_STAGES[index - 1].status : null;
}

export function isAdjacentOrderStage(from: OrderStatus, to: OrderStatus): boolean {
  const a = orderStageIndex(from);
  const b = orderStageIndex(to);
  return a >= 0 && b >= 0 && Math.abs(a - b) === 1;
}
