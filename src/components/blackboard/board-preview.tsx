'use client';

import { cn } from '@/lib/utils';
import type { BlackboardLayout, BlackboardField } from '@/lib/blackboard/layout-schema';

/**
 * Live render of a 電子小黒板 template.
 *
 * Styling is driven entirely by the layout object, so what the customer sees here
 * is what gets burned into the photo at capture time — there is no second,
 * divergent renderer for the real thing.
 */
export function BoardPreview({
  layout,
  values,
  selectedFieldId,
  onSelectField,
}: {
  layout: BlackboardLayout;
  values: Record<string, string>;
  /** 編集用。表示だけの場面（取り込み確認など）では省略する。 */
  selectedFieldId?: string | null;
  onSelectField?: (id: string) => void;
}) {
  const rows = Math.max(1, ...layout.fields.map((f) => f.row + 1));

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        /*
         * 文字サイズは板の幅を基準にする（cqw）。ビューポート基準にすると、
         * 画面は広いのに板を置く欄が狭い場面で原寸のまま描かれ、
         * 項目名が重なって読めなくなる。
         */
        containerType: 'inline-size',
        backgroundColor: layout.backgroundColor,
        border: `${layout.borderWidth}px solid ${layout.borderColor}`,
        borderRadius: layout.cornerRadius,
        opacity: layout.opacity,
        aspectRatio: `${layout.width} / ${layout.height}`,
      }}
    >
      {/* Faint chalk grid, matching the 方眼 in the design. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            `linear-gradient(${layout.gridLineColor}14 1px, transparent 1px),` +
            `linear-gradient(90deg, ${layout.gridLineColor}14 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div
        className="relative grid h-full"
        style={{
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
          padding: layout.padding,
        }}
      >
        {layout.fields.map((field) => (
          <BoardCell
            key={field.id}
            field={field}
            value={values[field.key] ?? field.defaultValue}
            selected={selectedFieldId === field.id}
            boardWidth={layout.width}
            gridLineColor={layout.gridLineColor}
            gridLineWidth={layout.gridLineWidth}
            onSelect={onSelectField ? () => onSelectField(field.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function BoardCell({
  field,
  value,
  selected,
  boardWidth,
  gridLineColor,
  gridLineWidth,
  onSelect,
}: {
  field: BlackboardField;
  value: string;
  selected: boolean;
  /** 板の設計上の幅(px)。寸法をこの幅の割合に直すために使う。 */
  boardWidth: number;
  gridLineColor: string;
  gridLineWidth: number;
  /** 省略すると選択できないセルになる（表示だけの場面で使う）。 */
  onSelect?: () => void;
}) {
  /** 設計上の px を、板の幅に対する割合へ。板を縮めても比率が崩れない。 */
  const u = (px: number) => `${(px / boardWidth) * 100}cqw`;

  const alignItems =
    field.valueStyle.verticalAlign === 'top'
      ? 'flex-start'
      : field.valueStyle.verticalAlign === 'bottom'
        ? 'flex-end'
        : 'center';

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      aria-pressed={onSelect ? selected : undefined}
      className={cn(
        'group relative flex min-w-0 items-center text-left transition-shadow',
        selected && 'ring-2 ring-white/70 ring-inset',
        !onSelect && 'cursor-default',
      )}
      style={{
        gridRow: `${field.row + 1} / span ${field.rowSpan}`,
        gridColumn: `${field.col + 1} / span ${field.colSpan}`,
        backgroundColor: field.cellBackgroundColor ?? 'transparent',
        borderBottom: `${gridLineWidth}px solid ${gridLineColor}`,
        alignItems,
        gap: u(16),
        paddingInline: u(16),
      }}
    >
      {field.showLabel && field.labelRatio > 0 && (
        <span
          className="shrink-0"
          style={{
            flexBasis: `${field.labelRatio * 100}%`,
            fontSize: u(field.labelStyle.fontSize),
            fontWeight: field.labelStyle.fontWeight,
            fontStyle: field.labelStyle.fontStyle,
            color: field.labelStyle.color,
            backgroundColor: field.labelStyle.backgroundColor ?? 'transparent',
            textAlign: field.labelStyle.textAlign,
            letterSpacing: `${field.labelStyle.letterSpacing}em`,
            lineHeight: field.labelStyle.lineHeight,
            textDecoration: field.labelStyle.underline ? 'underline' : undefined,
          }}
        >
          {field.label}
        </span>
      )}

      <span
        className={cn('min-w-0 flex-1', field.multiline ? 'whitespace-pre-wrap' : 'truncate')}
        style={{
          fontSize: u(field.valueStyle.fontSize),
          fontWeight: field.valueStyle.fontWeight,
          fontStyle: field.valueStyle.fontStyle,
          color: field.valueStyle.color,
          backgroundColor: field.valueStyle.backgroundColor ?? 'transparent',
          textAlign: field.valueStyle.textAlign,
          textIndent: `${field.valueStyle.indent}em`,
          letterSpacing: `${field.valueStyle.letterSpacing}em`,
          lineHeight: field.valueStyle.lineHeight,
          textDecoration: field.valueStyle.underline ? 'underline' : undefined,
          WebkitTextStroke:
            field.valueStyle.strokeWidth > 0
              ? `${field.valueStyle.strokeWidth}px ${field.valueStyle.strokeColor}`
              : undefined,
        }}
      >
        {value || field.placeholder}
      </span>
    </button>
  );
}
