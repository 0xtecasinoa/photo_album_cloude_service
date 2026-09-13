import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  exportLedgerExcel, buildLedgerWorkbook, fillPlaceholders, templateValues, formatJstDate,
} from '../excel';
import type { LedgerData } from '../types';

function sample(): LedgerData {
  return {
    project: {
      name: '国道357号線 舗装改修工事',
      code: 'R6-0412',
      clientName: '国土交通省 関東地方整備局',
      contractorName: '大和建設工業株式会社',
      isPublicWorks: true,
    },
    photos: [
      {
        id: 'p1',
        takenAt: new Date(Date.UTC(2026, 3, 28, 1, 15)), // 10:15 JST
        category: '施工状況写真',
        workType: '路盤工',
        workKind: '下層路盤',
        workDetail: '敷均し',
        title: '下層路盤 敷均し状況',
        shootingLocation: 'NO.12+5.0m L側',
        contractorNote: '厚さ150mmで敷均し完了。',
        isRepresentative: true,
        integrityStatus: 'valid',
      },
      {
        id: 'p2',
        takenAt: new Date(Date.UTC(2026, 3, 28, 6, 0)), // 15:00 JST
        category: '出来形管理写真',
        workType: '路盤工',
        title: '厚さ測定',
        integrityStatus: 'valid',
      },
    ],
  };
}

test('撮影年月日は日本時間で書き出される', () => {
  // 01:15 UTC は JST では同日 10:15。UTC のまま出すと前日になる日付もある。
  assert.equal(formatJstDate(new Date(Date.UTC(2026, 3, 28, 1, 15))), '2026/04/28');
  assert.equal(formatJstDate(new Date(Date.UTC(2026, 3, 27, 16, 30))), '2026/04/28');
});

test('台帳ワークブックに見出しと写真行が入る', async () => {
  const wb = await buildLedgerWorkbook(sample());
  const sheet = wb.getWorksheet('工事写真台帳');
  assert.ok(sheet, 'シートが存在する');

  assert.equal(sheet.getCell('A1').value, '工事写真台帳');
  assert.equal(sheet.getRow(2).getCell(2).value, '国道357号線 舗装改修工事');

  const header = sheet.getRow(6);
  assert.equal(header.getCell(1).value, 'No.');
  assert.equal(header.getCell(2).value, '撮影年月日');
  assert.equal(header.getCell(11).value, '代表写真');

  const first = sheet.getRow(7);
  assert.equal(first.getCell(1).value, 1);
  assert.equal(first.getCell(2).value, '2026/04/28');
  assert.equal(first.getCell(3).value, '施工状況写真');
  assert.equal(first.getCell(7).value, '下層路盤 敷均し状況');
  assert.equal(first.getCell(11).value, '○', '代表写真は○で表示');

  const second = sheet.getRow(8);
  assert.equal(second.getCell(1).value, 2);
  assert.equal(second.getCell(11).value, '', '代表写真でなければ空欄');
});

test('出力したバッファが実際に xlsx として読み戻せる', async () => {
  const buf = await exportLedgerExcel(sample());
  assert.ok(buf.byteLength > 1000, 'それなりのサイズがある');
  // xlsx は ZIP なので PK シグネチャで始まる
  assert.equal(buf.subarray(0, 2).toString('ascii'), 'PK');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const sheet = wb.getWorksheet('工事写真台帳');
  assert.ok(sheet);
  assert.equal(sheet.getCell('A1').value, '工事写真台帳');
});

test('プレースホルダ差し込み', () => {
  const values = templateValues(sample());
  assert.equal(values['工事名'], '国道357号線 舗装改修工事');
  assert.equal(values['写真枚数'], '2');

  assert.equal(fillPlaceholders('工事名：{{工事名}}', values), '工事名：国道357号線 舗装改修工事');
  assert.equal(fillPlaceholders('{{ 工事番号 }} 号', values), 'R6-0412 号');
  // 未知のキーは壊さずそのまま残す（雛形の誤検出で内容を消さないため）
  assert.equal(fillPlaceholders('{{未知}}', values), '{{未知}}');
});

test('発注者の雛形に差し込んで出力できる', async () => {
  // お客様の書式を模した雛形をその場で作る
  const tpl = new ExcelJS.Workbook();
  const ts = tpl.addWorksheet('提出用');
  ts.getCell('A1').value = '工事名: {{工事名}}';
  ts.getCell('A2').value = '請負者: {{請負者名}}';
  ts.getCell('A3').value = '枚数: {{写真枚数}} 枚';
  const tplBuf = Buffer.from(await tpl.xlsx.writeBuffer());

  const out = await exportLedgerExcel(sample(), { templateBuffer: tplBuf });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(out as unknown as ArrayBuffer);
  const sheet = wb.getWorksheet('提出用');

  assert.ok(sheet, '雛形のシート名が保持される');
  assert.equal(sheet.getCell('A1').value, '工事名: 国道357号線 舗装改修工事');
  assert.equal(sheet.getCell('A2').value, '請負者: 大和建設工業株式会社');
  assert.equal(sheet.getCell('A3').value, '枚数: 2 枚');
});
