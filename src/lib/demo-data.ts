/**
 * Demo fixtures.
 *
 * The screens are wired to these while the Postgres container is unavailable in
 * this environment. Every shape mirrors the Drizzle schema in src/db/schema, so
 * swapping to live queries is a change of import, not a rewrite of the views.
 */
import type { Capability } from '@/lib/acl/capabilities';

export const demoOrg = {
  id: 'org-demo',
  name: '大和建設工業株式会社',
  storageUsedBytes: 128 * 1024 ** 3,
  storageQuotaBytes: 500 * 1024 ** 3,
  plan: 'genba_pro' as const,
};

export const demoUser = {
  id: 'user-1',
  name: '山田 太郎',
  email: 'taro.yamada@example.com',
  roleLabel: '管理者',
  avatarUrl: null as string | null,
  capabilities: new Set<Capability>([
    'project.view', 'project.create', 'project.edit', 'project.delete',
    'photo.view', 'photo.upload', 'photo.edit', 'photo.delete', 'photo.download',
    'album.view', 'album.create', 'album.edit',
    'blackboard.apply', 'blackboard.template.view', 'blackboard.template.manage',
    'export.excel', 'export.pdf', 'export.denshi_nouhin',
    'member.view', 'member.invite', 'member.manage', 'member.remove',
    'audit.view', 'org.settings', 'role.manage',
  ]),
};

export type DemoPhoto = {
  id: string;
  takenAt: Date;
  category: string;
  workDetail: string;
  source: '自アプリ' | '他アプリ連携' | '取り込み';
  analysed: boolean;
  /** Null when the JACIC signature is absent or fails — blocks 電子納品 output. */
  integrityValid: boolean | null;
  extracted: { projectName: string; part: string; content: string };
  thumbnailTone: string;
};

const TONES = ['#3F5A45', '#6B5B47', '#4A5568', '#5A6B52', '#6B6355', '#455A64'];

export const demoPhotos: DemoPhoto[] = Array.from({ length: 12 }, (_, i) => ({
  id: `photo-${i + 1}`,
  takenAt: new Date(Date.UTC(2026, 3, 28, 1, 15 + i)), // 10:15 JST onward
  category: '施工前',
  workDetail: '配筋',
  source: i % 5 === 4 ? '取り込み' : '自アプリ',
  analysed: i % 7 !== 6,
  integrityValid: i === 9 ? false : true,
  extracted: {
    projectName: '〇〇〇〇上新工事',
    part: 'R6.04.28',
    content: '配筋　D13 @200',
  },
  thumbnailTone: TONES[i % TONES.length]!,
}));

export const demoProject = {
  id: 'project-1',
  name: '○○橋梁上部工事（令和6年度）',
  code: 'R6-0412',
  contractType: 'public' as const,
  clientName: '国土交通省 関東地方整備局',
  contractorName: '大和建設工業株式会社',
  photoCount: 3256,
};

export const demoFilterTree = [
  {
    label: '工種・分類',
    items: [
      { label: '新築工事', count: 2858, children: [] },
      {
        label: '鉄筋工',
        count: 1254,
        children: [
          { label: '配筋', count: 632 },
          { label: '鉄筋組立', count: 428 },
          { label: '鉄筋検査', count: 194 },
        ],
      },
      { label: '型枠工', count: 842, children: [] },
      { label: 'コンクリート工', count: 645, children: [] },
      { label: '足場工', count: 245, children: [] },
      { label: 'その他', count: 270, children: [] },
    ],
  },
  {
    label: 'AI解析状態',
    items: [
      { label: 'すべて', count: 3256, children: [] },
      { label: 'AI解析済み', count: 2813, children: [] },
      { label: '未解析', count: 443, children: [] },
    ],
  },
  {
    label: '出所（写真の出どころ）',
    items: [
      { label: 'すべて', count: 3256, children: [] },
      { label: '自アプリで撮影', count: 2813, children: [] },
      { label: '他アプリから連携', count: 443, children: [] },
      { label: '取り込み（アップロード）', count: 443, children: [] },
    ],
  },
];

export const demoMembers = [
  { id: 'm1', name: '山田 太郎', email: 'taro.yamada@example.com', role: '管理者', roleKey: 'admin' as const, company: '大和建設工業', lastLogin: '2026-04-10', isSelf: true },
  { id: 'm2', name: '佐藤 花子', email: 'hanako.sato@example.com', role: '編集者', roleKey: 'editor' as const, company: '大和建設工業', lastLogin: '2026-04-10', isSelf: false },
  { id: 'm3', name: '鈴木 一郎', email: 'ichiro.suzuki@example.com', role: '閲覧者', roleKey: 'viewer' as const, company: '大和建設工業', lastLogin: '2026-04-10', isSelf: false },
  { id: 'm4', name: '高橋 美咲', email: 'misaki.takahashi@example.com', role: '編集者', roleKey: 'editor' as const, company: '大和建設工業', lastLogin: '2026-04-10', isSelf: false },
];
