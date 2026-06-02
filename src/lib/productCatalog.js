export const productCatalog = [
  { name: 'Rent', category: 'Housing', tags: ['home', 'fixed', 'monthly'] },
  { name: 'Bond', category: 'Housing', tags: ['home', 'loan', 'monthly'] },
  { name: 'Groceries', category: 'Food', tags: ['food', 'essentials', 'weekly'] },
  { name: 'Takeaways', category: 'Food', tags: ['food', 'convenience'] },
  { name: 'Fuel', category: 'Transport', tags: ['car', 'commute'] },
  { name: 'Public transport', category: 'Transport', tags: ['commute', 'travel'] },
  { name: 'Internet', category: 'Utilities', tags: ['home', 'fixed', 'monthly'] },
  { name: 'Electricity', category: 'Utilities', tags: ['home', 'prepaid'] },
  { name: 'Water', category: 'Utilities', tags: ['home', 'municipal'] },
  { name: 'Insurance', category: 'Financial', tags: ['fixed', 'monthly', 'policy'] },
  { name: 'Medical aid', category: 'Health', tags: ['health', 'fixed', 'monthly'] },
  { name: 'Gym', category: 'Health', tags: ['fitness', 'monthly'] },
  { name: 'School fees', category: 'Education', tags: ['education', 'monthly'] },
  { name: 'Subscriptions', category: 'Lifestyle', tags: ['streaming', 'monthly'] },
  { name: 'Coffee', category: 'Lifestyle', tags: ['food', 'small-spend'] },
  { name: 'Clothing', category: 'Shopping', tags: ['retail', 'seasonal'] },
  { name: 'Savings', category: 'Savings', tags: ['future', 'goal', 'monthly'] },
  { name: 'Emergency fund', category: 'Savings', tags: ['future', 'safety'] },
];

export function findProduct(name) {
  return productCatalog.find((product) => product.name.toLowerCase() === name.toLowerCase());
}
