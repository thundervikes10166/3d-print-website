import { CustomRequest, RequestStatus } from '../types';

export const CAD_STAGES = [
  { status: 'submitted', label: 'Submitted', detail: 'Request sent' },
  { status: 'received', label: 'Marked as received', detail: 'Team acknowledged' },
  { status: 'slicing', label: 'In progress (slicer)', detail: 'Preparing print file' },
  { status: 'printing', label: 'In printer / printing', detail: 'On the printer' },
  { status: 'ready', label: 'Ready for pick up', detail: 'Waiting for pickup' },
  { status: 'completed', label: 'Complete', detail: 'Picked up / closed' },
] as const;

type PipelineStatus = typeof CAD_STAGES[number]['status'];

// Historical requests retain their stored status and audit history.
export function pipelineStatus(status: RequestStatus): PipelineStatus | null {
  if (status === 'underReview' || status === 'accepted') return 'received';
  if (status === 'inProduction') return 'printing';
  if (status === 'declined') return null;
  return CAD_STAGES.some((stage) => stage.status === status) ? status as PipelineStatus : null;
}

export function requestStageIndex(status: RequestStatus): number {
  const normalized = pipelineStatus(status);
  return normalized ? CAD_STAGES.findIndex((stage) => stage.status === normalized) : -1;
}

export function requestStatusLabel(status: RequestStatus): string {
  const stage = pipelineStatus(status);
  if (stage) return CAD_STAGES.find((item) => item.status === stage)?.label || status;
  return status === 'declined' ? 'Declined (legacy)' : status;
}

export function nextRequestStatus(status: RequestStatus): RequestStatus | null {
  const index = requestStageIndex(status);
  return index >= 0 && index < CAD_STAGES.length - 1 ? CAD_STAGES[index + 1].status : null;
}

export function previousRequestStatus(status: RequestStatus): RequestStatus | null {
  const index = requestStageIndex(status);
  return index > 0 ? CAD_STAGES[index - 1].status : null;
}

export function isAdjacentRequestStage(from: RequestStatus, to: RequestStatus): boolean {
  const index = requestStageIndex(from);
  const dest = requestStageIndex(to);
  return index >= 0 && dest >= 0 && Math.abs(dest - index) === 1;
}

export function displayRequestDateTime(value: unknown): string {
  if (!value) return 'Unknown date';
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? value : new Date(parsed).toLocaleString();
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return (value.toDate() as Date).toLocaleString();
  }
  return String(value);
}

export function displayRequestedDimensions(request: CustomRequest): string {
  if (request.desiredDimensions) return request.desiredDimensions;
  switch (request.desiredSize) {
    case 'Small': return 'Approximately 3 in × 3 in';
    case 'Medium': return 'Approximately 6 in × 6 in';
    case 'Large': return 'Approximately 10 in × 10 in';
    case 'X-Large': return '12 in and up';
    default: return 'Not provided';
  }
}
