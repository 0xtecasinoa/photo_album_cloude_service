/**
 * Capability catalogue.
 *
 * This is the BOX replacement: every action a user can take is a named capability,
 * granted per-project via a role. Nothing in the app checks "is admin" — it checks
 * "has capability", so customers can build their own roles without code changes.
 */

export const CAPABILITIES = [
  // 現場 / 工事
  'project.view',
  'project.create',
  'project.edit',
  'project.delete',
  'project.archive',

  // 写真
  'photo.view',
  'photo.upload',
  'photo.edit', // metadata + re-applying a blackboard
  'photo.delete',
  'photo.restore',
  'photo.download',

  // 工事写真台帳 / アルバム
  'album.view',
  'album.create',
  'album.edit',
  'album.delete',
  'album.reorder',

  // 電子小黒板
  'blackboard.apply',
  'blackboard.template.view',
  'blackboard.template.manage',

  // 出力
  'export.excel',
  'export.pdf',
  'export.denshi_nouhin', // 電子納品 (PHOTO.XML + PIC/DRA)

  // 図面
  'drawing.view',
  'drawing.upload',
  'drawing.delete',

  // メンバー
  'member.view',
  'member.invite',
  'member.manage',
  'member.remove',

  // 外部共有
  'share.create',
  'share.revoke',

  // 組織
  'audit.view',
  'org.settings',
  'org.billing',
  'role.manage',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_LABELS_JA: Record<Capability, string> = {
  'project.view': '現場を閲覧',
  'project.create': '現場を作成',
  'project.edit': '現場を編集',
  'project.delete': '現場を削除',
  'project.archive': '現場を完了・保管',
  'photo.view': '写真を閲覧',
  'photo.upload': '写真をアップロード',
  'photo.edit': '写真情報を編集',
  'photo.delete': '写真を削除',
  'photo.restore': '削除した写真を復元',
  'photo.download': '写真をダウンロード',
  'album.view': '台帳を閲覧',
  'album.create': '台帳を作成',
  'album.edit': '台帳を編集',
  'album.delete': '台帳を削除',
  'album.reorder': '台帳の並び替え',
  'blackboard.apply': '黒板を写真に適用',
  'blackboard.template.view': '黒板テンプレートを閲覧',
  'blackboard.template.manage': '黒板テンプレートを管理',
  'export.excel': 'Excel出力',
  'export.pdf': 'PDF出力',
  'export.denshi_nouhin': '電子納品出力',
  'drawing.view': '図面を閲覧',
  'drawing.upload': '図面をアップロード',
  'drawing.delete': '図面を削除',
  'member.view': 'メンバーを閲覧',
  'member.invite': 'メンバーを招待',
  'member.manage': 'メンバーの権限を変更',
  'member.remove': 'メンバーを削除',
  'share.create': '外部共有リンクを発行',
  'share.revoke': '外部共有リンクを失効',
  'audit.view': '監査ログを閲覧',
  'org.settings': '組織設定を変更',
  'org.billing': '請求情報を管理',
  'role.manage': 'ロールを管理',
};

/** Grouping used by the role editor UI. */
export const CAPABILITY_GROUPS: { key: string; labelJa: string; caps: Capability[] }[] = [
  { key: 'project', labelJa: '現場', caps: ['project.view', 'project.create', 'project.edit', 'project.delete', 'project.archive'] },
  { key: 'photo', labelJa: '写真', caps: ['photo.view', 'photo.upload', 'photo.edit', 'photo.delete', 'photo.restore', 'photo.download'] },
  { key: 'album', labelJa: '工事写真台帳', caps: ['album.view', 'album.create', 'album.edit', 'album.delete', 'album.reorder'] },
  { key: 'blackboard', labelJa: '電子小黒板', caps: ['blackboard.apply', 'blackboard.template.view', 'blackboard.template.manage'] },
  { key: 'export', labelJa: '出力', caps: ['export.excel', 'export.pdf', 'export.denshi_nouhin'] },
  { key: 'drawing', labelJa: '図面', caps: ['drawing.view', 'drawing.upload', 'drawing.delete'] },
  { key: 'member', labelJa: 'メンバー', caps: ['member.view', 'member.invite', 'member.manage', 'member.remove'] },
  { key: 'share', labelJa: '外部共有', caps: ['share.create', 'share.revoke'] },
  { key: 'org', labelJa: '組織', caps: ['audit.view', 'org.settings', 'org.billing', 'role.manage'] },
];

/**
 * Built-in roles. Customers can clone these into custom roles.
 * `slug` is stable and referenced by seeds and migrations — do not rename.
 */
export const SYSTEM_ROLES = {
  owner: {
    slug: 'owner',
    nameJa: 'オーナー',
    descriptionJa: '請求を含むすべての操作が可能です。',
    capabilities: [...CAPABILITIES],
  },
  admin: {
    slug: 'admin',
    nameJa: '管理者',
    descriptionJa: '請求以外のすべての操作が可能です。',
    capabilities: CAPABILITIES.filter((c) => c !== 'org.billing'),
  },
  manager: {
    slug: 'manager',
    nameJa: '現場監督',
    descriptionJa: '担当現場のすべてを管理できます。組織設定は変更できません。',
    capabilities: [
      'project.view', 'project.create', 'project.edit', 'project.archive',
      'photo.view', 'photo.upload', 'photo.edit', 'photo.delete', 'photo.restore', 'photo.download',
      'album.view', 'album.create', 'album.edit', 'album.delete', 'album.reorder',
      'blackboard.apply', 'blackboard.template.view', 'blackboard.template.manage',
      'export.excel', 'export.pdf', 'export.denshi_nouhin',
      'drawing.view', 'drawing.upload', 'drawing.delete',
      'member.view', 'member.invite',
      'share.create', 'share.revoke',
    ] as Capability[],
  },
  editor: {
    slug: 'editor',
    nameJa: '編集者',
    descriptionJa: '写真の追加・編集・出力ができます。削除はできません。',
    capabilities: [
      'project.view',
      'photo.view', 'photo.upload', 'photo.edit', 'photo.download',
      'album.view', 'album.create', 'album.edit', 'album.reorder',
      'blackboard.apply', 'blackboard.template.view',
      'export.excel', 'export.pdf',
      'drawing.view', 'drawing.upload',
      'member.view',
    ] as Capability[],
  },
  photographer: {
    slug: 'photographer',
    nameJa: '撮影者',
    descriptionJa: '写真のアップロードと閲覧のみ。削除・出力はできません。',
    capabilities: [
      'project.view',
      'photo.view', 'photo.upload',
      'album.view',
      'blackboard.apply', 'blackboard.template.view',
      'drawing.view',
    ] as Capability[],
  },
  viewer: {
    slug: 'viewer',
    nameJa: '閲覧者',
    descriptionJa: '閲覧とダウンロードのみ可能です。',
    capabilities: [
      'project.view',
      'photo.view', 'photo.download',
      'album.view',
      'blackboard.template.view',
      'drawing.view',
    ] as Capability[],
  },
  partner: {
    slug: 'partner',
    nameJa: '協力会社',
    descriptionJa: '指定された現場の閲覧のみ。ダウンロードはできません。',
    capabilities: [
      'project.view',
      'photo.view',
      'album.view',
      'drawing.view',
    ] as Capability[],
  },
} as const;

export type SystemRoleSlug = keyof typeof SYSTEM_ROLES;
export const SYSTEM_ROLE_SLUGS = Object.keys(SYSTEM_ROLES) as SystemRoleSlug[];
