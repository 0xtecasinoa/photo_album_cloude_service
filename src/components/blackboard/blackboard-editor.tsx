'use client';

import { useMemo, useState } from 'react';
import { Save, Filter, Grid3x3, Plus } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { BoardPreview } from './board-preview';
import { cn } from '@/lib/utils';
import {
  blackboardFieldSchema,
  createDefaultLayout,
  DEFAULT_LABEL_STYLE,
  DEFAULT_VALUE_STYLE,
  FIELD_SOURCE_LABELS_JA,
  fieldSourceSchema,
  type BlackboardLayout,
} from '@/lib/blackboard/layout-schema';

/** Board background presets, named the way a site foreman would name them. */
const BACKGROUNDS = [
  { value: '#132A22', label: '濃緑（伝統工事黒板）' },
  { value: '#1B5E20', label: '緑（標準）' },
  { value: '#1A1A1A', label: '黒（コントラスト重視）' },
  { value: '#0B3B6F', label: '紺（土木向け）' },
  { value: '#FFFFFF', label: '白（ホワイトボード）' },
];

const RULE_WIDTHS = [
  { value: 1, label: '細線（1PX）' },
  { value: 2, label: '標準（2PX）' },
  { value: 4, label: '太線（4PX）' },
  { value: 0, label: '罫線なし' },
];

const FONT_FAMILIES = [
  { value: 'Zen Kaku Gothic New', label: 'ゴシック体（高視認性）' },
  { value: 'Noto Serif JP', label: '明朝体（文書向け）' },
  { value: 'Yu Gothic', label: '游ゴシック（標準）' },
];

const SIZE_STEPS = [
  { value: 18, label: '小（補足）' },
  { value: 26, label: '中（標準）' },
  { value: 34, label: '大（強調）' },
  { value: 44, label: '特大（遠距離視認）' },
];

const SAMPLE_VALUES: Record<string, string> = {
  projectName: '国道357号線 舗装改修工事',
  workType: '路盤工（下層路盤）',
  surveyPoint: 'NO. 12 + 5.0M L側',
  contractor: '大和建設工業（株）',
  date: '2026/07/28',
};

/** Starting template matching the design's 標準工事小黒板. */
function createStandardLayout(): BlackboardLayout {
  const base = createDefaultLayout();
  const mk = (key: string, label: string, source: string, row: number) =>
    blackboardFieldSchema.parse({
      id: key,
      key,
      label,
      source: fieldSourceSchema.parse(source),
      row,
      col: 0,
      colSpan: 1,
      labelRatio: 0.26,
      labelStyle: { ...DEFAULT_LABEL_STYLE, color: '#8EFF9F', fontSize: 26, textAlign: 'left' },
      valueStyle: { ...DEFAULT_VALUE_STYLE, color: '#FFFFFF', fontSize: 30 },
    });

  return {
    ...base,
    columns: 1,
    width: 1400,
    height: 780,
    backgroundColor: '#132A22',
    borderColor: '#F0AE1E',
    borderWidth: 6,
    gridLineColor: '#FFFFFF',
    gridLineWidth: 1,
    padding: 40,
    fields: [
      mk('projectName', '工事名', 'project.name', 0),
      mk('workType', '工種', 'photo.workType', 1),
      mk('surveyPoint', '測点', 'photo.shootingLocation', 2),
      mk('contractor', '施工者', 'project.contractorName', 3),
      mk('date', '日付', 'auto.date', 4),
    ],
  };
}

export function BlackboardEditor() {
  const [layout, setLayout] = useState<BlackboardLayout>(createStandardLayout);
  const [templateName, setTemplateName] = useState('標準工事小黒板（5項目）');
  const [selectedId, setSelectedId] = useState<string | null>('projectName');
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0]!.value);

  const selected = useMemo(
    () => layout.fields.find((f) => f.id === selectedId) ?? null,
    [layout.fields, selectedId],
  );

  const patchSelected = (patch: Partial<(typeof layout.fields)[number]>) => {
    if (!selectedId) return;
    setLayout((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === selectedId ? { ...f, ...patch } : f)),
    }));
  };

  const patchValueStyle = (patch: Partial<(typeof layout.fields)[number]['valueStyle']>) => {
    if (!selected) return;
    patchSelected({ valueStyle: { ...selected.valueStyle, ...patch } });
  };

  const addField = () => {
    const nextRow = Math.max(0, ...layout.fields.map((f) => f.row + 1));
    const id = `field-${Date.now()}`;
    const field = blackboardFieldSchema.parse({
      id,
      key: id,
      label: '新しい項目',
      source: 'manual',
      row: nextRow,
      col: 0,
      colSpan: 1,
      labelRatio: 0.26,
      labelStyle: { ...DEFAULT_LABEL_STYLE, color: '#8EFF9F', fontSize: 26, textAlign: 'left' },
      valueStyle: { ...DEFAULT_VALUE_STYLE, color: '#FFFFFF', fontSize: 30 },
    });
    setLayout((prev) => ({ ...prev, fields: [...prev.fields, field] }));
    setSelectedId(id);
  };

  return (
    <>
      <PageHeader
        title="電子小黒板 自由作成・テンプレート設計"
        actions={
          <Button variant="primary" size="lg">
            <Save className="size-4" aria-hidden />
            案件メンバー全員へ配布保存
          </Button>
        }
      />

      <div className="px-8 pt-10 xl:px-[31px]">
        <div className="mx-auto max-w-[1050px]">
          <div style={{ fontFamily }}>
            <BoardPreview
              layout={layout}
              values={SAMPLE_VALUES}
              selectedFieldId={selectedId}
              onSelectField={setSelectedId}
            />
          </div>
          <p className="text-ink-muted mt-3 text-xs">
            黒板のセルをクリックすると、下の「選択中セルの個別設定」で編集できます。
          </p>

          {/* ---- Board-wide settings ---- */}
          <section className="mt-12">
            <h2 className="text-brand flex items-center gap-2.5 text-[17px] font-bold">
              <Filter className="size-5" strokeWidth={1.8} aria-hidden />
              看板全体設定（名称・背景・罫線・書体）
            </h2>

            <div className="mt-6 grid gap-x-9 gap-y-6 md:grid-cols-2">
              <div>
                <Label htmlFor="tpl-name">看板テンプレ名</Label>
                <Input
                  id="tpl-name"
                  className="mt-2"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="tpl-bg">背景色</Label>
                <Select
                  id="tpl-bg"
                  className="mt-2"
                  value={layout.backgroundColor}
                  onChange={(e) =>
                    setLayout((p) => ({ ...p, backgroundColor: e.target.value }))
                  }
                >
                  {BACKGROUNDS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="tpl-rule">罫線の太さ</Label>
                <Select
                  id="tpl-rule"
                  className="mt-2"
                  value={layout.gridLineWidth}
                  onChange={(e) =>
                    setLayout((p) => ({ ...p, gridLineWidth: Number(e.target.value) }))
                  }
                >
                  {RULE_WIDTHS.map((r) => (
                    <option key={r.label} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="tpl-font">文字書体（フォント）</Label>
                <Select
                  id="tpl-font"
                  className="mt-2"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </section>

          {/* ---- Per-cell settings ---- */}
          <section className="mt-12 pb-16">
            <h2 className="text-brand flex items-center gap-2.5 text-[17px] font-bold">
              <Grid3x3 className="size-5" strokeWidth={1.8} aria-hidden />
              選択中セルの個別設定（{selected?.label ?? '未選択'}）
            </h2>

            {selected ? (
              <>
                <div className="mt-6 grid gap-x-9 gap-y-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="cell-source">項目カテゴリ</Label>
                    <Select
                      id="cell-source"
                      className="mt-2"
                      value={selected.source}
                      onChange={(e) =>
                        patchSelected({ source: fieldSourceSchema.parse(e.target.value) })
                      }
                    >
                      {fieldSourceSchema.options.map((s) => (
                        <option key={s} value={s}>
                          {FIELD_SOURCE_LABELS_JA[s]}
                        </option>
                      ))}
                    </Select>
                    <p className="text-ink-muted mt-1.5 text-[11px]">
                      「（自動）」の項目は撮影時に自動で入り、現場では上書きできません。
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="cell-label">項目ラベル名</Label>
                    <Input
                      id="cell-label"
                      className="mt-2"
                      value={selected.label}
                      onChange={(e) => patchSelected({ label: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cell-default">既定値（初期データ）</Label>
                    <Input
                      id="cell-default"
                      className="mt-2"
                      value={selected.defaultValue}
                      placeholder={SAMPLE_VALUES[selected.key] ?? ''}
                      onChange={(e) => patchSelected({ defaultValue: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cell-size">文字サイズ & 太さ</Label>
                    <div className="mt-2 flex gap-3">
                      <Select
                        id="cell-size"
                        value={
                          SIZE_STEPS.find((s) => s.value === selected.valueStyle.fontSize)?.value ??
                          SIZE_STEPS[1]!.value
                        }
                        onChange={(e) => patchValueStyle({ fontSize: Number(e.target.value) })}
                      >
                        {SIZE_STEPS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        onClick={() =>
                          patchValueStyle({
                            fontWeight: selected.valueStyle.fontWeight >= 700 ? 400 : 700,
                          })
                        }
                        aria-pressed={selected.valueStyle.fontWeight >= 700}
                        className={cn(
                          'h-[52px] w-[130px] shrink-0 rounded-[8px] text-[15px] font-bold transition-colors',
                          selected.valueStyle.fontWeight >= 700
                            ? 'bg-accent text-white'
                            : 'border-border text-ink-muted border bg-white',
                        )}
                      >
                        B（太字）
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cell-color">文字色</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        id="cell-color"
                        type="color"
                        value={selected.valueStyle.color}
                        onChange={(e) => patchValueStyle({ color: e.target.value })}
                        className="border-border h-[52px] w-[72px] cursor-pointer rounded-[8px] border bg-white p-1"
                      />
                      <Input
                        aria-label="文字色（カラーコード）"
                        value={selected.valueStyle.color}
                        onChange={(e) => patchValueStyle({ color: e.target.value })}
                        className="tabular"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cell-indent">
                      字下げ（インデント）：{selected.valueStyle.indent.toFixed(1)} 文字
                    </Label>
                    <input
                      id="cell-indent"
                      type="range"
                      min={0}
                      max={6}
                      step={0.5}
                      value={selected.valueStyle.indent}
                      onChange={(e) => patchValueStyle({ indent: Number(e.target.value) })}
                      className="accent-brand mt-5 w-full"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addField}
                  className="border-border text-ink-muted hover:border-brand hover:text-brand mt-9 flex h-[52px] w-full items-center justify-center gap-2 rounded-[8px] border border-dashed text-[14px] transition-colors"
                >
                  <Plus className="size-4" aria-hidden />
                  方眼に新しい項目セルを追加
                </button>
              </>
            ) : (
              <p className="text-ink-muted mt-6 text-sm">
                上の黒板からセルを選択してください。
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
