/**
 * 開発用のシードデータ。
 *
 *   npm run db:seed
 *
 * 何度実行しても同じ結果になるよう、既存データがあれば作り直します。
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { db } from './index';
import { organizations, users, projects, projectMembers, albums, photos } from './schema';
import { ensureSystemRoles, slugify } from '@/lib/auth/provision';
import { PLANS } from '@/lib/plans';
import { storage } from '@/lib/storage';
import { storageKeys } from '@/lib/storage/keys';
import { processPhoto } from '@/lib/photo/process';

const ORG_NAME = '大和建設工業株式会社';
const OWNER_EMAIL = 'taro.yamada@example.com';
const PASSWORD = 'password1234';

const MEMBERS = [
  { name: '佐藤 花子', email: 'hanako.sato@example.com', role: 'editor' as const },
  { name: '鈴木 一郎', email: 'ichiro.suzuki@example.com', role: 'viewer' as const },
  { name: '高橋 美咲', email: 'misaki.takahashi@example.com', role: 'editor' as const },
];

/**
 * 現場写真の代わりになる JPEG を作る。
 *
 * 行だけ入れて実体を置かないと、台帳も PDF も電子納品も空のまま
 * 「動いているように見える」状態になります。出力まで通して確認できるよう、
 * 小黒板を描き込んだ実物の画像を生成します。
 */
async function makeSitePhoto(index: number, caption: string, shotAt: Date): Promise<Buffer> {
  const W = 1600;
  const H = 1200;
  const hue = 195 + ((index * 17) % 40);
  const stamp = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(shotAt);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="hsl(${hue},45%,72%)"/>
        <stop offset="58%" stop-color="hsl(${hue},28%,58%)"/>
        <stop offset="58%" stop-color="hsl(28,18%,45%)"/>
        <stop offset="100%" stop-color="hsl(28,14%,32%)"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <rect x="180" y="470" width="1240" height="120" fill="hsl(0,0%,62%)" opacity="0.85"/>
    <rect x="300" y="380" width="60" height="330" fill="hsl(28,25%,38%)"/>
    <rect x="1240" y="380" width="60" height="330" fill="hsl(28,25%,38%)"/>
    <!-- 電子小黒板 -->
    <rect x="64" y="${H - 404}" width="720" height="340" rx="10" fill="#132A22" opacity="0.94"/>
    <rect x="80" y="${H - 388}" width="688" height="308" rx="6" fill="none" stroke="#8EFF9F" stroke-width="3"/>
    <text x="110" y="${H - 322}" font-family="sans-serif" font-size="42" fill="#8EFF9F">工事名　○○橋梁上部工事</text>
    <text x="110" y="${H - 252}" font-family="sans-serif" font-size="42" fill="#ffffff">${caption}</text>
    <text x="110" y="${H - 182}" font-family="sans-serif" font-size="38" fill="#ffffff">測点　NO.${12 + index}+5.0m L側</text>
    <text x="110" y="${H - 112}" font-family="sans-serif" font-size="38" fill="#8EFF9F">${stamp}</text>
  </svg>`;

  return sharp(Buffer.from(svg))
    .jpeg({ quality: 82 })
    // 撮影日時は EXIF にも入れる。台帳の並びは EXIF を正とするため。
    .withMetadata({ exif: { IFD0: { DateTimeOriginal: formatExifDate(shotAt) } } })
    .toBuffer();
}

/** EXIF の DateTimeOriginal は日本時間の壁時計で書く（タイムゾーン欄がないため）。 */
function formatExifDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}:${get('month')}:${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

async function main() {
  console.log('seeding…');

  // 既存の組織があれば消してから作り直す（関連レコードは cascade で消える）
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, ORG_NAME))
    .limit(1);
  if (existing) {
    // 行を消す前に保存済みファイルを片付ける。組織 ID は作り直すたびに
    // 変わるので、ここで消さないと .storage に孤児が溜まり続ける。
    const stale = await db
      .select({
        storageKey: photos.storageKey,
        originalStorageKey: photos.originalStorageKey,
        thumbnailKey: photos.thumbnailKey,
      })
      .from(photos)
      .where(eq(photos.organizationId, existing.id));

    for (const row of stale) {
      for (const key of [row.storageKey, row.originalStorageKey, row.thumbnailKey]) {
        if (key) await storage.delete(key).catch(() => {});
      }
    }

    /*
     * 現場メンバーを先に消す。project_members.role_id は restrict なので、
     * 組織の削除から roles へ連鎖した時点で外部キー違反になり、
     * cascade 任せでは消せない。
     */
    const orgProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.organizationId, existing.id));
    for (const p of orgProjects) {
      await db.delete(projectMembers).where(eq(projectMembers.projectId, p.id));
    }

    await db.delete(organizations).where(eq(organizations.id, existing.id));
    console.log(`  removed previous seed organization (${stale.length} photos)`);
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name: ORG_NAME,
      slug: slugify('yamato-kensetsu'),
      plan: 'genba_pro',
      // 枠はプランの定義から取る。画面のカードと違う数字を入れると、
      // 「100GBと書いてあるのに表示は500GB」という食い違いになる。
      seatLimit: PLANS.genba_pro.seatLimit,
      storageQuotaBytes: PLANS.genba_pro.storageQuotaBytes,
      // 使用量は写真を入れたあとに実測値で埋める。作り話の数字を入れない。
      storageUsedBytes: 0,
    })
    .returning({ id: organizations.id });
  const organizationId = org!.id;

  const roleIds = await ensureSystemRoles(organizationId);
  console.log(`  organization + ${Object.keys(roleIds).length} roles`);

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const [owner] = await db
    .insert(users)
    .values({
      name: '山田 太郎', email: OWNER_EMAIL, passwordHash,
      organizationId, defaultRoleId: roleIds.owner, emailVerified: new Date(),
    })
    .returning({ id: users.id });

  for (const m of MEMBERS) {
    await db.insert(users).values({
      name: m.name, email: m.email, passwordHash,
      organizationId, defaultRoleId: roleIds[m.role], emailVerified: new Date(),
    });
  }
  console.log(`  ${MEMBERS.length + 1} users`);

  const [project] = await db
    .insert(projects)
    .values({
      organizationId,
      name: '○○橋梁上部工事（令和6年度）',
      code: 'R6-0412',
      contractType: 'public',
      status: 'active',
      clientName: '国土交通省 関東地方整備局',
      contractorName: ORG_NAME,
      location: '千葉県市川市',
      createdById: owner!.id,
    })
    .returning({ id: projects.id });
  const projectId = project!.id;

  await db.insert(projectMembers).values({
    projectId, userId: owner!.id, roleId: roleIds.owner, grantedById: owner!.id,
  });

  const [album] = await db
    .insert(albums)
    .values({ projectId, name: '施工状況写真', photoCategory: '施工状況写真', createdById: owner!.id })
    .returning({ id: albums.id });

  // 電子納品の適合チェックを画面で確認できるよう、1枚だけ署名不正にしておく。
  const CAPTIONS = [
    '施工前　配筋状況', '配筋　上端筋', '配筋　下端筋', 'かぶり厚さ測定',
    '型枠建込み状況', '型枠　締固め確認', 'コンクリート打設状況', 'バイブレータ締固め',
    '打設後　天端仕上げ', '養生状況', '脱型後　出来形確認', '完成状況',
  ];

  const rows: (typeof photos.$inferInsert)[] = [];
  for (let i = 0; i < CAPTIONS.length; i += 1) {
    const takenAt = new Date(Date.UTC(2026, 3, 28, 1, 15 + i * 5));
    const bytes = await makeSitePhoto(i, CAPTIONS[i]!, takenAt);
    const processed = await processPhoto(bytes);

    const photoId = randomUUID();
    const originalKey = storageKeys.photoOriginal(organizationId, projectId, photoId, 'jpg');
    const displayKey = storageKeys.photoDisplay(organizationId, projectId, photoId);
    const thumbKey = storageKeys.photoThumbnail(organizationId, projectId, photoId);

    await storage.put(originalKey, bytes, 'image/jpeg');
    await storage.put(displayKey, processed.display.buffer, 'image/jpeg');
    await storage.put(thumbKey, processed.thumbnail.buffer, 'image/jpeg');

    rows.push({
      id: photoId,
      organizationId,
      projectId,
      albumId: album!.id,
      storageKey: displayKey,
      originalStorageKey: originalKey,
      thumbnailKey: thumbKey,
      originalFilename: `DSC_${String(1000 + i).padStart(4, '0')}.JPG`,
      mimeType: 'image/jpeg',
      fileSize: bytes.byteLength,
      contentHash: processed.contentHash,
      takenAt: processed.exif.takenAt ?? takenAt,
      takenAtSource: processed.exif.takenAt ? 'exif' : 'upload',
      uploadedById: owner!.id,
      uploadSource: i % 5 === 4 ? ('import' as const) : ('mobile_camera' as const),
      width: processed.width,
      height: processed.height,
      category: '施工状況写真' as const,
      workType: '鉄筋工',
      workDetail: CAPTIONS[i]!,
      title: CAPTIONS[i]!,
      shootingLocation: `NO.${12 + i}+5.0m L側`,
      contractorNote: '配筋　D13 @200',
      integrityStatus: i === 9 ? ('invalid' as const) : ('valid' as const),
      jacicVersion: i === 9 ? null : 'Ver.1.1',
      sortOrder: i,
    });
  }
  await db.insert(photos).values(rows);

  const usedBytes = rows.reduce((sum, r) => sum + (r.fileSize ?? 0), 0);
  await db
    .update(organizations)
    .set({ storageUsedBytes: usedBytes })
    .where(eq(organizations.id, organizationId));

  await db.update(projects).set({ photoCount: rows.length }).where(eq(projects.id, projectId));
  await db.update(albums).set({ photoCount: rows.length }).where(eq(albums.id, album!.id));

  console.log(`  1 project, 1 album, ${rows.length} photos (画像ファイルも生成しました)`);
  console.log(`\nlogin: ${OWNER_EMAIL} / ${PASSWORD}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
