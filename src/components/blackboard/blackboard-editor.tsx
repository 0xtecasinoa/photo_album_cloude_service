'use client';

import { useActionState, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Save, Filter, Grid3x3, Plus, Loader2, Trash2, FilePlus2, Star, ScanLine } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BoardPreview } from './board-preview';
import { cn } from '@/lib/utils';
import {
  saveTemplateAction,
  deleteTemplateAction,
  type TemplateFormState,
} from '@/app/(app)/templates/actions';
import type { TemplateListItem } from '@/lib/queries/blackboard-templates';
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
  { value: '#0B3B6F', label: '青（標準工事用）' },
  { value: '#FFFFFF', label: '白（ホワイトボード）' },
  { value: '#8B6B43', label: '木目（ナチュラル）' },
  { value: '#1B5E20', label: '緑（標準）' },
  { value: '#1A1A1A', label: '黒（コントラスト重視）' },
];

const RULE_WIDTHS = [
  { value: 1, label: '細線（1PX）' },
  { value: 2, label: '中太（2PX）' },
  { value: 4, label: '極太（4PX）' },
  { value: 0, label: '罫線なし' },
];

const FONT_FAMILIES = [
  { value: 'Zen Kaku Gothic New', label: 'ゴシック体（高視認性）' },
  { value: 'Noto Serif JP', label: '明朝体（格式高）' },
  { value: 'var(--font-klee), Yu Gothic', label: '手書き風（味わい）' },
  { value: 'Yu Gothic', label: '游ゴシック（標準）' },
];

const SIZE_STEPS = [
  { value: 18, label: '小（小文字）' },
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

function SaveButton({ canManage, isNew }: { canManage: boolean; isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending || !canManage}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
      {/* 押す前に、新しく作るのか上書きするのかが分かるようにする。 */}
      {pending ? '保存中…' : isNew ? '新規作成して全員へ配布' : '上書き保存して全員へ配布'}
    </Button>
  );
}

export function BlackboardEditor({
  templates,
  canManage,
}: {
  templates: TemplateListItem[];
  canManage: boolean;
}) {
  const [templateId, setTemplateId] = useState<string | null>(templates[0]?.id ?? null);
  const [layout, setLayout] = useState<BlackboardLayout>(
    () => templates[0]?.layout ?? createStandardLayout(),
  );
  const [templateName, setTemplateName] = useState(templates[0]?.name ?? '標準工事小黒板（5項目）');
  const [workType, setWorkType] = useState(templates[0]?.workType ?? '');
  const [isDefault, setIsDefault] = useState(templates[0]?.isDefault ?? templates.length === 0);
  const [selectedId, setSelectedId] = useState<string | null>('projectName');
  // 書体は各項目のスタイルに持たせる。板全体の表示だけ変えて保存すると、
  // 撮影時の描画に反映されず「見た目と違う黒板」が写真に載ってしまう。
  const [fontFamily, setFontFamily] = useState(
    templates[0]?.layout.fields[0]?.valueStyle.fontFamily ?? FONT_FAMILIES[0]!.value,
  );

  const [saveState, saveAction] = useActionState<TemplateFormState, FormData>(saveTemplateAction, {});
  const [deleteState, deleteAction] = useActionState<TemplateFormState, FormData>(deleteTemplateAction, {});

  // 保存と削除は別々の状態なので、新しいほうだけを画面に出す。
  const latest = (deleteState.at ?? 0) > (saveState.at ?? 0) ? deleteState : saveState;

  /*
   * 新規作成のあとは、保存されたテンプレートを編集対象として引き継ぐ。
   * 続けて「保存」を押したときに、同じ内容がもう一件増えないようにするため。
   * レンダリング中の調整で行う（effect で setState すると一度余計に描き直す）。
   */
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  if (saveState.saved && saveState.saved.id !== lastSavedId) {
    setLastSavedId(saveState.saved.id);
    setTemplateId(saveState.saved.id);
  }

  const loadTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    requestAnimationFrame(() => {
      nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    setTemplateId(t.id);
    setLayout(t.layout);
    setTemplateName(t.name);
    setWorkType(t.workType ?? '');
    setIsDefault(t.isDefault);
    setFontFamily(t.layout.fields[0]?.valueStyle.fontFamily ?? FONT_FAMILIES[0]!.value);
    setSelectedId(t.layout.fields[0]?.id ?? null);
  };

  const nameRef = useRef<HTMLInputElement>(null);

  const startNew = () => {
    const fresh = createStandardLayout();
    setTemplateId(null);
    setLayout(fresh);
    setTemplateName('新しい小黒板テンプレート');
    setWorkType('');
    setIsDefault(false);
    setFontFamily(FONT_FAMILIES[0]!.value);
    setSelectedId(fresh.fields[0]?.id ?? null);

    /*
     * 押しても画面が変わったように見えないと「効いていない」と受け取られる。
     * 黒板の見本の値は新規でも同じなので、見た目がほとんど変わらない。
     * 名前を入れる欄まで運んで、そのまま打ち替えられる状態にする。
     */
    requestAnimationFrame(() => {
      nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nameRef.current?.focus();
      nameRef.current?.select();
    });
  };

  /** 保存する値。画面で選んだ書体を全項目のスタイルへ焼き込む。 */
  const layoutToSave = useMemo<BlackboardLayout>(
    () => ({
      ...layout,
      fields: layout.fields.map((f) => ({
        ...f,
        labelStyle: { ...f.labelStyle, fontFamily },
        valueStyle: { ...f.valueStyle, fontFamily },
      })),
    }),
    [layout, fontFamily],
  );

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
          <form action={saveAction} className="flex items-center gap-3">
            <input type="hidden" name="templateId" value={templateId ?? ''} />
            <input type="hidden" name="name" value={templateName} />
            <input type="hidden" name="workType" value={workType} />
            <input type="hidden" name="isDefault" value={String(isDefault)} />
            <input type="hidden" name="layout" value={JSON.stringify(layoutToSave)} />
            <SaveButton canManage={canManage} isNew={templateId === null} />
          </form>
        }
      />

      <div className="px-8 pt-10 xl:px-[31px]">
        <div className="mx-auto max-w-[1050px]">
          {latest?.error && (
            <p role="alert" className="border-danger/40 bg-danger-tint text-danger mb-6 rounded-[8px] border px-5 py-4 text-[13px]">
              {latest.error}
            </p>
          )}
          {latest?.message && (
            <p role="status" className="border-success/40 bg-success-tint text-success mb-6 rounded-[8px] border px-5 py-4 text-[13px]">
              {latest.message}
            </p>
          )}
          {!canManage && (
            <p className="border-border-subtle bg-surface-muted text-ink-muted mb-6 rounded-[8px] border px-5 py-4 text-[13px]">
              テンプレートの閲覧のみ可能です。保存・削除には「電子小黒板テンプレートの管理」権限が必要です。
            </p>
          )}

          {/* ---- 保存済みテンプレート ---- */}
          <section className="mb-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-brand text-[17px] font-bold">保存済みテンプレート（{templates.length}件）</h2>
              {canManage && (
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/templates/import"
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    <ScanLine className="size-4" aria-hidden />
                    手書き看板から取り込む
                  </Link>
                  <Button type="button" variant="outline" onClick={startNew}>
                    <FilePlus2 className="size-4" aria-hidden />
                    新しいテンプレート
                  </Button>
                </div>
              )}
            </div>

            {templates.length === 0 ? (
              <p className="border-border-subtle text-ink-muted rounded-[10px] border border-dashed bg-white px-6 py-8 text-center text-[13px]">
                まだテンプレートがありません。下で黒板を作り、「案件メンバー全員へ配布保存」で保存してください。
              </p>
            ) : (
              <ul className="border-border-subtle divide-border-subtle divide-y overflow-hidden rounded-[10px] border bg-white">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className={cn(
                      'flex flex-wrap items-center gap-3 px-6 py-4',
                      t.id === templateId && 'bg-brand-tint/50',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => loadTemplate(t.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold text-ink">{t.name}</span>
                        {t.isDefault && (
                          <Badge variant="brand" className="inline-flex items-center gap-1">
                            <Star className="size-3" aria-hidden />既定
                          </Badge>
                        )}
                        {t.id === templateId && <Badge variant="admin">編集中</Badge>}
                      </span>
                      <span className="text-ink-muted mt-1 block text-[12px]">
                        {t.workType ? `${t.workType}　/　` : ''}{t.layout.fields.length} 項目
                      </span>
                    </button>
                    {canManage && (
                      <form
                        action={deleteAction}
                        onSubmit={(e) => {
                          if (!confirm(`「${t.name}」を削除します。よろしいですか？`)) e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="templateId" value={t.id} />
                        <button
                          type="submit"
                          aria-label={`${t.name} を削除`}
                          className="text-danger hover:bg-danger-tint grid size-9 place-items-center rounded-[6px] transition-colors"
                        >
                          <Trash2 className="size-[18px]" aria-hidden />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

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
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-brand flex items-center gap-2.5 text-[17px] font-bold">
                <Filter className="size-5" strokeWidth={1.8} aria-hidden />
                看板全体設定（名称・背景・罫線・書体）
              </h2>
              {/* 新規なのか、どれを直しているのかが一目で分かるようにする。 */}
              {templateId === null ? (
                <Badge variant="admin" className="px-4 py-1.5">新規作成中</Badge>
              ) : (
                <Badge variant="neutral" className="px-4 py-1.5">
                  編集中：{templates.find((t) => t.id === templateId)?.name ?? '保存済みテンプレート'}
                </Badge>
              )}
            </div>

            <div className="grid gap-x-9 gap-y-6 md:grid-cols-2">
              <div>
                <Label htmlFor="tpl-name">看板テンプレ名</Label>
                <Input
                  id="tpl-name"
                  ref={nameRef}
                  className="mt-2"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="tpl-worktype">対象の工種（任意）</Label>
                <Input
                  id="tpl-worktype"
                  className="mt-2"
                  value={workType}
                  placeholder="鉄筋工"
                  onChange={(e) => setWorkType(e.target.value)}
                />
                <p className="text-ink-muted mt-1.5 text-[11px]">
                  工種を入れておくと、撮影時にその工種の写真へ自動で候補として出ます。
                </p>
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

              <label className="flex cursor-pointer items-start gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="accent-accent mt-1 size-[15px] shrink-0"
                />
                <span className="text-[13px] text-ink">
                  このテンプレートを既定にする
                  <span className="text-ink-muted mt-0.5 block text-[11px]">
                    撮影時に最初に表示されます。既定はひとつだけで、他のテンプレートの既定は外れます。
                  </span>
                </span>
              </label>
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
