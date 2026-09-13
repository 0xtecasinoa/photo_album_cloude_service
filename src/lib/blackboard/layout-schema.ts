import { z } from 'zod';

/**
 * 電子小黒板 layout model.
 *
 * Everything the customer asked to control — font size, family, weight, colour,
 * background, indent — is per-field and independent for the label and the value,
 * because real 看板 almost always style the two differently.
 */

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'カラーコードの形式が正しくありません');

export const textStyleSchema = z.object({
  fontSize: z.number().min(6).max(200).default(24),
  fontFamily: z.string().default('Noto Sans JP'),
  /** 100–900. 太さ requirement. */
  fontWeight: z.number().int().min(100).max(900).step(100).default(400),
  fontStyle: z.enum(['normal', 'italic']).default('normal'),
  color: hexColor.default('#FFFFFF'),
  backgroundColor: hexColor.nullable().default(null),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  verticalAlign: z.enum(['top', 'middle', 'bottom']).default('middle'),
  /** 字下げ, in em. */
  indent: z.number().min(0).max(20).default(0),
  lineHeight: z.number().min(0.5).max(4).default(1.4),
  letterSpacing: z.number().min(-0.5).max(2).default(0),
  underline: z.boolean().default(false),
  /** Outline improves legibility against bright concrete and sky. */
  strokeWidth: z.number().min(0).max(8).default(0),
  strokeColor: hexColor.default('#000000'),
});

export type TextStyle = z.infer<typeof textStyleSchema>;

/**
 * Where a field's value comes from. Auto sources are filled at capture time and
 * cannot be typed over by the photographer, which is what makes the 撮影年月日 on
 * the board trustworthy.
 */
export const fieldSourceSchema = z.enum([
  'manual',
  'select',
  'project.name',
  'project.code',
  'project.clientName',
  'project.contractorName',
  'project.location',
  'auto.date',
  'auto.datetime',
  'auto.time',
  'auto.user',
  'auto.counter',
  'photo.workType',
  'photo.workKind',
  'photo.workDetail',
  'photo.category',
  'photo.title',
  'photo.shootingLocation',
  'photo.controlValue',
]);

export type FieldSource = z.infer<typeof fieldSourceSchema>;

export const FIELD_SOURCE_LABELS_JA: Record<FieldSource, string> = {
  manual: '手入力',
  select: '選択肢から入力',
  'project.name': '工事名称（自動）',
  'project.code': '工事番号（自動）',
  'project.clientName': '発注者名（自動）',
  'project.contractorName': '請負者名（自動）',
  'project.location': '施工場所（自動）',
  'auto.date': '撮影年月日（自動）',
  'auto.datetime': '撮影日時（自動）',
  'auto.time': '撮影時刻（自動）',
  'auto.user': '撮影者（自動）',
  'auto.counter': '連番（自動）',
  'photo.workType': '工種',
  'photo.workKind': '種別',
  'photo.workDetail': '細別',
  'photo.category': '写真区分',
  'photo.title': '写真タイトル',
  'photo.shootingLocation': '撮影箇所',
  'photo.controlValue': '施工管理値',
};

export const blackboardFieldSchema = z.object({
  id: z.string().min(1),
  /** Stable key used in photo.blackboardData and in the JACIC payload. */
  key: z.string().min(1).max(64),
  label: z.string().max(64),
  showLabel: z.boolean().default(true),
  labelStyle: textStyleSchema,
  valueStyle: textStyleSchema,
  /** Background behind the whole cell, distinct from the text background. */
  cellBackgroundColor: hexColor.nullable().default(null),
  source: fieldSourceSchema.default('manual'),
  /** Choices when source is 'select' — the master list the office controls. */
  options: z.array(z.string()).default([]),
  defaultValue: z.string().default(''),
  placeholder: z.string().default(''),
  required: z.boolean().default(false),
  maxLength: z.number().int().min(1).max(500).default(100),
  /** Value wraps onto multiple lines instead of shrinking to fit. */
  multiline: z.boolean().default(false),
  /** Grid placement. */
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  colSpan: z.number().int().min(1).default(1),
  rowSpan: z.number().int().min(1).default(1),
  /** Label column width as a fraction of the cell, 0 hides the label column. */
  labelRatio: z.number().min(0).max(1).default(0.3),
});

export type BlackboardField = z.infer<typeof blackboardFieldSchema>;

export const blackboardLayoutSchema = z.object({
  version: z.literal(1).default(1),
  /** Board size in px at render time; aspect ratio is what matters on screen. */
  width: z.number().int().min(200).max(4000).default(1200),
  height: z.number().int().min(120).max(4000).default(800),
  backgroundColor: hexColor.default('#1B5E20'),
  borderColor: hexColor.default('#FFFFFF'),
  borderWidth: z.number().min(0).max(40).default(6),
  cornerRadius: z.number().min(0).max(80).default(0),
  /** 透過黒板 — lets the subject show through the board. */
  opacity: z.number().min(0.2).max(1).default(1),
  /** Grid definition. Row heights are relative weights, not pixels. */
  columns: z.number().int().min(1).max(12).default(2),
  rowHeights: z.array(z.number().min(0.1)).default([1, 1, 1, 1]),
  gridLineColor: hexColor.default('#FFFFFF'),
  gridLineWidth: z.number().min(0).max(12).default(2),
  padding: z.number().min(0).max(120).default(16),
  fields: z.array(blackboardFieldSchema).default([]),
});

export type BlackboardLayout = z.infer<typeof blackboardLayoutSchema>;

/** Style used for a fresh field, so the editor never starts from an empty object. */
export const DEFAULT_LABEL_STYLE: TextStyle = textStyleSchema.parse({
  fontSize: 22,
  fontWeight: 700,
  color: '#FFFFFF',
  textAlign: 'center',
});

export const DEFAULT_VALUE_STYLE: TextStyle = textStyleSchema.parse({
  fontSize: 26,
  fontWeight: 400,
  color: '#FFFFFF',
  textAlign: 'left',
  indent: 0.5,
});

/**
 * Classic green 工事黒板, used as the starting point until the customer's own
 * template is imported. Replace once their 看板 template arrives.
 */
export function createDefaultLayout(): BlackboardLayout {
  const mk = (
    key: string,
    label: string,
    source: FieldSource,
    row: number,
    col = 0,
    colSpan = 2,
  ): BlackboardField =>
    blackboardFieldSchema.parse({
      id: key,
      key,
      label,
      source,
      row,
      col,
      colSpan,
      labelStyle: DEFAULT_LABEL_STYLE,
      valueStyle: DEFAULT_VALUE_STYLE,
    });

  return blackboardLayoutSchema.parse({
    fields: [
      mk('projectName', '工事名', 'project.name', 0),
      mk('workType', '工種', 'photo.workType', 1, 0, 1),
      mk('workDetail', '細別', 'photo.workDetail', 1, 1, 1),
      mk('title', '施工内容', 'photo.title', 2),
      mk('shootingLocation', '撮影箇所', 'photo.shootingLocation', 3, 0, 1),
      mk('date', '撮影年月日', 'auto.date', 3, 1, 1),
    ],
  });
}
