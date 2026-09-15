import 'dotenv/config';
import { isNull } from 'drizzle-orm';
import { db } from '@/db';
import { projects } from '@/db/schema/project';
import { photoFacets, listPhotos } from '@/lib/queries/photos';

const [p] = await db.select({ id: projects.id }).from(projects).where(isNull(projects.deletedAt)).limit(1);
const f = await photoFacets(p!.id);
console.log('合計:', f.total);
console.log('工種ツリー:', JSON.stringify(f.byWorkType, null, 1).slice(0, 300));
console.log('AI解析:', f.byOcr);
console.log('タグ:', f.byTag);
console.log('検索「配筋」:', (await listPhotos(p!.id, { query: '配筋' })).length, '件');
console.log('検索「かぶり」:', (await listPhotos(p!.id, { query: 'かぶり' })).length, '件');
console.log('並び替え(新しい順)先頭:', (await listPhotos(p!.id, { sort: 'takenDesc' }))[0]?.title);
console.log('並び替え(古い順)先頭  :', (await listPhotos(p!.id, { sort: 'takenAsc' }))[0]?.title);
process.exit(0);
