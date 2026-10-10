export type ProductCategory = 'Fashion' | 'Watches' | 'Beauty' | 'Home' | 'Accessories' | 'Electronics' | 'Other';

export const categories: { label: ProductCategory; icon: string; color: string }[] = [
  { label: 'Fashion', icon: '👕', color: '#F4ECFF' },
  { label: 'Watches', icon: '⌚', color: '#E8F0FF' },
  { label: 'Beauty', icon: '✦', color: '#FFECEF' },
  { label: 'Home', icon: '⌂', color: '#E8FBF1' },
  { label: 'Accessories', icon: '◈', color: '#FFF4E3' },
  { label: 'Electronics', icon: '▣', color: '#EBF3FF' },
  { label: 'Other', icon: '•••', color: '#F1F1F1' },
];
