// Shared medicine categories list - used across all components
// This ensures consistency in category dropdowns throughout the application

export const MEDICINE_CATEGORIES = [
  {
    id: 'tablet',
    name: 'Tablet',
    unit: 'Tablets',
    packagingFields: [
      { key: 'tablets_per_strip', label: 'Tablets per Strip', placeholder: 'e.g., 10, 15', alwaysShow: true },
      { key: 'strips_per_box', label: 'Strips per Box', placeholder: 'e.g., 10, 20', showOnlyForBox: true }
    ]
  },
  {
    id: 'capsule',
    name: 'Capsule',
    unit: 'Capsules',
    packagingFields: [
      { key: 'capsules_per_strip', label: 'Capsules per Strip', placeholder: 'e.g., 10, 15', alwaysShow: true },
      { key: 'strips_per_box', label: 'Strips per Box', placeholder: 'e.g., 10, 20', showOnlyForBox: true }
    ]
  },
  {
    id: 'syrup',
    name: 'Syrup/Suspension',
    unit: 'ML',
    packagingFields: [
      { key: 'ml_per_bottle', label: 'ML per Bottle', placeholder: 'e.g., 100, 200', alwaysShow: true },
      { key: 'bottles_per_box', label: 'Bottles per Box', placeholder: 'e.g., 12, 24', showOnlyForBox: true }
    ]
  },
  {
    id: 'injection',
    name: 'Injection/Vial',
    unit: 'Vials',
    packagingFields: [
      { key: 'ml_per_vial', label: 'ML per Vial', placeholder: 'e.g., 2, 5, 10', alwaysShow: true },
      { key: 'vials_per_box', label: 'Vials per Box', placeholder: 'e.g., 10, 20, 50', showOnlyForBox: true }
    ]
  },
  {
    id: 'ointment',
    name: 'Ointment/Cream',
    unit: 'Grams',
    packagingFields: [
      { key: 'grams_per_tube', label: 'Grams per Tube', placeholder: 'e.g., 15, 30, 50', alwaysShow: true },
      { key: 'tubes_per_box', label: 'Tubes per Box', placeholder: 'e.g., 10, 20', showOnlyForBox: true }
    ]
  },
  {
    id: 'drops',
    name: 'Drops (Eye/Ear/Nasal)',
    unit: 'ML',
    packagingFields: [
      { key: 'ml_per_bottle', label: 'ML per Bottle', placeholder: 'e.g., 5, 10, 15', alwaysShow: true },
      { key: 'bottles_per_box', label: 'Bottles per Box', placeholder: 'e.g., 1, 6, 12', showOnlyForBox: true }
    ]
  },
  {
    id: 'inhaler',
    name: 'Inhaler',
    unit: 'Units',
    packagingFields: [
      { key: 'doses_per_inhaler', label: 'Doses per Inhaler', placeholder: 'e.g., 100, 200', alwaysShow: true },
      { key: 'inhalers_per_box', label: 'Inhalers per Box', placeholder: 'e.g., 1, 2', showOnlyForBox: true }
    ]
  },
  {
    id: 'powder',
    name: 'Powder/Sachet',
    unit: 'Sachets',
    packagingFields: [
      { key: 'grams_per_sachet', label: 'Grams per Sachet', placeholder: 'e.g., 5, 10, 15', alwaysShow: true },
      { key: 'sachets_per_box', label: 'Sachets per Box', placeholder: 'e.g., 10, 20, 30', showOnlyForBox: true }
    ]
  },
  {
    id: 'gel',
    name: 'Gel',
    unit: 'Grams',
    packagingFields: [
      { key: 'grams_per_tube', label: 'Grams per Tube', placeholder: 'e.g., 20, 30, 50', alwaysShow: true },
      { key: 'tubes_per_box', label: 'Tubes per Box', placeholder: 'e.g., 1, 10', showOnlyForBox: true }
    ]
  },
  {
    id: 'spray',
    name: 'Spray',
    unit: 'ML',
    packagingFields: [
      { key: 'ml_per_bottle', label: 'ML per Bottle', placeholder: 'e.g., 50, 100', alwaysShow: true },
      { key: 'bottles_per_box', label: 'Bottles per Box', placeholder: 'e.g., 1, 6', showOnlyForBox: true }
    ]
  },
  {
    id: 'lotion',
    name: 'Lotion/Solution',
    unit: 'ML',
    packagingFields: [
      { key: 'ml_per_bottle', label: 'ML per Bottle', placeholder: 'e.g., 100, 200, 500', alwaysShow: true },
      { key: 'bottles_per_box', label: 'Bottles per Box', placeholder: 'e.g., 1, 12', showOnlyForBox: true }
    ]
  },
  {
    id: 'shampoo',
    name: 'Shampoo',
    unit: 'ML',
    packagingFields: [
      { key: 'ml_per_bottle', label: 'ML per Bottle', placeholder: 'e.g., 100, 200, 500', alwaysShow: true },
      { key: 'bottles_per_box', label: 'Bottles per Box', placeholder: 'e.g., 1, 12', showOnlyForBox: true }
    ]
  },
  {
    id: 'soap',
    name: 'Soap/Bar',
    unit: 'Grams',
    packagingFields: [
      { key: 'grams_per_bar', label: 'Grams per Bar', placeholder: 'e.g., 75, 100, 125', alwaysShow: true },
      { key: 'bars_per_box', label: 'Bars per Box', placeholder: 'e.g., 1, 3, 6', showOnlyForBox: true }
    ]
  },
  {
    id: 'bandage',
    name: 'Bandage/Dressing',
    unit: 'Pieces',
    packagingFields: [
      { key: 'pieces_per_pack', label: 'Pieces per Pack', placeholder: 'e.g., 1, 5, 10', alwaysShow: true },
      { key: 'packs_per_box', label: 'Packs per Box', placeholder: 'e.g., 10, 20', showOnlyForBox: true }
    ]
  },
  {
    id: 'mask',
    name: 'Mask (Surgical/N95)',
    unit: 'Pieces',
    packagingFields: [
      { key: 'pieces_per_pack', label: 'Pieces per Pack', placeholder: 'e.g., 1, 5, 10', alwaysShow: true },
      { key: 'packs_per_box', label: 'Packs per Box', placeholder: 'e.g., 10, 20, 50', showOnlyForBox: true }
    ]
  },
  {
    id: 'gloves',
    name: 'Gloves',
    unit: 'Pairs',
    packagingFields: [
      { key: 'pairs_per_pack', label: 'Pairs per Pack', placeholder: 'e.g., 1, 50, 100', alwaysShow: true },
      { key: 'packs_per_box', label: 'Packs per Box', placeholder: 'e.g., 1, 10', showOnlyForBox: true }
    ]
  },
  {
    id: 'cotton',
    name: 'Cotton/Gauze',
    unit: 'Grams',
    packagingFields: [
      { key: 'grams_per_pack', label: 'Grams per Pack', placeholder: 'e.g., 100, 200, 500', alwaysShow: true },
      { key: 'packs_per_box', label: 'Packs per Box', placeholder: 'e.g., 10, 20', showOnlyForBox: true }
    ]
  },
  {
    id: 'sanitizer',
    name: 'Hand Sanitizer',
    unit: 'ML',
    packagingFields: [
      { key: 'ml_per_bottle', label: 'ML per Bottle', placeholder: 'e.g., 50, 100, 500', alwaysShow: true },
      { key: 'bottles_per_box', label: 'Bottles per Box', placeholder: 'e.g., 1, 12, 24', showOnlyForBox: true }
    ]
  },
  {
    id: 'thermometer',
    name: 'Thermometer',
    unit: 'Pieces',
    packagingFields: [
      { key: 'pieces_per_pack', label: 'Pieces per Pack', placeholder: 'e.g., 1', alwaysShow: true },
      { key: 'packs_per_box', label: 'Packs per Box', placeholder: 'e.g., 10, 20', showOnlyForBox: true }
    ]
  },
  {
    id: 'supplement',
    name: 'Supplement/Vitamin',
    unit: 'Units',
    packagingFields: [
      { key: 'tablets_per_strip', label: 'Tablets per Strip', placeholder: 'e.g., 10, 15, 30', alwaysShow: true },
      { key: 'strips_per_box', label: 'Strips per Box', placeholder: 'e.g., 1, 3, 10', showOnlyForBox: true }
    ]
  },
  {
    id: 'other',
    name: 'Other/Miscellaneous',
    unit: 'Units',
    packagingFields: [
      { key: 'units_per_pack', label: 'Units per Pack', placeholder: 'e.g., 1, 10', alwaysShow: true },
      { key: 'packs_per_box', label: 'Packs per Box', placeholder: 'e.g., 1, 10', showOnlyForBox: true }
    ]
  }
];

// Simplified version for dropdowns that only need id and name
export const MEDICINE_CATEGORIES_SIMPLE = MEDICINE_CATEGORIES.map(cat => ({
  id: cat.id,
  name: cat.name
}));

