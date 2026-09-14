'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { Loader2, Check, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BoardPreview } from './board-preview';
import {
  blackboardFieldSchema,
  fieldSourceSchema,
  FIELD_SOURCE_LABELS_JA,
  DEFAULT_LABEL_STYLE,
  DEFAULT_VALUE_STYLE,
  type BlackboardLayout,
} from '@/lib/blackboard/layout-schema';
import { confirmImportAction, type ImportReviewState } from '@/app/(app)/templates/import/actions';

/** これを下回る項目は、現場が必ず目視で直すべきものとして目立たせる。 */
const LOW_CONFIDENCE = 75;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
      {pending ? '保存中…' : '確認してテンプレートとして保存'}
    </Button>
  );
}

export function ImportReview({
  importId,
  sourceUrl,
  draftLayout,
  confidence,
  errorMessage,
}: {
  importId: string;
  sourceUrl: string;
  draftLayout: BlackboardLayout;
  confidence: Record<string, number>;
  errorMessage: string | null;
}) {
  const [layout, setLayout] = useState<BlackboardLayout>(draftLayout);
  const [name, setName] = useState('取り込んだ看板テンプレート');
  const [workType, setWorkType] = useState('');
  const [state, formAction] = useActionState<ImportReviewState, FormData>(confirmImportAction, {});

  const patchField = (id: string, patch: Partial<(typeof layout.fields)[number]>) =>
    setLayout((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));

  const removeField = (id: string) =>
    setLayout((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== id) }));

  const addField = () => {
    const id = `field-${Date.now()}`;
    setLayout((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        blackboardFieldSchema.parse({
          id,
          key: id,
          label: '新しい項目',
          source: 'manual',
          row: prev.fields.length,
          col: 0,
          colSpan: 1,
          labelRatio: 0.26,
          labelStyle: { ...DEFAULT_LABEL_STYLE, color: '#8EFF9F', fontSize: 26, textAlign: 'left' },
          valueStyle: { ...DEFAULT_VALUE_STYLE, color: '#FFFFFF', fontSize: 30 },
        }),
      ],
    }));
  };

  const lowCount = layout.fields.filter(
    (f) => (confidence[f.key] ?? 100) < LOW_CONFIDENCE,
  ).length;

  const previewValues = Object.fromEntries(
    layout.fields.map((f) => [f.key, f.defaultValue || '（未入力）']),
  );

  return (
    <div className="px-8 pt-8 pb-16 xl:px-[31px]">
      {errorMessage && (
        <p className="border-accent/40 bg-accent/10 text-ink mb-6 flex items-start gap-2.5 rounded-[8px] border px-5 py-4 text-[13px]">
          <AlertTriangle className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />
          {errorMessage}
        </p>
      )}
      {state.error && (
        <p role="alert" className="border-danger/40 bg-danger-tint text-danger mb-6 rounded-[8px] border px-5 py-4 text-[13px]">
          {state.error}
        </p>
      )}

      <div className="grid gap-10 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* 元の看板写真。読み取り結果と並べて見比べられるようにする。 */}
        <div>
          <h2 className="text-brand text-[15px] font-bold">元の看板写真</h2>
          <Image
            src={sourceUrl}
            alt="取り込んだ看板の写真"
            width={840}
            height={630}
            unoptimized
            className="border-border-subtle bg-surface-sunken mt-3 w-full rounded-[10px] border object-contain"
          />
          <p className="text-ink-muted mt-3 text-[12px] leading-6">
            写真と見比べて、読み取り内容を直してください。
            {lowCount > 0 && (
              <span className="text-danger font-bold">
                　確信度の低い項目が {lowCount} 件あります。
              </span>
            )}
          </p>

          <h2 className="text-brand mt-8 text-[15px] font-bold">できあがる小黒板</h2>
          <div className="mt-3">
            <BoardPreview layout={layout} values={previewValues} />
          </div>
        </div>

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="importId" value={importId} />
          <input type="hidden" name="layout" value={JSON.stringify(layout)} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="ir-name">テンプレート名 *</Label>
              <Input id="ir-name" name="name" required className="mt-2" value={name}
                onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ir-worktype">対象の工種（任意）</Label>
              <Input id="ir-worktype" name="workType" className="mt-2" value={workType}
                placeholder="路盤工" onChange={(e) => setWorkType(e.target.value)} />
            </div>
          </div>

          <div>
            <h2 className="text-brand text-[15px] font-bold">読み取った項目（{layout.fields.length}件）</h2>
            <ul className="mt-3 space-y-3">
              {layout.fields.map((field) => {
                const conf = confidence[field.key];
                const low = (conf ?? 100) < LOW_CONFIDENCE;
                return (
                  <li
                    key={field.id}
                    className={`rounded-[10px] border px-5 py-4 ${low ? 'border-danger/45 bg-danger-tint/30' : 'border-border-subtle bg-white'}`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      {conf !== undefined && (
                        <Badge variant={low ? 'danger' : 'success'}>
                          確信度 {conf}%
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        aria-label={`${field.label || '項目'} を削除`}
                        className="text-danger hover:bg-danger-tint ml-auto grid size-8 place-items-center rounded-[6px] transition-colors"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                      <div>
                        <Label htmlFor={`lbl-${field.id}`}>項目名</Label>
                        <Input
                          id={`lbl-${field.id}`}
                          className="mt-1.5"
                          value={field.label}
                          placeholder="工事名"
                          onChange={(e) => patchField(field.id, { label: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`val-${field.id}`}>読み取った内容</Label>
                        <Input
                          id={`val-${field.id}`}
                          className="mt-1.5"
                          value={field.defaultValue}
                          onChange={(e) => patchField(field.id, { defaultValue: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label htmlFor={`src-${field.id}`}>項目カテゴリ</Label>
                      <Select
                        id={`src-${field.id}`}
                        className="mt-1.5"
                        value={field.source}
                        onChange={(e) =>
                          patchField(field.id, { source: fieldSourceSchema.parse(e.target.value) })
                        }
                      >
                        {fieldSourceSchema.options.map((s) => (
                          <option key={s} value={s}>{FIELD_SOURCE_LABELS_JA[s]}</option>
                        ))}
                      </Select>
                      <p className="text-ink-muted mt-1.5 text-[11px]">
                        「（自動）」を選ぶと、撮影時にその値が自動で入り、現場では上書きできません。
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={addField}
              className="border-border text-ink-muted hover:border-brand hover:text-brand mt-4 flex h-[48px] w-full items-center justify-center gap-2 rounded-[8px] border border-dashed text-[13px] transition-colors"
            >
              <Plus className="size-4" aria-hidden />
              読み取れなかった項目を追加
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
