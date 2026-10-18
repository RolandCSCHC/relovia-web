import type {
  AcquisitionStatus,
  Furnishing,
  ItemCategory,
  ItemPriority,
  ItemRoom,
  MovingAction,
  PackingStatus,
} from '../api/generated/types.gen';
import type { LabeledValue } from '../relocations/labels';

export const furnishings: readonly LabeledValue<Furnishing>[] = [
  { value: 'Furnished', label: 'Furnished' },
  { value: 'Unfurnished', label: 'Unfurnished' },
];

export const acquisitions: readonly LabeledValue<AcquisitionStatus>[] = [
  { value: 'Owned', label: 'Owned' },
  { value: 'ToPurchase', label: 'To purchase' },
];

export const movingActions: readonly LabeledValue<MovingAction>[] = [
  { value: 'Bring', label: 'Bring' },
  { value: 'Sell', label: 'Sell' },
  { value: 'Donate', label: 'Donate' },
  { value: 'Store', label: 'Store' },
  { value: 'Discard', label: 'Discard' },
];

export const packingStatuses: readonly LabeledValue<PackingStatus>[] = [
  { value: 'NotPacked', label: 'Not packed' },
  { value: 'Packed', label: 'Packed' },
  { value: 'Unpacked', label: 'Unpacked' },
];

export const itemCategories: readonly LabeledValue<ItemCategory>[] = [
  { value: 'Furniture', label: 'Furniture' },
  { value: 'Appliances', label: 'Appliances' },
  { value: 'Linens', label: 'Linens' },
  { value: 'Cookware', label: 'Cookware' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Decor', label: 'Decor' },
  { value: 'Other', label: 'Other' },
];

export const itemRooms: readonly LabeledValue<ItemRoom>[] = [
  { value: 'Kitchen', label: 'Kitchen' },
  { value: 'Bathroom', label: 'Bathroom' },
  { value: 'Bedroom', label: 'Bedroom' },
  { value: 'LivingRoom', label: 'Living room' },
  { value: 'DiningRoom', label: 'Dining room' },
  { value: 'Office', label: 'Office' },
  { value: 'Other', label: 'Other' },
];

export const itemPriorities: readonly LabeledValue<ItemPriority>[] = [
  { value: 'Low', label: 'Low' },
  { value: 'Normal', label: 'Normal' },
  { value: 'High', label: 'High' },
];

export const itemFilters = [
  { value: 'All', label: 'All items' },
  { value: 'ToPurchase', label: 'To purchase' },
  { value: 'Bring', label: 'Bring' },
  { value: 'Sell', label: 'Sell' },
  { value: 'Donate', label: 'Donate' },
  { value: 'Store', label: 'Store' },
  { value: 'Discard', label: 'Discard' },
  { value: 'Undecided', label: 'Not decided' },
] as const;

export type ItemFilter = (typeof itemFilters)[number]['value'];
