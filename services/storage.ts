import { AppData, VoteLevel1 } from '../types';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, runTransaction } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

const LOCAL_KEY = 'DANG_VIEN_VOTE_DB_V2_PRO';

// Khởi tạo dữ liệu mặc định
const INITIAL_DATA: AppData = {
  voters: [],
  candidatesP1: [],
  candidatesP2: [],
  votesP1: [],
  votesP2: [],
  config: {
    maxExcellentVotes: 5,
    isPhase1Open: true,
    isPhase2Open: true,
    p1Display: {
      showCCCD: false,
      showMSSV: true,
      showNgayVaoDang: false,
      showLoaiDangVien: true,
      showNhom: true,
      showKhoa: true,
      showChucVu: true,
      showDiemHT: true,
      showDiemRL: true,
      showThanhTich: false,
      showTuDanhGia: true,
    },
    p2Display: {
      showCCCD: false,
      showMSSV: true,
      showNgayVaoDang: false,
      showLoaiDangVien: false,
      showNhom: true,
      showKhoa: true,
      showChucVu: true,
      showDiemHT: true,
      showDiemRL: true,
      showThanhTich: false,
      showChiBoDeXuat: true,
    }
  }
};

// Biến lưu trữ cục bộ (Cache) để render UI nhanh
let _inMemoryDB: AppData = JSON.parse(JSON.stringify(INITIAL_DATA));
let _isCloudConnected = false;
let _db: any = null;

// --- Helper Functions ---
const normalize = (val: any) => String(val || '').trim();
const notifyUpdate = () => window.dispatchEvent(new Event('db_update'));

// Hàm xử lý lỗi chung
const handleFirebaseError = (e: any) => {
    console.error("Firebase Error:", e);
    const msg = (e.message || JSON.stringify(e)).toLowerCase();
    
    if (msg.includes("permission_denied") || msg.includes("permission denied")) {
        // Dùng setTimeout để đảm bảo alert hiện ra sau khi UI load
        setTimeout(() => {
            alert(
                "LỖI QUYỀN TRUY CẬP (PERMISSION DENIED)!\n\n" +
                "Nguyên nhân: Firebase Database đang chặn ứng dụng đọc/ghi dữ liệu.\n\n" +
                "CÁCH KHẮC PHỤC:\n" +
                "1. Vào Firebase Console (console.firebase.google.com)\n" +
                "2. Chọn Project -> Realtime Database -> Tab 'Rules'\n" +
                "3. Xóa hết code cũ và dán đoạn sau:\n\n" +
                `{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}\n\n` +
                "4. Bấm 'Publish' (Xuất bản)"
            );
        }, 1000);
    } else {
        console.warn("Lỗi kết nối Cloud khác: " + msg);
    }
};

// --- Initialization ---
// Hàm này tự động chạy khi import file, thiết lập kết nối
const initStorage = () => {
    if (isFirebaseConfigured()) {
        try {
            console.log("Đang kết nối Firebase...");
            const app = initializeApp(firebaseConfig);
            
            // Tự động đăng nhập ẩn danh để vượt qua các rules yêu cầu "auth != null"
            const auth = getAuth(app);
            signInAnonymously(auth).then(() => {
                console.log("Đã đăng nhập ẩn danh vào Firebase.");
            }).catch(e => {
                console.warn("Lỗi đăng nhập ẩn danh (Có thể chưa bật Anonymous Provider):", e);
                // Không throw error ở đây vì nếu Rules là public (.read: true) thì vẫn chạy được
            });

            _db = getDatabase(app);
            const dbRef = ref(_db, 'app_data');

            // Lắng nghe dữ liệu thay đổi từ Server (Realtime)
            onValue(dbRef, (snapshot) => {
                const val = snapshot.val();
                if (val) {
                    // Merge config migration logic nếu cần thiết
                    _inMemoryDB = { ...INITIAL_DATA, ...val, config: { ...INITIAL_DATA.config, ...val.config } };
                    // Fix migration cho display config nếu thiếu field
                    _inMemoryDB.config.p1Display = { ...INITIAL_DATA.config.p1Display, ...val.config?.p1Display };
                    _inMemoryDB.config.p2Display = { ...INITIAL_DATA.config.p2Display, ...val.config?.p2Display };
                    
                    // Đảm bảo array không null
                    _inMemoryDB.voters = Array.isArray(_inMemoryDB.voters) ? _inMemoryDB.voters : [];
                    _inMemoryDB.votesP1 = Array.isArray(_inMemoryDB.votesP1) ? _inMemoryDB.votesP1 : [];
                    _inMemoryDB.votesP2 = Array.isArray(_inMemoryDB.votesP2) ? _inMemoryDB.votesP2 : [];
                    
                    console.log("Đã đồng bộ dữ liệu từ Cloud");
                } else {
                    console.log("Cloud chưa có dữ liệu, dùng mặc định.");
                }
                _isCloudConnected = true;
                notifyUpdate();
            }, (error) => {
                console.error("Lỗi đọc dữ liệu:", error);
                // Xử lý lỗi permission ngay khi init
                handleFirebaseError(error);
            });
        } catch (e) {
            console.error("Lỗi kết nối Firebase Init:", e);
            loadFromLocal();
        }
    } else {
        console.warn("Chưa cấu hình Firebase. Sử dụng LocalStorage (Chỉ offline).");
        loadFromLocal();
    }
};

const loadFromLocal = () => {
    try {
        const str = localStorage.getItem(LOCAL_KEY);
        if (str) {
            const parsed = JSON.parse(str);
            _inMemoryDB = { ...INITIAL_DATA, ...parsed };
        }
        notifyUpdate();
    } catch (e) { console.error(e); }
};

// Gọi init ngay lập tức
initStorage();

// --- Public API ---

export const hasData = (): boolean => {
    return _inMemoryDB.voters.length > 0;
};

// Hàm này vẫn Synchronous để UI render không bị lỗi
export const getDB = (): AppData => {
    return JSON.parse(JSON.stringify(_inMemoryDB));
};

// Hàm lưu dữ liệu (Admin dùng): Ghi đè toàn bộ DB
export const saveDB = async (data: AppData): Promise<boolean> => {
    // Cập nhật local cache ngay lập tức để UI mượt
    _inMemoryDB = data;
    notifyUpdate();

    if (isFirebaseConfigured() && _db) {
        try {
            await set(ref(_db, 'app_data'), data);
            return true;
        } catch (e) {
            handleFirebaseError(e);
            return false;
        }
    } else {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
        return true;
    }
};

// Hàm đặc biệt: Bắt buộc đẩy dữ liệu hiện tại (trong RAM/Local) lên Cloud
export const forcePushToCloud = async (): Promise<{success: boolean, message: string}> => {
    if (!isFirebaseConfigured() || !_db) {
        return { success: false, message: "Chưa kết nối được Firebase." };
    }

    try {
        console.log("Đang bắt buộc đẩy dữ liệu lên Cloud...");
        const dataToPush = getDB(); // Lấy dữ liệu hiện tại (đang có ở local)
        await set(ref(_db, 'app_data'), dataToPush);
        return { success: true, message: "Đã đồng bộ thành công! Người khác có thể thấy dữ liệu ngay bây giờ." };
    } catch (e: any) {
        handleFirebaseError(e);
        return { success: false, message: "Lỗi: " + (e.message || "Không xác định") };
    }
};

export const resetDB = async (silent = false) => {
    if (silent || confirm("CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu trên hệ thống?")) {
        await saveDB(JSON.parse(JSON.stringify(INITIAL_DATA)));
        if (!silent) window.location.reload();
    }
};

// --- Granular Reset Functions ---
export const resetPhase1 = async (): Promise<boolean> => {
    const db = getDB();
    db.candidatesP1 = [];
    db.votesP1 = [];
    db.voters = db.voters.map(v => ({ ...v, hasVotedPhase1: false }));
    return await saveDB(db);
};

export const resetPhase2 = async (): Promise<boolean> => {
    const db = getDB();
    db.candidatesP2 = [];
    db.votesP2 = [];
    db.voters = db.voters.map(v => ({ ...v, hasVotedPhase2: false }));
    return await saveDB(db);
};

export const resetVotersOnly = async (): Promise<boolean> => {
    const db = getDB();
    db.voters = [];
    db.votesP1 = [];
    db.votesP2 = [];
    return await saveDB(db);
};

// --- Voting Logic (Transactional) ---

export const castVoteP1 = async (voterCCCD: string, votes: { candidateCCCD: string, level: VoteLevel1 }[]): Promise<boolean> => {
    const safeVoterID = normalize(voterCCCD);

    if (isFirebaseConfigured() && _db) {
        // Transaction để tránh xung đột khi nhiều người vote cùng lúc
        try {
            await runTransaction(ref(_db, 'app_data'), (currentData) => {
                if (!currentData) return currentData; // Abort nếu data null

                // 1. Update trạng thái Voter
                if (currentData.voters) {
                    const vIdx = currentData.voters.findIndex((v: any) => normalize(v.cccd) === safeVoterID);
                    if (vIdx !== -1) currentData.voters[vIdx].hasVotedPhase1 = true;
                }

                // 2. Update VotesP1
                if (!Array.isArray(currentData.votesP1)) currentData.votesP1 = [];
                
                // Xóa vote cũ của user này
                currentData.votesP1 = currentData.votesP1.filter((v: any) => normalize(v.voterCCCD) !== safeVoterID);
                
                // Thêm vote mới
                votes.forEach(v => {
                    currentData.votesP1.push({
                        voterCCCD: safeVoterID,
                        candidateCCCD: normalize(v.candidateCCCD),
                        level: v.level
                    });
                });

                return currentData;
            });
            return true;
        } catch (e) {
            handleFirebaseError(e);
            return false;
        }
    } else {
        // Fallback Local
        const db = getDB();
        const voterIdx = db.voters.findIndex(v => normalize(v.cccd) === safeVoterID);
        if (voterIdx === -1) return false;

        db.voters[voterIdx].hasVotedPhase1 = true;
        db.votesP1 = db.votesP1.filter(v => normalize(v.voterCCCD) !== safeVoterID);
        votes.forEach(v => {
            db.votesP1.push({ voterCCCD: safeVoterID, candidateCCCD: normalize(v.candidateCCCD), level: v.level });
        });
        return await saveDB(db);
    }
};

export const castVoteP2 = async (voterCCCD: string, selectedCandidatesCCCD: string[]): Promise<boolean> => {
    const safeVoterID = normalize(voterCCCD);

    if (isFirebaseConfigured() && _db) {
        try {
            await runTransaction(ref(_db, 'app_data'), (currentData) => {
                if (!currentData) return currentData;

                if (currentData.voters) {
                    const vIdx = currentData.voters.findIndex((v: any) => normalize(v.cccd) === safeVoterID);
                    if (vIdx !== -1) currentData.voters[vIdx].hasVotedPhase2 = true;
                }

                if (!Array.isArray(currentData.votesP2)) currentData.votesP2 = [];
                currentData.votesP2 = currentData.votesP2.filter((v: any) => normalize(v.voterCCCD) !== safeVoterID);
                
                selectedCandidatesCCCD.forEach(c => {
                    currentData.votesP2.push({
                        voterCCCD: safeVoterID,
                        candidateCCCD: normalize(c)
                    });
                });

                return currentData;
            });
            return true;
        } catch (e) {
            handleFirebaseError(e);
            return false;
        }
    } else {
        const db = getDB();
        const voterIdx = db.voters.findIndex(v => normalize(v.cccd) === safeVoterID);
        if (voterIdx === -1) return false;

        db.voters[voterIdx].hasVotedPhase2 = true;
        db.votesP2 = db.votesP2.filter(v => normalize(v.voterCCCD) !== safeVoterID);
        selectedCandidatesCCCD.forEach(c => {
            db.votesP2.push({ voterCCCD: safeVoterID, candidateCCCD: normalize(c) });
        });
        return await saveDB(db);
    }
};