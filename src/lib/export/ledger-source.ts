import { demoProject, demoPhotos } from '@/lib/demo-data';
import type { LedgerData } from './types';
import type { Capability } from '@/lib/acl/capabilities';

/**
 * 出力対象データの取得。
 *
 * ここが実データベースへの唯一の接続点です。Postgres を起動したら、この 2 つの
 * 関数を Drizzle のクエリに差し替えるだけで、出力処理そのものは変更不要です。
 * （src/lib/acl の resolveProjectAccess と、photos / projects テーブルを使います）
 */

export async function loadLedgerData(_projectId: string): Promise<LedgerData> {
  // TODO(db): projects / photos テーブルから取得する。
  return {
    project: {
      name: demoProject.name,
      code: demoProject.code,
      clientName: demoProject.clientName,
      contractorName: demoProject.contractorName,
      isPublicWorks: demoProject.contractType === 'public',
    },
    photos: demoPhotos.map((p) => ({
      id: p.id,
      takenAt: p.takenAt,
      largeClass: '工事',
      category: p.category === '施工前' ? '施工状況写真' : p.category,
      workType: '鉄筋工',
      workDetail: p.workDetail,
      title: `${p.category}　${p.workDetail}`,
      shootingLocation: p.extracted.part,
      contractorNote: p.extracted.content,
      isRepresentative: false,
      integrityStatus: p.integrityValid === false ? ('invalid' as const) : ('valid' as const),
    })),
  };
}

/**
 * 利用者が対象現場で持つ権限。
 * TODO(db): resolveProjectAccess(userId, projectId) に置き換える。
 */
export async function loadCapabilities(
  _userId: string,
  _projectId: string,
): Promise<Set<Capability>> {
  const { demoUser } = await import('@/lib/demo-data');
  return demoUser.capabilities;
}
