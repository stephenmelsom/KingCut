import { useMemo, useState } from 'react';
import {
  countFurnitureParts,
  isFurnitureDesignValid,
} from '../furniture/generate';
import type { FurnitureDesign } from '../furniture/types';
import { useStore } from '../state/store';
import { CollapsibleCard } from './CollapsibleCard';
import { EditableNumber } from './EditableNumber';
import { FurniturePreviewModal } from './FurniturePreviewModal';

type NumberField = {
  key: keyof FurnitureDesign;
  label: string;
  step: number;
  min: number;
};

const DIMENSION_FIELDS: NumberField[] = [
  { key: 'width', label: 'Width', step: 0.125, min: 0 },
  { key: 'height', label: 'Height', step: 0.125, min: 0 },
  { key: 'depth', label: 'Depth', step: 0.125, min: 0 },
  { key: 'materialThickness', label: 'Material thickness', step: 0.0625, min: 0 },
];

const SHELF_FIELDS: NumberField[] = [
  { key: 'shelfCount', label: 'Shelves', step: 1, min: 0 },
  { key: 'backThickness', label: 'Back thickness', step: 0.0625, min: 0 },
];

const DRAWER_FIELDS: NumberField[] = [
  { key: 'drawerCount', label: 'Drawers', step: 1, min: 0 },
  { key: 'drawerBoxThickness', label: 'Box thickness', step: 0.0625, min: 0 },
  { key: 'drawerBottomThickness', label: 'Bottom thickness', step: 0.0625, min: 0 },
  { key: 'drawerSideClearance', label: 'Side clearance', step: 0.0625, min: 0 },
  { key: 'drawerFrontGap', label: 'Front gap', step: 0.0625, min: 0 },
];

export function FurnitureDesignerPanel() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const design = useStore((s) => s.furnitureDesign);
  const updateFurnitureDesign = useStore((s) => s.updateFurnitureDesign);
  const appendFurnitureParts = useStore((s) => s.appendFurnitureParts);
  const valid = isFurnitureDesignValid(design);
  const partCount = useMemo(() => {
    if (!valid) return 0;
    return countFurnitureParts(design);
  }, [design, valid]);

  const updateNumber = (key: keyof FurnitureDesign, value: number) => {
    const wholeNumberKeys: (keyof FurnitureDesign)[] = [
      'shelfCount',
      'drawerCount',
    ];
    updateFurnitureDesign({
      [key]: wholeNumberKeys.includes(key) ? Math.max(0, Math.floor(value)) : value,
    });
  };

  return (
    <CollapsibleCard title="Furniture Designer">
      <div className="furniture-designer">
        <div className="furniture-grid">
          {DIMENSION_FIELDS.map((field) => (
            <FurnitureNumberField
              key={field.key}
              field={field}
              design={design}
              onChange={updateNumber}
            />
          ))}
        </div>

        <div className="furniture-grid">
          {SHELF_FIELDS.map((field) => (
            <FurnitureNumberField
              key={field.key}
              field={field}
              design={design}
              onChange={updateNumber}
            />
          ))}
          <label className="option-row furniture-switch">
            <span>Include back</span>
            <input
              type="checkbox"
              role="switch"
              checked={design.includeBack}
              onChange={(event) =>
                updateFurnitureDesign({ includeBack: event.target.checked })
              }
            />
          </label>
        </div>

        <div className="furniture-grid">
          {DRAWER_FIELDS.map((field) => (
            <FurnitureNumberField
              key={field.key}
              field={field}
              design={design}
              onChange={updateNumber}
            />
          ))}
        </div>

        <div className="furniture-actions">
          <span className={valid ? 'muted' : 'warn-text'}>
            {valid ? `${partCount} generated parts` : 'Invalid dimensions'}
          </span>
          <div className="button-row">
            <button
              className="btn-sm"
              disabled={!valid}
              onClick={() => setPreviewOpen(true)}
            >
              Preview
            </button>
            <button
              className="btn-sm"
              disabled={!valid}
              onClick={appendFurnitureParts}
            >
              Add to panels
            </button>
          </div>
        </div>
      </div>
      {previewOpen && valid && (
        <FurniturePreviewModal
          design={design}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </CollapsibleCard>
  );
}

function FurnitureNumberField({
  field,
  design,
  onChange,
}: {
  field: NumberField;
  design: FurnitureDesign;
  onChange: (key: keyof FurnitureDesign, value: number) => void;
}) {
  const value = design[field.key];
  if (typeof value !== 'number') return null;

  return (
    <label className="field-row">
      <span>{field.label}</span>
      <EditableNumber
        value={value}
        step={field.step}
        min={field.min}
        ariaLabel={field.label}
        onChange={(next) => onChange(field.key, next)}
      />
    </label>
  );
}
