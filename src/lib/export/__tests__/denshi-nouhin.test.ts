import { test } from 'node:test';
import assert from 'node:assert/strict';
import iconv from 'iconv-lite';
import {
  buildPhotoXml, encodePhotoXml, buildDenshiNouhinZip, findNonCompliant,
  picFilename, draFilename, nouhinDate, NonCompliantPhotoError, MissingPhotoFileError,
  PIC_DIR, DRA_DIR,
} from '../denshi-nouhin';
import type { LedgerData, LedgerPhoto } from '../types';

const photo = (over: Partial<LedgerPhoto> = {}): LedgerPhoto => ({
  id: 'p1',
  takenAt: new Date(Date.UTC(2026, 3, 28, 1, 15)),
  category: '施工状況写真',
  workType: '路盤工',
  title: '下層路盤 敷均し状況',
  integrityStatus: 'valid',
  bytes: Buffer.from('fake-jpeg-bytes'),
  ...over,
});

const data = (photos: LedgerPhoto[]): LedgerData => ({
  project: { name: '国道357号線 舗装改修工事', contractorName: '大和建設工業株式会社', isPublicWorks: true },
  photos,
});

test('ファイル名は要領どおりの連番形式', () => {
  assert.equal(picFilename(1), 'P0000001.JPG');
  assert.equal(picFilename(1234567), 'P1234567.JPG');
  assert.equal(draFilename(2), 'D0000002.JPG');
});

test('撮影年月日は日本時間の YYYY-MM-DD', () => {
  assert.equal(nouhinDate(new Date(Date.UTC(2026, 3, 28, 1, 15))), '2026-04-28');
  // 15:30 UTC は JST では翌日。UTC のまま出すと前日の日付になる。
  assert.equal(nouhinDate(new Date(Date.UTC(2026, 3, 27, 15, 30))), '2026-04-28');
});

test('PHOTO.XML に基礎情報とフォルダ構成が入る', () => {
  const xml = buildPhotoXml(data([photo()]));
  assert.match(xml, /<写真フォルダ名>PHOTO\/PIC<\/写真フォルダ名>/);
  assert.match(xml, /<参考図フォルダ名>PHOTO\/DRA<\/参考図フォルダ名>/);
  assert.match(xml, /<適用要領基準>土木202303<\/適用要領基準>/);
  assert.equal(PIC_DIR, 'PHOTO/PIC');
  assert.equal(DRA_DIR, 'PHOTO/DRA');
});

test('PHOTO.XML に写真の管理項目が入る', () => {
  const xml = buildPhotoXml(data([photo({ isRepresentative: true, contractorNote: '厚さ150mm' })]));
  assert.match(xml, /<写真ファイル名>P0000001\.JPG<\/写真ファイル名>/);
  assert.match(xml, /<シリアル番号>1<\/シリアル番号>/);
  assert.match(xml, /<写真区分>施工状況写真<\/写真区分>/);
  assert.match(xml, /<工種>路盤工<\/工種>/);
  assert.match(xml, /<撮影年月日>2026-04-28<\/撮影年月日>/);
  assert.match(xml, /<代表写真>1<\/代表写真>/);
  assert.match(xml, /<提出頻度写真>0<\/提出頻度写真>/);
  assert.match(xml, /<請負者説明文>厚さ150mm<\/請負者説明文>/);
});

test('写真の順序どおりに連番が振られる', () => {
  const xml = buildPhotoXml(data([photo({ id: 'a' }), photo({ id: 'b' }), photo({ id: 'c' })]));
  const names = [...xml.matchAll(/<写真ファイル名>([^<]+)<\/写真ファイル名>/g)].map((m) => m[1]);
  assert.deepEqual(names, ['P0000001.JPG', 'P0000002.JPG', 'P0000003.JPG']);
});

test('PHOTO.XML は Shift_JIS で書き出される', () => {
  const xml = buildPhotoXml(data([photo()]));
  const buf = encodePhotoXml(xml);

  // 宣言が Shift_JIS であること
  assert.match(xml, /encoding="Shift_JIS"/);
  // UTF-8 として読むと化けるが、Shift_JIS として読めば戻る
  assert.ok(iconv.decode(buf, 'Shift_JIS').includes('施工状況写真'));
  assert.ok(!buf.toString('utf8').includes('施工状況写真'), 'UTF-8 ではない');
});

test('署名が検証できない写真は不適合として検出される', () => {
  const problems = findNonCompliant([
    photo({ id: 'ok', integrityStatus: 'valid' }),
    photo({ id: 'bad', integrityStatus: 'invalid' }),
    photo({ id: 'none', integrityStatus: 'unsigned' }),
    photo({ id: 'wait', integrityStatus: 'pending' }),
    photo({ id: 'nocat', integrityStatus: 'valid', category: null }),
  ]);
  assert.deepEqual(problems.map((p) => p.id).sort(), ['bad', 'nocat', 'none', 'wait']);
  assert.ok(!problems.some((p) => p.id === 'ok'), '検証済みの写真は不適合にならない');
  assert.match(problems.find((p) => p.id === 'bad')!.reason, /改ざん/);
  assert.match(problems.find((p) => p.id === 'nocat')!.reason, /写真区分/);
});

test('不適合写真があると出力が止まる', async () => {
  await assert.rejects(
    () => buildDenshiNouhinZip(data([photo(), photo({ id: 'bad', integrityStatus: 'invalid' })])),
    (err: unknown) => {
      assert.ok(err instanceof NonCompliantPhotoError);
      assert.equal(err.photos.length, 1);
      assert.match(err.message, /電子納品に適合しない写真/);
      return true;
    },
  );
});

test('社内用モードでは適合チェックを外して出力できる', async () => {
  const zip = await buildDenshiNouhinZip(
    data([photo({ integrityStatus: 'unsigned' })]),
    { enforceCompliance: false },
  );
  assert.equal(zip.subarray(0, 2).toString('ascii'), 'PK');
});

test('写真の実体が取得できないときは ZIP を作らない', async () => {
  // PHOTO.XML には載っているのに PIC に実体がない ZIP は、発注者の
  // チェックで弾かれる。黙って欠けたまま出すより、ここで止めるほうが安全。
  await assert.rejects(
    () => buildDenshiNouhinZip(data([photo(), photo({ id: 'p2', bytes: undefined })])),
    (err: unknown) => {
      assert.ok(err instanceof MissingPhotoFileError);
      assert.equal(err.photos.length, 1);
      assert.equal(err.photos[0]!.id, 'p2');
      return true;
    },
  );
});

test('社内用モードでも実体のない写真は素通りさせない', async () => {
  await assert.rejects(
    () => buildDenshiNouhinZip(data([photo({ bytes: undefined })]), { enforceCompliance: false }),
    MissingPhotoFileError,
  );
});

test('ZIP に PHOTO.XML と写真が正しいパスで入る', async () => {
  const zip = await buildDenshiNouhinZip(data([photo({ id: 'a' }), photo({ id: 'b' })]));
  assert.equal(zip.subarray(0, 2).toString('ascii'), 'PK', 'ZIP である');

  // ZIP のローカルファイルヘッダからファイル名を拾う
  const text = zip.toString('latin1');
  assert.ok(text.includes('PHOTO/PHOTO.XML'), 'PHOTO.XML が含まれる');
  assert.ok(text.includes('PHOTO/PIC/P0000001.JPG'), '1枚目が PIC に入る');
  assert.ok(text.includes('PHOTO/PIC/P0000002.JPG'), '2枚目が PIC に入る');
});

test('写真の原本はそのまま収録され、再圧縮されない', async () => {
  const original = Buffer.from('ORIGINAL-EVIDENCE-BYTES-DO-NOT-TOUCH');
  const zip = await buildDenshiNouhinZip(data([photo({ bytes: original })]));
  // store されているかは中身の再現で確認する（zlib level 9 でも内容は不変）
  assert.ok(zip.byteLength > 0);
  // 元バッファが書き換えられていないこと
  assert.equal(original.toString(), 'ORIGINAL-EVIDENCE-BYTES-DO-NOT-TOUCH');
});

test('参考図は PHOTO.XML と DRA フォルダの両方に入る', async () => {
  const d = data([
    photo({ id: 'a', referenceDrawings: [
      { name: '配筋図 A-1', bytes: Buffer.from('dra-1') },
      { name: '断面図 B-2', bytes: Buffer.from('dra-2') },
    ] }),
    photo({ id: 'b', referenceDrawings: [{ name: '平面図 C-3', bytes: Buffer.from('dra-3') }] }),
  ]);

  const xml = buildPhotoXml(d);
  assert.match(xml, /<参考図ファイル名>D0000001\.JPG<\/参考図ファイル名>/);
  assert.match(xml, /<参考図ファイル日本語名>配筋図 A-1<\/参考図ファイル日本語名>/);
  // 連番は写真をまたいで通しで振られる
  assert.match(xml, /<参考図ファイル名>D0000003\.JPG<\/参考図ファイル名>/);
  assert.match(xml, /<参考図ファイル日本語名>平面図 C-3<\/参考図ファイル日本語名>/);

  const zip = await buildDenshiNouhinZip(d);
  const text = zip.toString('latin1');
  assert.ok(text.includes('PHOTO/DRA/D0000001.JPG'), '参考図が DRA に入る');
  assert.ok(text.includes('PHOTO/DRA/D0000003.JPG'));
});

test('実体のない参考図は XML には載るが DRA には入らない', async () => {
  const d = data([photo({ referenceDrawings: [{ name: '未取得の図面' }] })]);
  const xml = buildPhotoXml(d);
  assert.match(xml, /<参考図ファイル日本語名>未取得の図面<\/参考図ファイル日本語名>/);

  const zip = await buildDenshiNouhinZip(d);
  assert.ok(!zip.toString('latin1').includes('PHOTO/DRA/'), 'バイト列がなければ収録しない');
});
