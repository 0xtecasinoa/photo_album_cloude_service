/**
 * 出力用の共通データ形。
 *
 * Excel・PDF・電子納品のいずれもこの形を受け取ります。呼び出し側がデータベース
 * から組み立てるか、テストがその場で作るかに関わらず、出力処理は同じ入力を見ます。
 */

export type LedgerProject = {
  /** 工事名称 */
  name: string;
  /** 工事番号 */
  code?: string | null;
  /** 発注者名 */
  clientName?: string | null;
  /** 請負者名 */
  contractorName?: string | null;
  /** 施工場所 */
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  /** 公共工事かどうか。電子納品の適合チェックを行うかの判断に使います。 */
  isPublicWorks?: boolean;
};

export type LedgerDrawing = {
  /** 参考図タイトル（日本語名として PHOTO.XML に記録されます） */
  name: string;
  bytes?: Buffer;
  /** 拡張子。既定は JPG。 */
  extension?: string;
};

export type LedgerPhoto = {
  id: string;
  /** 撮影年月日時 */
  takenAt: Date;
  /** 写真-大分類（工事／測量／調査／地質） */
  largeClass?: string | null;
  /** 写真区分（施工状況写真 など） */
  category?: string | null;
  workType?: string | null;   // 工種
  workKind?: string | null;   // 種別
  workDetail?: string | null; // 細別
  title?: string | null;      // 写真タイトル
  shootingLocation?: string | null; // 撮影箇所
  controlValue?: string | null;
  /** 出来形管理写真で対になる寸法。 */
  designValue?: string | null;
  measuredValue?: string | null;     // 施工管理値
  contractorNote?: string | null;   // 請負者説明文
  isRepresentative?: boolean;       // 代表写真
  isFrequencySubmission?: boolean;  // 提出頻度写真
  /** 参考図。電子納品では DRA フォルダに収録されます。 */
  referenceDrawings?: LedgerDrawing[];
  /** 画像本体。電子納品では無変換のまま収録します。 */
  bytes?: Buffer;
  /** 元ファイル名 */
  originalFilename?: string | null;
  /** JACIC 署名の検証結果。'valid' 以外は電子納品に含められません。 */
  integrityStatus?: 'unsigned' | 'pending' | 'valid' | 'invalid' | 'error';
  width?: number | null;
  height?: number | null;
};

export type LedgerData = {
  project: LedgerProject;
  photos: LedgerPhoto[];
};

/** 1ページあたりの写真枚数。工事写真台帳の一般的な体裁。 */
export type PhotosPerPage = 1 | 3 | 4 | 6;
