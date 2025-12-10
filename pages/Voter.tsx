import React, { useState, useMemo, useEffect } from 'react';
import { getDB, castVoteP1, castVoteP2, hasData, resetDB } from '../services/storage';
import { Voter, VoteLevel1, AppData, CandidatePhase1 } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Check, AlertCircle, LogOut, Search, Filter, Zap, ChevronDown, ChevronUp, UserCheck, Award, LayoutGrid, List, EyeOff, CheckCircle, Loader2, RotateCcw, Calendar, BookOpen, Star, ThumbsUp, Hash, Users, Flag, Tag, CheckSquare, CloudLightning } from 'lucide-react';

interface VoterPageProps {
  onLogout: () => void;
}

export const VoterPage: React.FC<VoterPageProps> = ({ onLogout }) => {
  const [db, setDb] = useState<AppData>(getDB());
  const [currentUser, setCurrentUser] = useState<Voter | null>(null);
  
  // Login State
  const [loginId, setLoginId] = useState('');
  const [error, setError] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true); // Trạng thái đang tải dữ liệu
  const [dataExists, setDataExists] = useState(false);
  
  // App Flow State
  const [step, setStep] = useState<'login' | 'p1' | 'p2' | 'done'>('login');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    type?: 'confirm' | 'alert' | 'danger';
    confirmText?: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Voting Data State
  const [p1Votes, setP1Votes] = useState<Record<string, VoteLevel1>>({});
  const [p2Selected, setP2Selected] = useState<string[]>([]);

  // Filters Common
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKhoa, setFilterKhoa] = useState<string>('ALL');

  // Filters Phase 1 Specific
  const [hideVotedP1, setHideVotedP1] = useState(false);
  const [viewModeP1, setViewModeP1] = useState<'list' | 'grid'>('grid');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Filters Phase 2 Specific
  const [filterChiBo, setFilterChiBo] = useState<string>('ALL');
  const [viewSelectedP2, setViewSelectedP2] = useState(false);
  const [hideSelectedP2, setHideSelectedP2] = useState(false);

  useEffect(() => {
    // Kiểm tra dữ liệu lần đầu
    const checkData = () => {
        const currentData = getDB();
        setDb(currentData);
        const exists = currentData.voters.length > 0;
        setDataExists(exists);
        if (exists) setIsLoadingData(false);
    };

    checkData();

    // Lắng nghe sự kiện cập nhật từ Cloud
    const handleStorageChange = () => {
      checkData();
      // Khi có event update, chắc chắn đã tải xong (hoặc có dữ liệu mới)
      setIsLoadingData(false); 
      
      if (currentUser) {
        const newData = getDB();
        const updatedUser = newData.voters.find(v => v.cccd === currentUser.cccd);
        if (updatedUser) setCurrentUser(updatedUser);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('db_update', handleStorageChange);
    
    // Timeout an toàn: Nếu sau 3s chưa load được thì cứ hiển thị UI (có thể là không có dữ liệu thật)
    const timeout = setTimeout(() => setIsLoadingData(false), 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('db_update', handleStorageChange);
      clearTimeout(timeout);
    };
  }, [currentUser]);

  const showNotify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  // --- Actions ---

  const handleLogout = () => {
     // Direct logout, no confirmation to prevent blocking
     setCurrentUser(null);
     setP1Votes({});
     setP2Selected([]);
     setStep('login');
     onLogout();
     window.scrollTo(0,0);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!dataExists) {
        setError('Hệ thống chưa có dữ liệu. Vui lòng liên hệ Admin.');
        return;
    }

    const cleanId = loginId.trim();
    if (!cleanId) return;

    const user = db.voters.find(v => 
      String(v.cccd).trim() === cleanId || 
      String(v.mssv).trim().toLowerCase() === cleanId.toLowerCase()
    );

    if (!user) {
      setError('Không tìm thấy thông tin đảng viên.');
      return;
    }

    setCurrentUser(user);
    
    // Restore state
    const existingP1 = db.votesP1.filter(v => v.voterCCCD === user.cccd);
    const p1Map: Record<string, VoteLevel1> = {};
    existingP1.forEach(v => p1Map[v.candidateCCCD] = v.level);
    setP1Votes(p1Map);

    const existingP2 = db.votesP2.filter(v => v.voterCCCD === user.cccd);
    setP2Selected(existingP2.map(v => v.candidateCCCD));

    const { isPhase1Open, isPhase2Open } = db.config;
    
    if (user.hasVotedPhase1 && user.hasVotedPhase2) {
      setStep('done');
    } else if (isPhase1Open && !user.hasVotedPhase1) {
      setStep('p1');
    } else if (isPhase2Open && !user.hasVotedPhase2) {
      setStep('p2');
    } else if (user.hasVotedPhase1 && !isPhase2Open) {
       setStep('done');
    } else if (!isPhase1Open && user.hasVotedPhase2) {
       setStep('done');
    } else if (!isPhase1Open && !isPhase2Open) {
       setError('Hệ thống đang đóng.');
       return; 
    } else {
       setStep('done');
    }
  };

  const executeSubmitP1 = async (finalVotes: Record<string, VoteLevel1>) => {
    if (!currentUser) return;
    closeModal();
    setIsSubmitting(true);
    
    try {
       // Simulate small delay for UI feedback
       await new Promise(r => setTimeout(r, 500));
       
       const votesArray = Object.entries(finalVotes).map(([candidateCCCD, level]) => ({ candidateCCCD, level }));
       // Update to await
       const success = await castVoteP1(currentUser.cccd, votesArray);

       if (success) {
         showNotify("Đã gửi đánh giá P1 thành công!", "success");
         setTimeout(() => {
            const freshDB = getDB();
            if (freshDB.config.isPhase2Open) setStep('p2');
            else setStep('done');
            window.scrollTo(0,0);
         }, 800);
       } else {
         showNotify("Lỗi lưu dữ liệu. Bộ nhớ có thể đã đầy.", "error");
       }
    } catch (e) {
      console.error(e);
      showNotify("Lỗi hệ thống.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreSubmitP1 = () => {
    const missing = candidatesP1.filter(c => !p1Votes[c.cccd]);
    
    if (missing.length > 0) {
      setModalConfig({
        isOpen: true,
        title: 'Xác nhận tự động điền',
        message: (
           <span>
             Bạn còn <b className="text-red-600">{missing.length}</b> người chưa đánh giá.<br/><br/>
             Hệ thống sẽ tự động điền mức <b className="text-blue-600">"HOÀN THÀNH"</b> cho những người này và nộp phiếu ngay.
           </span>
        ),
        confirmText: 'Đồng ý & Gửi ngay',
        onConfirm: () => {
           let finalVotes = { ...p1Votes };
           missing.forEach(c => finalVotes[c.cccd] = VoteLevel1.HOAN_THANH);
           executeSubmitP1(finalVotes);
        }
      });
    } else {
      setModalConfig({
        isOpen: true,
        title: 'Xác nhận gửi',
        message: 'Bạn đã đánh giá đầy đủ. Bạn có chắc chắn muốn gửi kết quả không?',
        confirmText: 'Gửi kết quả',
        onConfirm: () => executeSubmitP1(p1Votes)
      });
    }
  };

  const executeSubmitP2 = async () => {
    if (!currentUser) return;
    closeModal();
    setIsSubmitting(true);

    try {
      await new Promise(r => setTimeout(r, 500));
      // Update to await
      const success = await castVoteP2(currentUser.cccd, p2Selected);
      if (success) {
         showNotify("Đã gửi phiếu bầu xuất sắc!", "success");
         setTimeout(() => {
             setStep('done');
             window.scrollTo(0,0);
         }, 800);
      } else {
         showNotify("Lỗi lưu dữ liệu.", "error");
      }
    } catch(e) {
      console.error(e);
      showNotify("Lỗi hệ thống.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreSubmitP2 = () => {
     if (p2Selected.length === 0) {
        setModalConfig({
          isOpen: true,
          title: 'Nộp phiếu trắng?',
          message: 'Bạn chưa chọn đồng chí nào. Bạn có chắc chắn muốn nộp phiếu trắng không?',
          type: 'danger',
          confirmText: 'Nộp phiếu trắng',
          onConfirm: () => executeSubmitP2()
        });
     } else {
        setModalConfig({
          isOpen: true,
          title: 'Xác nhận bầu cử',
          message: `Bạn đã chọn ${p2Selected.length} đồng chí xuất sắc. Xác nhận nộp phiếu?`,
          confirmText: 'Nộp phiếu',
          onConfirm: () => executeSubmitP2()
        });
     }
  };

  const handleQuickVoteP1 = () => {
    const visibleCandidates = Object.values(p1DisplayData).flat();
    const unvoted = visibleCandidates.filter(c => !p1Votes[c.cccd]);

    if (unvoted.length === 0) {
      showNotify("Danh sách đang hiển thị đã được đánh giá hết.", "error");
      return;
    }

    setModalConfig({
       isOpen: true,
       title: 'Điền nhanh',
       message: `Điền mức "Hoàn thành" cho ${unvoted.length} người đang hiển thị?`,
       confirmText: 'Điền ngay',
       onConfirm: () => {
         const newMap = { ...p1Votes };
         unvoted.forEach(c => newMap[c.cccd] = VoteLevel1.HOAN_THANH);
         setP1Votes(newMap);
         closeModal();
         showNotify("Đã điền xong!");
       }
    });
  };

  const handleResetApp = async () => {
    setModalConfig({
      isOpen: true,
      title: 'Reset dữ liệu?',
      message: 'Hành động này sẽ xóa toàn bộ dữ liệu trên trình duyệt này. Bạn có chắc không?',
      type: 'danger',
      confirmText: 'XÓA SẠCH',
      onConfirm: async () => {
         await resetDB();
         closeModal();
      }
    });
  };

  // --- Helpers ---
  const candidatesP1 = db.candidatesP1 || [];
  
  // Choose config based on step
  const displayConfigP1 = db.config.p1Display;
  const displayConfigP2 = db.config.p2Display;

  // Derive unique values for filters
  const uniqueKhoaP1 = useMemo(() => Array.from(new Set(candidatesP1.map(c => c.khoa || 'Khác'))).sort(), [candidatesP1]);
  const uniqueChiBoP2 = useMemo(() => Array.from(new Set((db.candidatesP2 || []).map(c => c.chiBoDeXuat || 'Khác'))).sort(), [db.candidatesP2]);

  const p1DisplayData = useMemo(() => {
    const filtered = candidatesP1.filter(c => {
      const matchesSearch = (c.hoTen || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (c.mssv || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesKhoa = filterKhoa === 'ALL' || (c.khoa || 'Khác') === filterKhoa;
      const matchesHideVoted = hideVotedP1 ? !p1Votes[c.cccd] : true;
      return matchesSearch && matchesKhoa && matchesHideVoted;
    });

    const groups: Record<string, CandidatePhase1[]> = {};
    filtered.forEach(c => {
      const k = c.khoa || 'Khác';
      if (!groups[k]) groups[k] = [];
      groups[k].push(c);
    });
    return groups;
  }, [candidatesP1, searchTerm, filterKhoa, hideVotedP1, p1Votes]);

  const p2DisplayData = useMemo(() => {
    return (db.candidatesP2 || []).filter(c => {
       const matchesSearch = (c.hoTen || '').toLowerCase().includes(searchTerm.toLowerCase());
       const matchesChiBo = filterChiBo === 'ALL' || (c.chiBoDeXuat || 'Khác') === filterChiBo;
       
       let matchesSelectionState = true;
       // Logic exclusive: if viewSelectedP2 is on, only show selected.
       // if hideSelectedP2 is on, only show unselected.
       if (viewSelectedP2) matchesSelectionState = p2Selected.includes(c.cccd);
       if (hideSelectedP2) matchesSelectionState = !p2Selected.includes(c.cccd);

       return matchesSearch && matchesChiBo && matchesSelectionState;
    });
  }, [db.candidatesP2, searchTerm, filterChiBo, viewSelectedP2, hideSelectedP2, p2Selected]);

  const NotificationToast = () => (
    notification ? (
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce border-2 ${notification.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'}`}>
        {notification.type === 'success' ? <CheckCircle className="w-6 h-6"/> : <AlertCircle className="w-6 h-6"/>}
        <span className="font-bold text-lg">{notification.msg}</span>
      </div>
    ) : null
  );

  const ProgressBar = ({ current, total }: { current: number, total: number }) => {
    const percent = Math.min(100, Math.round((current / (total || 1)) * 100));
    return (
      <div className="bg-white border-b border-gray-200 sticky top-0 z-[40] shadow-sm px-4 py-3">
         <div className="max-w-4xl mx-auto">
            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              <span>Tiến độ đánh giá</span>
              <span className={percent === 100 ? "text-green-600" : "text-[#BE1E2D]"}>{current}/{total} ({percent}%)</span>
            </div>
            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
               <div className="h-full bg-gradient-to-r from-[#BE1E2D] to-red-400 transition-all duration-500 ease-out" style={{ width: `${percent}%` }}></div>
            </div>
         </div>
      </div>
    );
  }

  // --- Render Views ---

  if (step === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffef5] p-4 relative overflow-hidden">
        <Modal {...modalConfig} onCancel={closeModal} />
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] bg-[#BE1E2D] rounded-full blur-3xl opacity-5 pointer-events-none"></div>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 relative z-10">
           <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                 <UserCheck className="w-8 h-8 text-[#BE1E2D]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Đăng nhập hệ thống</h2>
              <p className="text-gray-500 text-sm mt-1">Nhập CCCD hoặc Mã định danh</p>
           </div>
           
           {/* Trạng thái Loading / Error */}
           {isLoadingData ? (
             <div className="mb-6 flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-gray-100 animate-pulse">
                <Loader2 className="w-8 h-8 text-[#BE1E2D] animate-spin mb-2" />
                <span className="text-sm text-gray-500 font-medium">Đang kết nối dữ liệu Cloud...</span>
             </div>
           ) : !dataExists ? (
               <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm border border-yellow-200 flex flex-col gap-2">
                   <div className="flex items-center gap-2 font-bold"><AlertCircle className="w-5 h-5" /> Hệ thống chưa có dữ liệu</div>
                   <p>Vui lòng liên hệ Ban Tổ Chức hoặc vào trang <b>Quản Trị Viên</b> để nhập danh sách.</p>
                   <p className="text-xs text-yellow-600 border-t border-yellow-200 pt-2 mt-1">
                     *Nếu bạn là Admin và đã nhập liệu: Hãy kiểm tra quyền truy cập (Rules) hoặc đảm bảo dữ liệu đã được đẩy lên Cloud thành công.
                   </p>
               </div>
           ) : (
                <div className="mb-6 p-2 bg-green-50 text-green-700 text-xs rounded-lg border border-green-100 flex items-center justify-center gap-1">
                    <CloudLightning className="w-3 h-3" /> Hệ thống Online
                </div>
           )}

           <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#BE1E2D] focus:border-[#BE1E2D] outline-none text-center text-lg font-medium"
                  placeholder="Nhập mã số..."
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  disabled={!dataExists || isLoadingData}
                  autoFocus
                />
              </div>
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
              <Button disabled={!dataExists || isLoadingData} className="w-full py-3 text-base bg-[#BE1E2D] hover:bg-[#991B1B] text-white">Xác thực & Bắt đầu</Button>
           </form>
           
           <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-2">
               <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800">Quay lại trang chủ</button>
               <button 
                onClick={handleResetApp} 
                className="text-xs text-red-400 hover:text-red-600 flex items-center justify-center gap-1 mt-2"
               >
                   <RotateCcw className="w-3 h-3"/> Reset khẩn cấp dữ liệu
               </button>
           </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fffef5] p-6 text-center relative z-50">
         <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
            <Check className="w-12 h-12 text-green-600" />
         </div>
         <h2 className="text-3xl font-bold text-gray-800 mb-2">Hoàn thành nhiệm vụ!</h2>
         <p className="text-gray-600 max-w-md mb-8">
            Cảm ơn đồng chí <strong>{currentUser?.hoTen}</strong> đã hoàn thành các nội dung bỏ phiếu.
         </p>
         <Button onClick={handleLogout} className="w-full max-w-xs bg-[#BE1E2D] hover:bg-[#991B1B] text-white py-3 shadow-lg">
            Đăng xuất / Về trang chủ
         </Button>
      </div>
    );
  }

  const headerBgClass = step === 'p2' 
    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 border-b border-yellow-600" 
    : "bg-[#BE1E2D] border-b border-[#991B1B]";

  return (
    <div className="min-h-screen bg-[#fffef5] pb-24 font-sans">
       <NotificationToast />
       <Modal {...modalConfig} onCancel={closeModal} />
       
       {/* User Header */}
       <div className={`${headerBgClass} text-white px-4 py-3 shadow-md sticky top-0 z-[50] transition-colors duration-500`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 font-bold text-sm">
                   {currentUser?.hoTen.charAt(0)}
                </div>
                <div>
                   <div className="font-bold text-sm md:text-base leading-tight flex items-center gap-2">
                     {step === 'p1' ? 'ĐÁNH GIÁ CHẤT LƯỢNG' : <><Star className="w-4 h-4 fill-white"/> BẦU XUẤT SẮC</>}
                   </div>
                   <div className="text-xs text-white/80 opacity-90">{currentUser?.hoTen}</div>
                </div>
             </div>
             <button onClick={handleLogout} className="text-xs bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <LogOut className="w-3 h-3" /> <span className="hidden sm:inline">Thoát</span>
             </button>
          </div>
       </div>

       {step === 'p1' && <ProgressBar current={Object.keys(p1Votes).length} total={candidatesP1.length} />}
       
       {/* Filter Bar */}
       <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-[57px] z-[30] shadow-sm">
          <div className="max-w-4xl mx-auto space-y-3">
             {/* Common Search */}
             <div className="flex gap-2">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-1 focus:ring-[#BE1E2D] outline-none"
                      placeholder="Tìm tên, MSSV..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                   />
                </div>
                
                {/* Phase 1 Specific Toggle */}
                {step === 'p1' && (
                   <button 
                     onClick={() => setHideVotedP1(!hideVotedP1)}
                     className={`px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${hideVotedP1 ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-300 text-gray-600'}`}
                   >
                      {hideVotedP1 ? <EyeOff className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                      <span className="hidden sm:inline">Ẩn đã vote</span>
                   </button>
                )}

                {/* Phase 2 Specific Toggles */}
                {step === 'p2' && (
                   <>
                       <button 
                            onClick={() => {
                                if (!viewSelectedP2) setHideSelectedP2(false);
                                setViewSelectedP2(!viewSelectedP2);
                            }}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${viewSelectedP2 ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-gray-50 border-gray-300 text-gray-600'}`}
                        >
                            <CheckSquare className="w-4 h-4"/>
                            <span className="hidden sm:inline">Đã chọn ({p2Selected.length})</span>
                        </button>

                        <button 
                            onClick={() => {
                                if (!hideSelectedP2) setViewSelectedP2(false);
                                setHideSelectedP2(!hideSelectedP2);
                            }}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${hideSelectedP2 ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-300 text-gray-600'}`}
                        >
                            {hideSelectedP2 ? <EyeOff className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                            <span className="hidden sm:inline">Ẩn đã chọn</span>
                        </button>
                   </>
                )}
             </div>

             {/* Filter Scrolls */}
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                   <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                   
                   {/* P1 Filters (Khoa) */}
                   {step === 'p1' && (
                      <>
                        <button onClick={() => setFilterKhoa('ALL')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterKhoa === 'ALL' ? 'bg-[#BE1E2D] text-white border-[#BE1E2D]' : 'bg-white text-gray-600 border-gray-300'}`}>Tất cả Khóa</button>
                        {uniqueKhoaP1.map(k => (
                            <button key={k} onClick={() => setFilterKhoa(k)} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterKhoa === k ? 'bg-[#BE1E2D] text-white border-[#BE1E2D]' : 'bg-white text-gray-600 border-gray-300'}`}>{k}</button>
                        ))}
                      </>
                   )}

                   {/* P2 Filters (Chi Bo) */}
                   {step === 'p2' && (
                      <>
                        <button onClick={() => setFilterChiBo('ALL')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${filterChiBo === 'ALL' ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                            Tất cả đề xuất
                        </button>
                        {uniqueChiBoP2.map(k => (
                            <button key={k} onClick={() => setFilterChiBo(k)} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${filterChiBo === k ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                                <Tag className="w-3 h-3"/> {k}
                            </button>
                        ))}
                      </>
                   )}
                </div>
                
                {/* View Mode Toggle (P1 only) */}
                {step === 'p1' && (
                   <div className="flex items-center gap-2 border-l pl-3 ml-2 border-gray-300">
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                         <button onClick={() => setViewModeP1('list')} className={`p-1.5 rounded-md ${viewModeP1 === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}><List className="w-4 h-4"/></button>
                         <button onClick={() => setViewModeP1('grid')} className={`p-1.5 rounded-md ${viewModeP1 === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}><LayoutGrid className="w-4 h-4"/></button>
                      </div>
                   </div>
                )}
             </div>
          </div>
       </div>

       <div className="max-w-4xl mx-auto p-4 space-y-6">
          {step === 'p1' ? (
             <>
                <div className="flex justify-end mb-2">
                   <button onClick={handleQuickVoteP1} className="text-sm font-semibold text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                      <Zap className="w-4 h-4" /> Điền nhanh "Hoàn thành"
                   </button>
                </div>
                {Object.entries(p1DisplayData).map(([group, candidates]) => {
                   if (candidates.length === 0) return null;
                   const isCollapsed = collapsedGroups[group];
                   const doneCount = candidates.filter(c => p1Votes[c.cccd]).length;
                   
                   return (
                      <div key={group} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                         <div 
                           onClick={() => setCollapsedGroups(prev => ({...prev, [group]: !prev[group]}))}
                           className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-100"
                         >
                            <div className="flex items-center gap-2">
                               <h3 className="font-bold text-gray-800">{group}</h3>
                               <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500">{candidates.length}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-medium">
                               <span className={doneCount === candidates.length ? 'text-green-600' : 'text-orange-600'}>{doneCount}/{candidates.length}</span>
                               {isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400"/> : <ChevronUp className="w-4 h-4 text-gray-400"/>}
                            </div>
                         </div>
                         {!isCollapsed && (
                            <div className={`p-4 ${viewModeP1 === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}`}>
                               {candidates.map(c => {
                                  const vote = p1Votes[c.cccd];
                                  return (
                                     <div key={c.cccd} className={`bg-white border rounded-lg p-4 transition-all ${vote ? 'border-l-4 border-l-green-500 shadow-sm' : 'border-gray-200 border-l-4 border-l-gray-300'}`}>
                                        <div className="mb-4">
                                            <div className="font-bold text-gray-800 text-lg mb-1">{c.hoTen}</div>
                                            
                                            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-gray-500 mb-2">
                                              {displayConfigP1.showCCCD && <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><Hash className="w-3 h-3"/> {c.cccd}</span>}
                                              {displayConfigP1.showMSSV && <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><BookOpen className="w-3 h-3"/> {c.mssv}</span>}
                                              {displayConfigP1.showChucVu && <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><UserCheck className="w-3 h-3"/> {c.chucVu}</span>}
                                              {displayConfigP1.showKhoa && <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><Flag className="w-3 h-3"/> {c.khoa}</span>}
                                              {displayConfigP1.showNgayVaoDang && <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><Calendar className="w-3 h-3"/> {c.ngayVaoDang}</span>}
                                              {displayConfigP1.showLoaiDangVien && <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><Users className="w-3 h-3"/> {c.loaiDangVien}</span>}
                                            </div>

                                            <div className="space-y-1.5">
                                              {(displayConfigP1.showDiemHT || displayConfigP1.showDiemRL) && (
                                                <div className="flex items-center gap-3 text-xs bg-gray-50 p-2 rounded border border-gray-100">
                                                    {displayConfigP1.showDiemHT && <div>HT: <b className="text-gray-800">{c.diemHT}</b></div>}
                                                    {displayConfigP1.showDiemHT && displayConfigP1.showDiemRL && <div className="w-px h-3 bg-gray-300"></div>}
                                                    {displayConfigP1.showDiemRL && <div>RL: <b className="text-gray-800">{c.diemRL}</b></div>}
                                                </div>
                                              )}
                                              
                                              {displayConfigP1.showThanhTich && c.thanhTich && (
                                                <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 flex items-start gap-1.5">
                                                  <Award className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>
                                                  <span>{c.thanhTich}</span>
                                                </div>
                                              )}

                                              {displayConfigP1.showTuDanhGia && c.tuDanhGia && (
                                                <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-100 flex items-start gap-1.5">
                                                  <Star className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>
                                                  <span>Tự đánh giá: <b>{c.tuDanhGia}</b></span>
                                                </div>
                                              )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                           <button onClick={() => setP1Votes(p => ({...p, [c.cccd]: VoteLevel1.KHONG_HOAN_THANH}))} className={`py-2 rounded text-xs font-semibold transition-all ${vote === VoteLevel1.KHONG_HOAN_THANH ? 'bg-red-600 text-white shadow-md ring-2 ring-red-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>K.H.Thành</button>
                                           <button onClick={() => setP1Votes(p => ({...p, [c.cccd]: VoteLevel1.HOAN_THANH}))} className={`py-2 rounded text-xs font-semibold transition-all ${vote === VoteLevel1.HOAN_THANH ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>Hoàn thành</button>
                                           <button onClick={() => setP1Votes(p => ({...p, [c.cccd]: VoteLevel1.HOAN_THANH_TOT}))} className={`py-2 rounded text-xs font-semibold transition-all ${vote === VoteLevel1.HOAN_THANH_TOT ? 'bg-green-600 text-white shadow-md ring-2 ring-green-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>Tốt</button>
                                        </div>
                                     </div>
                                  )
                               })}
                            </div>
                         )}
                      </div>
                   )
                })}
             </>
          ) : (
             <>
                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-red-900 p-6 rounded-xl shadow-lg mb-6 flex justify-between items-center relative overflow-hidden border border-yellow-400">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                   <div className="relative z-10">
                      <div className="text-xs opacity-90 uppercase tracking-wider font-bold text-red-800 mb-1">Số lượng bình bầu</div>
                      <div className="text-3xl font-black">{p2Selected.length} / {db.config.maxExcellentVotes} <span className="text-sm font-normal align-middle opacity-75">đồng chí</span></div>
                   </div>
                   <div className="relative z-10 bg-white/20 p-3 rounded-full">
                      <Star className="w-8 h-8 text-red-800 fill-red-800 animate-pulse" />
                   </div>
                </div>
                
                {p2DisplayData.length === 0 && (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                        <Search className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                        <p>Không tìm thấy ứng viên phù hợp với bộ lọc.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {p2DisplayData.map(c => {
                      const isSelected = p2Selected.includes(c.cccd);
                      return (
                         <div 
                           key={c.cccd}
                           onClick={() => {
                              if (isSelected) setP2Selected(prev => prev.filter(id => id !== c.cccd));
                              else {
                                 if (p2Selected.length >= db.config.maxExcellentVotes) showNotify(`Chỉ được chọn tối đa ${db.config.maxExcellentVotes} người`, 'error');
                                 else setP2Selected(prev => [...prev, c.cccd]);
                              }
                           }}
                           className={`relative bg-white rounded-xl p-5 border-2 transition-all cursor-pointer group hover:shadow-lg ${isSelected ? 'border-yellow-500 bg-yellow-50/50 shadow-md ring-1 ring-yellow-500/30' : 'border-gray-200 hover:border-yellow-300'}`}
                         >
                            {/* Proposal Badge - Controlled by P2 Display Config */}
                            {displayConfigP2.showChiBoDeXuat && c.chiBoDeXuat && (
                               <div className="absolute -top-3 left-4 bg-[#BE1E2D] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-yellow-500 z-10 flex items-center gap-1">
                                  <ThumbsUp className="w-3 h-3"/> Đề xuất: {c.chiBoDeXuat}
                               </div>
                            )}

                            <div className="flex justify-between items-start mt-2">
                               <div className="flex-1 pr-2">
                                  <div className={`font-bold text-lg mb-0.5 ${isSelected ? 'text-[#BE1E2D]' : 'text-gray-800'}`}>{c.hoTen}</div>
                                  <div className="text-xs text-gray-500 font-medium flex flex-col gap-1">
                                      {displayConfigP2.showKhoa && <span>{c.khoa}</span>}
                                      <div className="flex flex-wrap gap-x-2 gap-y-1 text-gray-400 font-normal">
                                        {displayConfigP2.showMSSV && c.mssv && <span>{c.mssv}</span>}
                                        {displayConfigP2.showChucVu && c.chucVu && <span>• {c.chucVu}</span>}
                                        {displayConfigP2.showCCCD && <span>• ID: {c.cccd}</span>}
                                        {displayConfigP2.showNhom && <span>• {c.nhom}</span>}
                                        {displayConfigP2.showLoaiDangVien && <span>• {c.loaiDangVien}</span>}
                                      </div>
                                  </div>
                                  
                                  {/* Info Chips - Controlled by P2 Display Config */}
                                  {(displayConfigP2.showDiemHT || displayConfigP2.showDiemRL) && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {displayConfigP2.showDiemHT && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">HT: {c.diemHT}</span>}
                                        {displayConfigP2.showDiemRL && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">RL: {c.diemRL}</span>}
                                    </div>
                                  )}

                                  {/* Thanh Tich - Controlled by P2 Display Config */}
                                  {displayConfigP2.showThanhTich && c.thanhTich && (
                                     <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-100 flex items-start gap-1">
                                        <Award className="w-3 h-3 flex-shrink-0"/>
                                        <span className="line-clamp-2">{c.thanhTich}</span>
                                     </div>
                                  )}
                               </div>
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${isSelected ? 'bg-yellow-500 text-white scale-110' : 'bg-gray-100 text-gray-300 group-hover:bg-yellow-100 group-hover:text-yellow-400'}`}>
                                  <Check className="w-5 h-5" strokeWidth={3} />
                               </div>
                            </div>
                         </div>
                      )
                   })}
                </div>
             </>
          )}
       </div>

       {/* Footer */}
       <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 z-[50] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
             {step === 'p1' ? (
                <>
                   <div className="text-xs text-gray-500 font-medium hidden sm:block">
                      Hoàn thành: <b className="text-gray-900">{Object.keys(p1Votes).length}</b> / {candidatesP1.length}
                   </div>
                   <Button onClick={handlePreSubmitP1} disabled={isSubmitting} className="w-full sm:w-auto bg-[#BE1E2D] hover:bg-[#991B1B] text-white shadow-lg shadow-red-900/20 px-8 py-3 text-base flex items-center justify-center gap-2">
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin"/>}
                      {isSubmitting ? 'Đang gửi...' : 'Gửi kết quả'}
                   </Button>
                </>
             ) : (
                <>
                   <Button variant="outline" onClick={() => setP2Selected([])} disabled={isSubmitting} className="border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-200">Xóa chọn</Button>
                   <Button onClick={handlePreSubmitP2} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg shadow-yellow-900/20 py-3 text-base flex items-center justify-center gap-2 font-bold border border-yellow-400">
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin"/>}
                      {isSubmitting ? 'Đang gửi...' : 'Hoàn thành bầu cử'}
                   </Button>
                </>
             )}
          </div>
       </div>
    </div>
  );
};