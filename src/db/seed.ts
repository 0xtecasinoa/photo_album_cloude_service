/**
 * 開発用のシードデータ。
 *
 *   npm run db:seed
 *
 * 何度実行しても同じ結果になるよう、既存データがあれば作り直します。
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from './index';
import { organizations, users, projects, projectMembers, albums, photos } from './schema';
import { ensureSystemRoles, slugify } from '@/lib/auth/provision';

const ORG_NAME = '大和建設工業株式会社';
const OWNER_EMAIL = 'taro.yamada@example.com';
const PASSWORD = 'password1234';

const MEMBERS = [
  { name: '佐藤 花子', email: 'hanako.sato@example.com', role: 'editor' as const },
  { name: '鈴木 一郎', email: 'ichiro.suzuki@example.com', role: 'viewer' as const },
  { name: '高橋 美咲', email: 'misaki.takahashi@example.com', role: 'editor' as const },
];

async function main() {
  console.log('seeding…');

  // 既存の組織があれば消してから作り直す（関連レコードは cascade で消える）
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, ORG_NAME))
    .limit(1);
  if (existing) {
    await db.delete(organizations).where(eq(organizations.id, existing.id));
    console.log('  removed previous seed organization');
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name: ORG_NAME,
      slug: slugify('yamato-kensetsu'),
      plan: 'genba_pro',
      storageUsedBytes: 128 * 1024 ** 3,
      storageQuotaBytes: 500 * 1024 ** 3,
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
  const rows = Array.from({ length: 12 }, (_, i) => ({
    organizationId,
    projectId,
    albumId: album!.id,
    storageKey: `org/${organizationId}/project/${projectId}/photos/seed-${i + 1}/display.jpg`,
    originalFilename: `DSC_${String(1000 + i).padStart(4, '0')}.JPG`,
    mimeType: 'image/jpeg',
    fileSize: 2_400_000 + i * 1000,
    contentHash: `seed-${i + 1}-${'0'.repeat(48)}`.slice(0, 64),
    takenAt: new Date(Date.UTC(2026, 3, 28, 1, 15 + i * 5)),
    takenAtSource: 'exif',
    uploadedById: owner!.id,
    uploadSource: i % 5 === 4 ? ('import' as const) : ('mobile_camera' as const),
    width: 1200, height: 900,
    category: '施工状況写真' as const,
    workType: '鉄筋工',
    workDetail: '配筋',
    title: '施工前　配筋',
    shootingLocation: `NO.${12 + i}+5.0m L側`,
    contractorNote: '配筋　D13 @200',
    integrityStatus: i === 9 ? ('invalid' as const) : ('valid' as const),
    jacicVersion: i === 9 ? null : 'Ver.1.1',
    sortOrder: i,
  }));
  await db.insert(photos).values(rows);

  await db.update(projects).set({ photoCount: rows.length }).where(eq(projects.id, projectId));
  await db.update(albums).set({ photoCount: rows.length }).where(eq(albums.id, album!.id));

  console.log(`  1 project, 1 album, ${rows.length} photos`);
  console.log(`\nlogin: ${OWNER_EMAIL} / ${PASSWORD}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
