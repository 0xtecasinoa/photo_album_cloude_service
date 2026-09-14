import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { blackboardImports } from '@/db/schema';
import { getSessionContext } from '@/lib/auth/session';
import { storage } from '@/lib/storage';
import { storageKeys } from '@/lib/storage/keys';
import { recognizeBoard, isOcrAvailable } from '@/lib/blackboard/ocr';
import {
  blackboardFieldSchema,
  blackboardLayoutSchema,
  fieldSourceSchema,
  DEFAULT_LABEL_STYLE,
  DEFAULT_VALUE_STYLE,
  type BlackboardLayout,
} from '@/lib/blackboard/layout-schema';
import type { ExtractedField } from '@/lib/blackboard/ocr-text';
import { recordAudit, auditRequestInfo } from '@/lib/audit';

export const runtime = 'nodejs';
/** OCR はワーカー起動を含めて十数秒かかることがある。 */
export const maxDuration = 120;

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_BYTES = 20 * 1024 * 1024;

function extensionFor(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic';
  return 'jpg';
}

/** 読み取った項目を、そのまま編集できるレイアウトに組み立てる。 */
function layoutFromFields(fields: ExtractedField[]): BlackboardLayout {
  const usable = fields.length > 0 ? fields : [
    { key: 'projectName', label: '工事名', source: 'project.name', value: '', confidence: 0, unmatched: false },
    { key: 'workType', label: '工種', source: 'photo.workType', value: '', confidence: 0, unmatched: false },
    { key: 'shootingLocation', label: '測点', source: 'photo.shootingLocation', value: '', confidence: 0, unmatched: false },
    { key: 'contractor', label: '施工者', source: 'project.contractorName', value: '', confidence: 0, unmatched: false },
    { key: 'date', label: '日付', source: 'auto.date', value: '', confidence: 0, unmatched: false },
  ];

  return blackboardLayoutSchema.parse({
    columns: 1,
    width: 1400,
    height: Math.max(400, 140 * usable.length),
    backgroundColor: '#132A22',
    borderColor: '#F0AE1E',
    borderWidth: 6,
    gridLineColor: '#FFFFFF',
    gridLineWidth: 1,
    padding: 40,
    fields: usable.map((f, i) =>
      blackboardFieldSchema.parse({
        id: f.key,
        key: f.key,
        label: f.unmatched ? '' : f.label,
        // 未分類の行は手入力にしておく。誤った自動項目に割り当てるより安全。
        source: fieldSourceSchema.parse(f.unmatched ? 'manual' : f.source),
        defaultValue: f.value,
        row: i,
        col: 0,
        colSpan: 1,
        labelRatio: f.unmatched ? 0 : 0.26,
        labelStyle: { ...DEFAULT_LABEL_STYLE, color: '#8EFF9F', fontSize: 26, textAlign: 'left' },
        valueStyle: { ...DEFAULT_VALUE_STYLE, color: '#FFFFFF', fontSize: 30 },
      }),
    ),
  });
}

export async function POST(request: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });

  if (!ctx.capabilities.has('blackboard.template.manage')) {
    return NextResponse.json({ error: 'テンプレートを作成する権限がありません。' }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '看板の写真を選択してください。' }, { status: 400 });
  }
  if (!ACCEPTED.has(file.type)) {
    return NextResponse.json({ error: '対応していない画像形式です。' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '画像が大きすぎます（20MBまで）。' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const importId = randomUUID();
  const sourceKey = storageKeys.blackboardImportSource(
    ctx.organization.id,
    importId,
    extensionFor(file.type),
  );
  await storage.put(sourceKey, bytes, file.type);

  let status = 'needs_review';
  let ocrResult: Record<string, unknown> | null = null;
  let confidence: Record<string, number> | null = null;
  let draftLayout: BlackboardLayout;
  let errorMessage: string | null = null;

  try {
    const ocr = await recognizeBoard(bytes);
    ocrResult = { rawText: ocr.rawText, confidence: ocr.confidence, available: ocr.available };
    confidence = Object.fromEntries(ocr.fields.map((f) => [f.key, f.confidence]));
    draftLayout = layoutFromFields(ocr.fields);
    if (!ocr.available) {
      // 読み取りが使えなくても取り込み自体は続けられる。空欄を手で埋めてもらう。
      errorMessage = '文字認識の言語データが未設置のため、項目は空のまま作成しました。';
    }
  } catch (error) {
    console.error('[blackboard.import] ocr failed', error);
    status = 'needs_review';
    errorMessage = '文字の読み取りに失敗しました。項目は手入力で作成してください。';
    draftLayout = layoutFromFields([]);
  }

  await db.insert(blackboardImports).values({
    id: importId,
    organizationId: ctx.organization.id,
    sourceStorageKey: sourceKey,
    status,
    ocrResult,
    confidence,
    draftLayout,
    errorMessage,
    createdById: ctx.user.id,
  });

  await recordAudit({
    organizationId: ctx.organization.id,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
    actorEmail: ctx.user.email,
    action: 'blackboard.import',
    targetType: 'blackboard_import',
    targetId: importId,
    targetLabel: file.name,
    metadata: { ocrAvailable: isOcrAvailable(), fields: draftLayout.fields.length },
    ...auditRequestInfo(request),
  });

  return NextResponse.json({
    importId,
    status,
    errorMessage,
    fieldCount: draftLayout.fields.length,
  });
}
