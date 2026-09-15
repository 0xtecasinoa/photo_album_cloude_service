/**
 * 保存キーの構成。
 *
 * 環境変数に依存しない純粋な関数としてここに分けています。
 * 保存先の選択（index.ts）は env を読むため、キーの組み立てまで
 * 巻き込むと、設定なしでは単体テストもできなくなります。
 *
 * 先頭が組織IDなので、「この会社のデータを全部消す」も
 * ライフサイクル設定も、前方一致ひとつで済みます。
 */
export const storageKeys = {
  photoOriginal: (orgId: string, projectId: string, photoId: string, ext: string) =>
    `org/${orgId}/project/${projectId}/photos/${photoId}/original.${ext}`,
  photoDisplay: (orgId: string, projectId: string, photoId: string) =>
    `org/${orgId}/project/${projectId}/photos/${photoId}/display.jpg`,
  photoThumbnail: (orgId: string, projectId: string, photoId: string) =>
    `org/${orgId}/project/${projectId}/photos/${photoId}/thumb.jpg`,
  drawing: (orgId: string, projectId: string, drawingId: string, ext: string) =>
    `org/${orgId}/project/${projectId}/drawings/${drawingId}.${ext}`,
  blackboardPreview: (orgId: string, templateId: string) =>
    `org/${orgId}/blackboards/${templateId}/preview.png`,
  blackboardImportSource: (orgId: string, importId: string, ext: string) =>
    `org/${orgId}/blackboard-imports/${importId}/source.${ext}`,
  orgLogo: (orgId: string, ext: string) => `org/${orgId}/logo.${ext}`,
  userAvatar: (orgId: string, userId: string, ext: string) =>
    `org/${orgId}/users/${userId}/avatar.${ext}`,
  export: (orgId: string, exportId: string, filename: string) =>
    `org/${orgId}/exports/${exportId}/${filename}`,
};

/** 保存キーの先頭から組織IDを取り出す。配信時の権限確認に使う。 */
export function organizationIdFromKey(key: string): string | null {
  const m = /^org\/([0-9a-f-]{36})\//.exec(key);
  return m ? m[1]! : null;
}
