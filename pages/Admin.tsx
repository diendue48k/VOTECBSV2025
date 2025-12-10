import React, { useState, useEffect } from 'react';
import { getDB, saveDB, resetDB, resetPhase1, resetPhase2, resetVotersOnly, forcePushToCloud } from '../services/storage';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import { readVoters, readCandidatesP1, readCandidatesP2, exportToExcel, exportVoteAudit, downloadTemplate } from '../services/excel';
import { AppData, VoteLevel1, Phase1DisplayConfig, Phase2DisplayConfig, Voter } from '../types';
import { Button } from '../components/ui/Button';
import { Upload, Download, Trash2, Users, Settings, Activity, Lock, ShieldCheck, Search, FileSpreadsheet, Star, LayoutGrid, ToggleLeft, ToggleRight, Save, AlertTriangle, X, AlertCircle, Filter, CheckCircle, MinusCircle, Cloud, CloudOff, RefreshCw, Eye, List } from 'lucide-react';

interface AdminPageProps {
  onBack: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [data, setData] = useState<AppData>(getDB());
  // Tabs: system, p1, p2
  const [activeTab, setActiveTab] = useState<'system' | 'p1' | 'p2'>('system');
  const [notification, setNotification] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Search state for tables
  const [searchTerm, setSearchTerm] = useState('');
  // Filter for Voter Tracking
  const [voterFilter, setVoterFilter] = useState<'all' | 'p1_done' | 'p1_not' | 'p2_done' | 'p2_not'>('all');

  // Reset Configuration State
  const [resetConfig, setResetConfig] = useState<{isOpen: boolean, type: 'full' | 'voters' | 'p1' | 'p2'}>({isOpen: false, type: 'full'});
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');

  // Inspector State (Soi phiếu)
  const [inspectVoter, setInspectVoter] = useState<Voter | null>(null);

  const isOnline = isFirebaseConfigured();

  useEffect(() => {
    const load = () => setData(getDB());
    window.addEventListener('db_update', load);
    return () => window.removeEventListener('db_update', load);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Mật khẩu không chính xác');
    }
  };

  const showNotify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };
  
  const updateConfig = async (key: keyof typeof data.config, value: any) => {
    const db = getDB();
    db.config = { ...db.config, [key]: value };
    await saveDB(db); setData(db); showNotify("Đã lưu cấu hình.");
  };

  const updateP1Display = async (field: keyof Phase1DisplayConfig, value: boolean) => {
    const db = getDB();
    db.config.p1Display[field] = value;
    await saveDB(db); setData(db);
  }

  const updateP2Display = async (field: keyof Phase2DisplayConfig, value: boolean) => {
    const db = getDB();
    db.config.p2Display[field] = value;
    await saveDB(db); setData(db);
  }

  const handleForceSync = async () => {
     if (!confirm("Hành động này sẽ lấy dữ liệu từ máy của BẠN và ghi đè lên Cloud. Hãy chắc chắn dữ liệu trên máy bạn là chuẩn nhất.")) return;
     
     setIsSyncing(true);
     const res = await forcePushToCloud();
     setIsSyncing(false);
     
     if (res.success) {
         showNotify("Đồng bộ thành công!");
         alert(res.message);
     } else {
         showNotify("Đồng bộ thất bại");
         alert(res.message);
     }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'voters' | 'p1' | 'p2') => {
    if (!e.target.files?.[0]) return;
    try {
      const file = e.target.files[0];
      const db = getDB();
      if (type === 'voters') {
        const newVoters = await readVoters(file);
        const merged = newVoters.map(nv => {
             const exist = db.voters.find(ev => String(ev.cccd).trim() === String(nv.cccd).trim());
             return exist ? { ...nv, hasVotedPhase1: exist.hasVotedPhase1, hasVotedPhase2: exist.hasVotedPhase2 } : nv;
        });
        db.voters = merged;
      } else if (type === 'p1') {
        db.candidatesP1 = await readCandidatesP1(file);
      } else {
        db.candidatesP2 = await readCandidatesP2(file);
      }
      await saveDB(db); setData(db); showNotify("Import dữ liệu thành công!");
    } catch (e) { showNotify("Lỗi đọc file Excel."); }
    e.target.value = '';
  };

  // --- Secure Reset Logic ---
  const triggerReset = (type: 'full' | 'voters' | 'p1' | 'p2') => {
      setResetConfig({ isOpen: true, type });
      setResetPassword('');
      setResetError('');
  };

  const handleSecureReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (resetPassword === 'admin123') {
          // Perform Reset based on type
          if (resetConfig.type === 'full') await resetDB(true);
          else if (resetConfig.type === 'voters') await resetVotersOnly();
          else if (resetConfig.type === 'p1') await resetPhase1();
          else if (resetConfig.type === 'p2') await resetPhase2();

          setData(getDB()); // reload local state
          setResetConfig({ ...resetConfig, isOpen: false });
          showNotify("Đã xóa dữ liệu thành công.");
      } else {
          setResetError("Mật khẩu xác nhận không đúng!");
      }
  };

  const getResetMessage = () => {
    switch(resetConfig.type) {
        case 'voters': return "Hành động này sẽ xóa toàn bộ DANH SÁCH CỬ TRI và KẾT QUẢ BẦU CỬ hiện tại. Dữ liệu ứng viên sẽ được giữ lại.";
        case 'p1': return "Hành động này sẽ xóa toàn bộ ỨNG VIÊN PHẦN 1 và KẾT QUẢ ĐÁNH GIÁ P1. Trạng thái 'đã vote' của cử tri sẽ được reset.";
        case 'p2': return "Hành động này sẽ xóa toàn bộ ỨNG VIÊN PHẦN 2 và KẾT QUẢ BÌNH BẦU P2. Trạng thái 'đã vote' của cử tri sẽ được reset.";
        default: return "Hành động này sẽ XÓA VĨNH VIỄN toàn bộ Cử tri, Ứng viên và Kết quả phiếu bầu hiện tại.";
    }
  };

  // --- Helpers for Results ---
  const getP1Stats = (candidateId: string) => {
     const votes = data.votesP1.filter(v => String(v.candidateCCCD).trim() === String(candidateId).trim());
     return {
        kht: votes.filter(v => v.level === VoteLevel1.KHONG_HOAN_THANH).length,
        ht: votes.filter(v => v.level === VoteLevel1.HOAN_THANH).length,
        htt: votes.filter(v => v.level === VoteLevel1.HOAN_THANH_TOT).length,
        total: votes.length
     };
  };

  const handleExportP1 = () => {
    const exportData = data.candidatesP1.map(c => {
      const stats = getP1Stats(c.cccd);
      const total = stats.total || 1;
      const fmt = (val: number) => `${val} (${((val/total)*100).toFixed(1)}%)`;

      return {
        'Mã ĐD (CCCD)': c.cccd,
        'MSSV': c.mssv,
        'Họ Tên': c.hoTen,
        'Ngày vào Đảng': c.ngayVaoDang,
        'Loại ĐV': c.loaiDangVien,
        'Chi bộ/Nhóm': c.nhom,
        'Đơn vị (Khóa)': c.khoa,
        'Chức vụ': c.chucVu,
        'Điểm HT': c.diemHT,
        'Điểm RL': c.diemRL,
        'Thành tích': c.thanhTich,
        'Tự đánh giá': c.tuDanhGia,
        // Vote Result with Percentage
        'K.Hoàn Thành': fmt(stats.kht),
        'Hoàn Thành': fmt(stats.ht),
        'HT Tốt': fmt(stats.htt),
        'Tổng phiếu': stats.total
      };
    });
    exportToExcel(exportData, `Ket_Qua_Danh_Gia_P1_${new Date().getTime()}`);
  };

  const handleExportP2 = () => {
    const maxVotes = data.voters.filter(v => v.hasVotedPhase2).length || 1;
    const exportData = (data.candidatesP2 || []).map(c => {
      const votes = data.votesP2.filter(v => String(v.candidateCCCD).trim() === String(c.cccd).trim()).length;
      const percent = ((votes / maxVotes) * 100).toFixed(2) + '%';
      return {
         'Mã ĐD (CCCD)': c.cccd,
         'MSSV': c.mssv,
         'Họ Tên': c.hoTen,
         'Ngày vào Đảng': c.ngayVaoDang,
         'Loại ĐV': c.loaiDangVien,
         'Chi bộ/Nhóm': c.nhom,
         'Đơn vị (Khóa)': c.khoa,
         'Chức vụ': c.chucVu,
         'Điểm HT': c.diemHT,
         'Điểm RL': c.diemRL,
         'Thành tích': c.thanhTich,
         'Chi bộ đề xuất': c.chiBoDeXuat,
         // Vote Result
         'Số phiếu bầu': votes,
         'Tỷ lệ đạt': percent
      };
    }).sort((a,b) => b['Số phiếu bầu'] - a['Số phiếu bầu']);
    exportToExcel(exportData, `Ket_Qua_Binh_Bau_P2_${new Date().getTime()}`);
  };

  const handleExportAudit = () => {
      exportVoteAudit(data, `Chi_Tiet_Lich_Su_Bau_${new Date().getTime()}`);
  }
  
  const handleExportVoterStatus = () => {
      const exportData = data.voters.map(v => ({
          'CCCD': v.cccd,
          'MSSV': v.mssv,
          'Họ Tên': v.hoTen,
          'Ngày Vào Đảng': v.ngayVaoDang,
          'Chi Bộ': v.nhom,
          'Trạng thái P1': v.hasVotedPhase1 ? 'Đã Vote' : 'Chưa',
          'Trạng thái P2': v.hasVotedPhase2 ? 'Đã Vote' : 'Chưa'
      }));
      exportToExcel(exportData, `Trang_Thai_Cu_Tri_${new Date().getTime()}`);
  };

  // --- Inspector Logic ---
  const getVoterHistory = (voter: Voter) => {
      const p1 = data.votesP1.filter(v => v.voterCCCD === voter.cccd).map(v => {
          const candidate = data.candidatesP1.find(c => c.cccd === v.candidateCCCD);
          return { name: candidate?.hoTen || v.candidateCCCD, level: v.level };
      });
      const p2 = data.votesP2.filter(v => v.voterCCCD === voter.cccd).map(v => {
          const candidate = data.candidatesP2.find(c => c.cccd === v.candidateCCCD);
          return { name: candidate?.hoTen || v.candidateCCCD };
      });
      return { p1, p2 };
  };

  // --- Sub-Components ---

  const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between group hover:border-${color}-200 transition-all`}>
        <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className={`text-2xl font-black text-${color}-600`}>{value}</h3>
            {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-full bg-${color}-50 text-${color}-600`}>
            <Icon className="w-6 h-6" />
        </div>
    </div>
  );

  const CheckboxItemP1 = ({ label, field }: { label: string, field: keyof Phase1DisplayConfig }) => (
    <label className="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
       <input 
         type="checkbox" 
         className="rounded text-[#BE1E2D] focus:ring-red-500" 
         checked={data.config.p1Display[field]}
         onChange={(e) => updateP1Display(field, e.target.checked)}
       />
       <span className="text-sm text-gray-700 font-medium">{label}</span>
    </label>
 );

 const CheckboxItemP2 = ({ label, field }: { label: string, field: keyof Phase2DisplayConfig }) => (
    <label className="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
       <input 
         type="checkbox" 
         className="rounded text-yellow-600 focus:ring-yellow-500" 
         checked={data.config.p2Display[field]}
         onChange={(e) => updateP2Display(field, e.target.checked)}
       />
       <span className="text-sm text-gray-700 font-medium">{label}</span>
    </label>
 );

  const SystemTab = () => {
      // Filter Voters Logic
      const filteredVoters = data.voters.filter(v => {
          const matchSearch = v.hoTen.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              v.mssv.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              v.cccd.includes(searchTerm);
          if (!matchSearch) return false;

          if (voterFilter === 'p1_done') return v.hasVotedPhase1;
          if (voterFilter === 'p1_not') return !v.hasVotedPhase1;
          if (voterFilter === 'p2_done') return v.hasVotedPhase2;
          if (voterFilter === 'p2_not') return !v.hasVotedPhase2;
          return true;
      });

      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Tổng Cử Tri" value={data.voters.length} subtext="Số lượng đảng viên trong hệ thống" icon={Users} color="gray" />
                <div className="md:col-span-2 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white flex flex-col justify-center relative overflow-hidden shadow-lg">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Settings className="w-5 h-5"/> Trạng thái Hệ thống</h3>
                            <div className="flex gap-8 mt-2">
                                <div className="flex items-center gap-3">
                                    <span className={`w-3 h-3 rounded-full ${data.config.isPhase1Open ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-red-500'}`}></span>
                                    <span className="font-medium">Cổng 1: {data.config.isPhase1Open ? 'Đang mở' : 'Đã đóng'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`w-3 h-3 rounded-full ${data.config.isPhase2Open ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-red-500'}`}></span>
                                    <span className="font-medium">Cổng 2: {data.config.isPhase2Open ? 'Đang mở' : 'Đã đóng'}</span>
                                </div>
                                {!isOnline && (
                                <div className="flex items-center gap-3 text-yellow-300">
                                    <AlertTriangle className="w-4 h-4" /> <span>Offline Mode (LocalStorage)</span>
                                </div>
                                )}
                            </div>
                        </div>
                        {isOnline && (
                           <button 
                             onClick={handleForceSync} 
                             disabled={isSyncing}
                             className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-all"
                             title="Nếu người khác không thấy dữ liệu, bấm vào đây để đẩy dữ liệu từ máy bạn lên Cloud."
                           >
                             <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> 
                             {isSyncing ? 'Đang đẩy lên...' : 'Đồng bộ lên Cloud'}
                           </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-1 gap-6">
                {/* Voter Management (Now Full Width in System Tab) */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500"/>
                        <h3 className="font-bold text-gray-800">Quản lý Dữ liệu Hệ thống</h3>
                    </div>
                    <div className="p-6 flex flex-col md:flex-row gap-6">
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div>
                                    <div className="font-bold text-blue-900">Nhập Danh Sách Cử Tri</div>
                                    <div className="text-xs text-blue-700">File Excel (.xlsx) chứa CCCD, Họ tên...</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => downloadTemplate('voters')} className="p-2 bg-white text-blue-600 rounded border border-blue-200 hover:bg-blue-50" title="Tải mẫu"><Download className="w-4 h-4"/></button>
                                    <label className="p-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 shadow-sm">
                                        <Upload className="w-4 h-4"/>
                                        <input type="file" hidden accept=".xlsx" onChange={(e) => handleFileUpload(e, 'voters')} />
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 border-l border-gray-100 pl-6 flex flex-col justify-center">
                            <h4 className="font-bold text-red-800 text-sm mb-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Reset Hệ thống</h4>
                            <p className="text-xs text-gray-500 mb-3">Tùy chọn xóa dữ liệu để bắt đầu lại.</p>
                            <div className="flex flex-col gap-2">
                                <Button 
                                    variant="danger" 
                                    className="w-full text-sm py-2" 
                                    onClick={() => triggerReset('full')}
                                >
                                <Trash2 className="w-4 h-4 mr-2 inline"/> Xóa Toàn bộ Hệ thống
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full text-sm py-2 text-red-600 border-red-200 hover:bg-red-50" 
                                    onClick={() => triggerReset('voters')}
                                >
                                <Users className="w-4 h-4 mr-2 inline"/> Chỉ xóa DS Cử tri
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* NEW: Voter Tracking Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50">
                    <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wider flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600"/> Theo dõi Trạng thái Bầu cử
                    </h3>
                    <div className="flex gap-2 flex-1 justify-end max-w-2xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                className="w-full pl-9 pr-3 py-1.5 rounded border border-gray-300 text-sm focus:ring-1 focus:ring-blue-500" 
                                placeholder="Tìm tên, MSSV, CCCD..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                            />
                        </div>
                        <div className="relative">
                            <select 
                                className="pl-2 pr-8 py-1.5 rounded border border-gray-300 text-sm appearance-none bg-white cursor-pointer hover:bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none"
                                value={voterFilter}
                                onChange={(e) => setVoterFilter(e.target.value as any)}
                            >
                                <option value="all">Tất cả cử tri</option>
                                <option value="p1_done">Đã Vote P1</option>
                                <option value="p1_not">Chưa Vote P1</option>
                                <option value="p2_done">Đã Vote P2</option>
                                <option value="p2_not">Chưa Vote P2</option>
                            </select>
                            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"/>
                        </div>
                        <Button variant="outline" onClick={handleExportVoterStatus} className="py-1.5 text-xs h-auto bg-white whitespace-nowrap"><List className="w-3 h-3 mr-1"/> DS Cử tri</Button>
                        <Button onClick={handleExportAudit} className="py-1.5 text-xs h-auto bg-gray-800 text-white hover:bg-gray-900 whitespace-nowrap"><Download className="w-3 h-3 mr-1"/> Báo cáo Chi tiết</Button>
                    </div>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 w-10 text-center border-r">STT</th>
                                <th className="px-4 py-3 border-r">Cử Tri</th>
                                <th className="px-4 py-3 w-32 border-r">CCCD</th>
                                <th className="px-4 py-3 w-32 text-center border-r">Vote Phần 1</th>
                                <th className="px-4 py-3 w-32 text-center border-r">Vote Phần 2</th>
                                <th className="px-4 py-3 w-20 text-center">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredVoters.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Không tìm thấy dữ liệu phù hợp</td></tr>
                            ) : (
                                filteredVoters.map((v, idx) => (
                                    <tr key={v.cccd} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-center text-gray-500 border-r">{idx + 1}</td>
                                        <td className="px-4 py-3 border-r">
                                            <div className="font-bold text-gray-800">{v.hoTen}</div>
                                            <div className="text-xs text-gray-400">{v.mssv} - {v.nhom}</div>
                                        </td>
                                        <td className="px-4 py-3 border-r font-mono text-gray-500 text-xs">{v.cccd}</td>
                                        <td className="px-4 py-3 text-center border-r">
                                            {v.hasVotedPhase1 ? 
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200"><CheckCircle className="w-3 h-3"/> Đã Vote</span> : 
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full"><MinusCircle className="w-3 h-3"/> Chưa</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-center border-r">
                                            {v.hasVotedPhase2 ? 
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200"><CheckCircle className="w-3 h-3"/> Đã Vote</span> : 
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full"><MinusCircle className="w-3 h-3"/> Chưa</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => setInspectVoter(v)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Xem chi tiết phiếu bầu"
                                            >
                                                <Eye className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      );
  }

  const Phase1Tab = () => {
    const p1Count = data.voters.filter(v => v.hasVotedPhase1).length;
    const filtered = (data.candidatesP1 || []).filter(c => 
        c.hoTen.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.mssv.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Tiến độ Đánh giá" value={`${Math.round(p1Count/data.voters.length*100 || 0)}%`} subtext={`${p1Count}/${data.voters.length} cử tri đã vote`} icon={Activity} color="red" />
                
                <div className="md:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-800">Điều khiển Cổng 1</h3>
                        <p className="text-sm text-gray-500">Bật/Tắt quyền truy cập đánh giá xếp loại</p>
                    </div>
                    <div className="flex items-center gap-4">
                         <button 
                            onClick={() => updateConfig('isPhase1Open', !data.config.isPhase1Open)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-all ${data.config.isPhase1Open ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-gray-400 hover:bg-gray-500'}`}
                        >
                            {data.config.isPhase1Open ? <ToggleRight className="w-5 h-5"/> : <ToggleLeft className="w-5 h-5"/>}
                            {data.config.isPhase1Open ? 'Đang Mở' : 'Đã Đóng'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                 {/* Display Config P1 */}
                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-gray-500"/>
                        <h3 className="font-bold text-gray-800">Cấu hình hiển thị thẻ (P1)</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-3">
                            <CheckboxItemP1 field="showCCCD" label="CCCD/Mã ĐD" />
                            <CheckboxItemP1 field="showMSSV" label="Mã số sinh viên" />
                            <CheckboxItemP1 field="showNgayVaoDang" label="Ngày vào Đảng" />
                            <CheckboxItemP1 field="showLoaiDangVien" label="Loại Đảng viên" />
                            <CheckboxItemP1 field="showNhom" label="Chi bộ/Nhóm" />
                            <CheckboxItemP1 field="showKhoa" label="Đơn vị (Khóa)" />
                            <CheckboxItemP1 field="showChucVu" label="Chức vụ" />
                            <CheckboxItemP1 field="showDiemHT" label="Điểm HT" />
                            <CheckboxItemP1 field="showDiemRL" label="Điểm RL" />
                            <CheckboxItemP1 field="showThanhTich" label="Thành tích" />
                            <CheckboxItemP1 field="showTuDanhGia" label="Tự đánh giá" />
                        </div>
                    </div>
                </div>

                {/* Input Data */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-gray-500"/>
                        <div className="flex-1">
                           <h3 className="font-bold text-gray-800">Dữ liệu Ứng viên (P1)</h3>
                           <div className="text-xs text-gray-500">Hiện có: <b>{data.candidatesP1.length}</b> ứng viên</div>
                        </div>
                    </div>
                    <div className="p-6 flex-1 flex items-center">
                         <div className="w-full flex gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100 items-center">
                            <div className="flex-1 text-sm text-gray-600">Nhập danh sách Đảng viên cần đánh giá từ Excel.</div>
                            <button onClick={() => downloadTemplate('p1')} className="px-3 py-2 bg-white border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 flex items-center gap-2"><Download className="w-4 h-4"/> Tải mẫu</button>
                            <label className="px-3 py-2 bg-[#BE1E2D] text-white rounded text-sm font-medium hover:bg-[#991B1B] cursor-pointer flex items-center gap-2 shadow-sm">
                                <Upload className="w-4 h-4"/> Nhập Excel
                                <input type="file" hidden accept=".xlsx" onChange={(e) => handleFileUpload(e, 'p1')} />
                            </label>
                            <div className="w-px h-8 bg-gray-200 mx-1"></div>
                            <button 
                                onClick={() => triggerReset('p1')} 
                                className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors flex items-center gap-1 font-bold text-xs whitespace-nowrap"
                                title="Xóa dữ liệu P1"
                            >
                                <Trash2 className="w-4 h-4"/> Xóa Dữ Liệu
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50">
                    <h3 className="font-bold text-red-800 uppercase text-sm tracking-wider">Kết quả Xếp loại</h3>
                    <div className="flex gap-2 flex-1 justify-end max-w-xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input className="w-full pl-9 pr-3 py-1.5 rounded border border-gray-300 text-sm" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <Button variant="outline" onClick={handleExportP1} className="py-1.5 text-xs h-auto bg-white"><Download className="w-3 h-3 mr-1"/> Xuất Excel</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 w-10 text-center border-r">STT</th>
                                <th className="px-4 py-3 border-r">Đảng viên</th>
                                <th className="px-2 py-2 text-center w-28 border-r text-red-600 bg-red-50">Không HT</th>
                                <th className="px-2 py-2 text-center w-28 border-r text-blue-600 bg-blue-50">Hoàn thành</th>
                                <th className="px-2 py-2 text-center w-28 text-green-600 bg-green-50">HT Tốt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-400">Chưa có dữ liệu</td></tr> : 
                            filtered.map((c, idx) => {
                                const stats = getP1Stats(c.cccd);
                                const total = stats.total || 1;
                                return (
                                    <tr key={c.cccd} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-center text-gray-500 border-r">{idx + 1}</td>
                                        <td className="px-4 py-3 border-r font-medium">
                                            {c.hoTen}
                                            <div className="text-xs text-gray-400 font-normal">{c.mssv} - {c.khoa}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center border-r font-bold text-red-600 bg-red-50/20">
                                            <div>{stats.kht || 0}</div>
                                            <div className="text-[10px] font-normal opacity-75">{Math.round(stats.kht/total * 100)}%</div>
                                        </td>
                                        <td className="px-4 py-3 text-center border-r font-bold text-blue-600 bg-blue-50/20">
                                            <div>{stats.ht || 0}</div>
                                            <div className="text-[10px] font-normal opacity-75">{Math.round(stats.ht/total * 100)}%</div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-green-600 bg-green-50/20">
                                            <div>{stats.htt || 0}</div>
                                            <div className="text-[10px] font-normal opacity-75">{Math.round(stats.htt/total * 100)}%</div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  const Phase2Tab = () => {
    const p2Count = data.voters.filter(v => v.hasVotedPhase2).length;
    const p2Rank = (data.candidatesP2 || []).map(c => ({
        ...c,
        votes: data.votesP2.filter(v => String(v.candidateCCCD).trim() === String(c.cccd).trim()).length
    })).sort((a,b) => b.votes - a.votes);
    
    const filtered = p2Rank.filter(c => c.hoTen.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Header & Stats */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Tiến độ Bầu cử" value={`${Math.round(p2Count/data.voters.length*100 || 0)}%`} subtext={`${p2Count}/${data.voters.length} cử tri đã vote`} icon={Star} color="yellow" />
                
                <div className="md:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-800">Điều khiển Cổng 2</h3>
                        <p className="text-sm text-gray-500">Cấu hình số lượng bầu & hiển thị</p>
                    </div>
                    <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                            <span className="text-sm font-medium text-gray-600">Max Vote:</span>
                            <input 
                                type="number" min="1" className="w-12 text-center border rounded py-0.5 text-sm font-bold"
                                value={data.config.maxExcellentVotes} 
                                onChange={(e) => updateConfig('maxExcellentVotes', parseInt(e.target.value)||1)} 
                            />
                         </div>

                         <button 
                            onClick={() => updateConfig('isPhase2Open', !data.config.isPhase2Open)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-all ${data.config.isPhase2Open ? 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200' : 'bg-gray-400 hover:bg-gray-500'}`}
                        >
                            {data.config.isPhase2Open ? <ToggleRight className="w-5 h-5"/> : <ToggleLeft className="w-5 h-5"/>}
                            {data.config.isPhase2Open ? 'Đang Mở' : 'Đã Đóng'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                 {/* Display Config P2 */}
                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-gray-500"/>
                        <h3 className="font-bold text-gray-800">Cấu hình hiển thị thẻ (P2)</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-3">
                            <CheckboxItemP2 field="showCCCD" label="CCCD/Mã ĐD" />
                            <CheckboxItemP2 field="showMSSV" label="Mã số sinh viên" />
                            <CheckboxItemP2 field="showNgayVaoDang" label="Ngày vào Đảng" />
                            <CheckboxItemP2 field="showLoaiDangVien" label="Loại Đảng viên" />
                            <CheckboxItemP2 field="showNhom" label="Chi bộ/Nhóm" />
                            <CheckboxItemP2 field="showKhoa" label="Đơn vị (Khóa)" />
                            <CheckboxItemP2 field="showChucVu" label="Chức vụ" />
                            <CheckboxItemP2 field="showDiemHT" label="Điểm HT" />
                            <CheckboxItemP2 field="showDiemRL" label="Điểm RL" />
                            <CheckboxItemP2 field="showThanhTich" label="Thành tích" />
                            <CheckboxItemP2 field="showChiBoDeXuat" label="Đề xuất" />
                        </div>
                    </div>
                </div>

                {/* Input Data */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-gray-500"/>
                        <div className="flex-1">
                           <h3 className="font-bold text-gray-800">Dữ liệu Ứng viên (P2)</h3>
                           <div className="text-xs text-gray-500">Hiện có: <b>{data.candidatesP2.length}</b> ứng viên</div>
                        </div>
                    </div>
                    <div className="p-6 flex-1 flex items-center">
                        <div className="w-full flex gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100 items-center">
                            <div className="flex-1 text-sm text-gray-600">Nhập danh sách Đảng viên được đề xuất bầu xuất sắc.</div>
                            <button onClick={() => downloadTemplate('p2')} className="px-3 py-2 bg-white border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 flex items-center gap-2"><Download className="w-4 h-4"/> Tải mẫu</button>
                            <label className="px-3 py-2 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600 cursor-pointer flex items-center gap-2 shadow-sm">
                                <Upload className="w-4 h-4"/> Nhập Excel
                                <input type="file" hidden accept=".xlsx" onChange={(e) => handleFileUpload(e, 'p2')} />
                            </label>
                            <div className="w-px h-8 bg-gray-200 mx-1"></div>
                            <button 
                                onClick={() => triggerReset('p2')} 
                                className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors flex items-center gap-1 font-bold text-xs whitespace-nowrap"
                                title="Xóa dữ liệu P2"
                            >
                                <Trash2 className="w-4 h-4"/> Xóa Dữ Liệu
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results List (Chart removed) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                 <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-yellow-700 uppercase text-sm tracking-wider">Chi tiết Phiếu Bầu</h3>
                    <div className="flex gap-2">
                         <div className="relative w-48">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <input className="w-full pl-7 pr-2 py-1 rounded border border-gray-300 text-xs" placeholder="Tìm tên..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                         </div>
                         <button onClick={handleExportP2} className="px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"><Download className="w-3 h-3 inline"/> Xuất</button>
                    </div>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 w-10 text-center">#</th>
                                <th className="px-4 py-3">Ứng viên</th>
                                <th className="px-4 py-3">Chi bộ đề xuất</th>
                                <th className="px-4 py-3 text-center">Số phiếu</th>
                                <th className="px-4 py-3 w-24 text-right">Tỷ lệ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((c, idx) => {
                                const maxVotes = data.voters.filter(v => v.hasVotedPhase2).length || 1;
                                const percent = Math.round((c.votes / maxVotes) * 100);
                                return (
                                    <tr key={c.cccd} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-center font-bold text-gray-500">{idx+1}</td>
                                        <td className="px-4 py-3 font-medium">{c.hoTen}</td>
                                        <td className="px-4 py-3 text-xs text-amber-700">{c.chiBoDeXuat}</td>
                                        <td className="px-4 py-3 text-center font-bold text-lg">{c.votes}</td>
                                        <td className="px-4 py-3 text-right text-xs text-gray-500">{percent}%</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-8 border border-gray-200">
          <div className="text-center mb-6">
             <div className="w-12 h-12 bg-[#BE1E2D] text-white rounded-full flex items-center justify-center mx-auto mb-3">
               <ShieldCheck className="w-6 h-6" />
             </div>
             <h2 className="text-xl font-bold text-gray-800">Đăng nhập Quản Trị</h2>
             <p className="text-sm text-gray-500 mt-1">Khu vực dành cho cấp ủy</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="password" 
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#BE1E2D] focus:border-[#BE1E2D] outline-none transition-all"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              {loginError && <p className="text-red-500 text-xs mt-2 pl-1">{loginError}</p>}
            </div>
            <Button type="submit" className="w-full bg-[#BE1E2D] hover:bg-[#991B1B] text-white">Xác nhận</Button>
            <button 
              type="button" 
              onClick={onBack} 
              className="w-full text-xs text-gray-500 hover:text-gray-800 py-2"
            >
              Quay lại trang chủ
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Header Titles
  const titles = {
      'system': 'Cấu hình Hệ thống & Cử tri',
      'p1': 'Quản lý Phần 1: Đánh giá Xếp loại',
      'p2': 'Quản lý Phần 2: Bình bầu Xuất sắc'
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {notification && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded shadow-lg animate-bounce">{notification}</div>}
      
      {/* Inspector Modal (Soi phiếu) */}
      {inspectVoter && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                             <Eye className="w-5 h-5"/>
                        </div>
                        <div>
                             <div className="text-xs text-gray-500 uppercase font-bold">Lịch sử Bầu Cử</div>
                             <div className="text-lg font-bold text-gray-800">{inspectVoter.hoTen}</div>
                             <div className="text-xs text-gray-400 font-mono">{inspectVoter.cccd}</div>
                        </div>
                     </div>
                     <button onClick={() => setInspectVoter(null)} className="text-gray-400 hover:text-red-500"><X className="w-6 h-6"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* P1 Detail */}
                    <div>
                        <h4 className="font-bold text-red-800 border-b border-red-100 pb-2 mb-3 flex items-center gap-2">
                             <Activity className="w-4 h-4"/> Kết quả Đánh giá P1
                        </h4>
                        {!inspectVoter.hasVotedPhase1 ? (
                            <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded text-center">Cử tri chưa thực hiện đánh giá Phần 1.</div>
                        ) : (
                            <div className="bg-white border rounded-lg overflow-hidden text-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-100 text-gray-700 text-xs uppercase">
                                        <tr>
                                            <th className="px-3 py-2 border-r w-10 text-center">#</th>
                                            <th className="px-3 py-2 border-r">Đảng viên được đánh giá</th>
                                            <th className="px-3 py-2 text-center w-32">Mức độ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {getVoterHistory(inspectVoter).p1.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-center text-gray-500 border-r">{idx+1}</td>
                                                <td className="px-3 py-2 border-r font-medium">{item.name}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                                        item.level === VoteLevel1.KHONG_HOAN_THANH ? 'bg-red-100 text-red-700' :
                                                        item.level === VoteLevel1.HOAN_THANH ? 'bg-blue-100 text-blue-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                        {item.level}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* P2 Detail */}
                    <div>
                        <h4 className="font-bold text-yellow-700 border-b border-yellow-100 pb-2 mb-3 flex items-center gap-2">
                             <Star className="w-4 h-4"/> Bầu Xuất sắc P2
                        </h4>
                        {!inspectVoter.hasVotedPhase2 ? (
                            <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded text-center">Cử tri chưa thực hiện bầu Phần 2.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {getVoterHistory(inspectVoter).p2.length === 0 ? (
                                    <div className="col-span-2 text-sm text-gray-500 p-3 bg-gray-50 rounded italic text-center">Phiếu trắng (Không chọn ai)</div>
                                ) : (
                                    getVoterHistory(inspectVoter).p2.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-900 text-sm font-medium">
                                            <CheckCircle className="w-4 h-4 text-yellow-600"/> {item.name}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                     <Button variant="secondary" onClick={() => setInspectVoter(null)}>Đóng</Button>
                </div>
             </div>
        </div>
      )}

      {/* Secure Reset Modal */}
      {resetConfig.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-red-200">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5"/> Xác nhận Reset
                      </h3>
                      <button onClick={() => setResetConfig({ ...resetConfig, isOpen: false })} className="text-gray-400 hover:text-gray-800"><X className="w-5 h-5"/></button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                      {getResetMessage()}<br/><br/>Vui lòng nhập mật khẩu admin để xác nhận.
                  </p>
                  <form onSubmit={handleSecureReset}>
                      <div className="mb-4">
                          <input 
                            type="password" 
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="Nhập mật khẩu..."
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            autoFocus
                          />
                          {resetError && <p className="text-red-600 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {resetError}</p>}
                      </div>
                      <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setResetConfig({ ...resetConfig, isOpen: false })}>Hủy</Button>
                          <Button type="submit" variant="danger">Xác nhận Xóa</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
         <div className="flex items-center gap-4">
             <button onClick={() => setIsAuthenticated(false)} className="text-gray-400 hover:text-gray-800" title="Đăng xuất"><Lock className="w-5 h-5" /></button>
             <div className="h-8 w-1 bg-[#BE1E2D] rounded-full hidden sm:block"></div>
             <h1 className="font-black text-lg sm:text-xl text-gray-800 tracking-tight uppercase">{titles[activeTab]}</h1>
             {isOnline ? (
                <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 font-bold"><Cloud className="w-3 h-3"/> Online</span>
             ) : (
                <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 font-bold"><CloudOff className="w-3 h-3"/> Local</span>
             )}
         </div>
         <div className="flex bg-gray-100 p-1 rounded-lg">
             <button 
                onClick={() => { setActiveTab('system'); setSearchTerm(''); }}
                className={`px-3 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'system' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Hệ Thống</span>
             </button>
             <button 
                onClick={() => { setActiveTab('p1'); setSearchTerm(''); }}
                className={`px-3 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'p1' ? 'bg-white shadow-sm text-[#BE1E2D]' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Activity className="w-4 h-4" /> <span className="hidden sm:inline">Phần 1</span>
             </button>
             <button 
                onClick={() => { setActiveTab('p2'); setSearchTerm(''); }}
                className={`px-3 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'p2' ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Star className="w-4 h-4" /> <span className="hidden sm:inline">Phần 2</span>
             </button>
         </div>
      </div>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
         {activeTab === 'system' && <SystemTab />}
         {activeTab === 'p1' && <Phase1Tab />}
         {activeTab === 'p2' && <Phase2Tab />}
      </div>
    </div>
  );
};