export enum VoteLevel1 {
  KHONG_HOAN_THANH = "Không hoàn thành",
  HOAN_THANH = "Hoàn thành",
  HOAN_THANH_TOT = "Hoàn thành tốt"
}

export interface Voter {
  cccd: string;
  mssv: string;
  hoTen: string;
  ngayVaoDang: string;
  loaiDangVien: string; // Chính thức / Dự bị
  nhom: string;
  hasVotedPhase1?: boolean;
  hasVotedPhase2?: boolean;
}

export interface CandidatePhase1 extends Voter {
  khoa: string;
  chucVu: string;
  diemHT: number;
  diemRL: number;
  thanhTich: string;
  tuDanhGia: string; // New field: Tự đánh giá mức độ HTNV
}

export interface CandidatePhase2 extends CandidatePhase1 {
  chiBoDeXuat: string; // Mức hoàn thành đề xuất
}

// Storage for results
export interface VoteRecordPhase1 {
  voterCCCD: string;
  candidateCCCD: string;
  level: VoteLevel1;
}

export interface VoteRecordPhase2 {
  voterCCCD: string;
  candidateCCCD: string;
}

export interface Phase1DisplayConfig {
  showCCCD: boolean;
  showMSSV: boolean;
  showNgayVaoDang: boolean;
  showLoaiDangVien: boolean;
  showNhom: boolean;
  showKhoa: boolean;
  showChucVu: boolean;
  showDiemHT: boolean;
  showDiemRL: boolean;
  showThanhTich: boolean;
  showTuDanhGia: boolean;
}

export interface Phase2DisplayConfig {
  showCCCD: boolean;
  showMSSV: boolean;
  showNgayVaoDang: boolean;
  showLoaiDangVien: boolean;
  showNhom: boolean;
  showKhoa: boolean;
  showChucVu: boolean;
  showDiemHT: boolean;
  showDiemRL: boolean;
  showThanhTich: boolean;
  showChiBoDeXuat: boolean;
}

export interface SystemConfig {
  maxExcellentVotes: number; // Max votes for Phase 2
  isPhase1Open: boolean;
  isPhase2Open: boolean;
  p1Display: Phase1DisplayConfig;
  p2Display: Phase2DisplayConfig;
}

// Data store shape
export interface AppData {
  voters: Voter[];
  candidatesP1: CandidatePhase1[];
  candidatesP2: CandidatePhase2[];
  votesP1: VoteRecordPhase1[];
  votesP2: VoteRecordPhase2[];
  config: SystemConfig;
}