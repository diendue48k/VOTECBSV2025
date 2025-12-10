import React, { useState } from 'react';
import { AdminPage } from './pages/Admin';
import { VoterPage } from './pages/Voter';
import { Shield, ChevronRight, Users } from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<'home' | 'admin' | 'voter'>('home');

  if (role === 'admin') {
    return <AdminPage onBack={() => setRole('home')} />;
  }

  if (role === 'voter') {
    return <VoterPage onLogout={() => setRole('home')} />;
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-[#fffef5] font-sans selection:bg-red-100 overflow-x-hidden">
      
      {/* Top Background Effects */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#BE1E2D] rounded-full blur-3xl opacity-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD700] rounded-full blur-3xl opacity-5 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
      
      {/* Top Line */}
      <div className="relative w-full h-2 bg-[#BE1E2D] shadow-sm flex">
        <div className="h-full w-1/3 bg-[#BE1E2D]"></div>
        <div className="h-full w-1/3 bg-[#FFD700]"></div>
        <div className="h-full w-1/3 bg-[#BE1E2D]"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 w-full max-w-7xl mx-auto z-10">
        
        {/* Header Section */}
        <div className="text-center space-y-4 mb-10 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {/* Logo from Google Drive - Converted to thumbnail link for reliability */}
           <div className="w-28 h-28 mx-auto mb-6 relative z-20 transition-transform hover:scale-105 duration-300 drop-shadow-md">
              <img 
                src="https://drive.google.com/thumbnail?id=1O7UZhqrJoTc6xac8yB05_laRxhZsfhom&sz=w1000" 
                alt="Logo Chi Bộ Sinh Viên" 
                className="w-full h-full object-contain"
              />
           </div>

           <div className="flex flex-col items-center gap-1">
             <h3 className="text-[#BE1E2D] font-bold uppercase tracking-wide text-sm md:text-base opacity-90">
               Đảng bộ trường Đại học Kinh Tế
             </h3>
             <h2 className="text-[#BE1E2D] font-black uppercase tracking-wider text-xl md:text-2xl lg:text-3xl mb-4 bg-white/50 backdrop-blur-sm px-4 py-1 rounded-lg border border-red-50/50 shadow-sm inline-block">
               Chi bộ sinh viên
             </h2>
             
             <div className="mt-4">
               <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-[#BE1E2D] leading-tight drop-shadow-sm uppercase">
                HỆ THỐNG ĐÁNH GIÁ, XẾP LOẠI <br/>
                <span className="text-[#D32F2F] relative inline-block mt-2">
                  ĐẢNG VIÊN NĂM 2025
                  <svg className="absolute w-full h-3 -bottom-2 left-0 text-[#FFD700]/60 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
                </span>
               </h1>
             </div>
           </div>

           <div className="flex items-center justify-center gap-4 mt-8">
              <div className="h-px w-8 md:w-16 bg-red-200"></div>
              <p className="text-gray-600 font-medium text-sm md:text-base tracking-wide">Minh bạch - Khách quan - Chính xác</p>
              <div className="h-px w-8 md:w-16 bg-red-200"></div>
           </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-10 w-full max-w-4xl px-2 mb-12">
          
          {/* Voter Card */}
          <div className="group bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden hover:shadow-2xl hover:border-red-300 transition-all duration-300 hover:-translate-y-1 flex flex-col relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#BE1E2D]"></div>
            <div className="bg-gradient-to-b from-red-50 to-white p-6 flex justify-center items-center relative overflow-hidden h-40 md:h-48">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               <div className="relative z-10 w-28 h-28 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-500 border-4 border-red-50">
                  <Users className="w-14 h-14 md:w-16 md:h-16 text-[#BE1E2D]" />
               </div>
            </div>
            <div className="p-6 md:p-8 flex-1 flex flex-col text-center relative z-10">
               <h3 className="text-2xl font-bold text-[#BE1E2D] mb-2 uppercase">Đảng Viên</h3>
               <p className="text-gray-500 text-sm mb-6 flex-1 leading-relaxed">Truy cập để thực hiện đánh giá xếp loại và bình bầu danh hiệu xuất sắc.</p>
               <button 
                onClick={() => setRole('voter')}
                className="w-full py-3.5 rounded-xl bg-[#BE1E2D] text-white font-bold hover:bg-[#991B1B] transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 group-hover:gap-3 hover:shadow-red-900/30"
               >
                 Đăng nhập ngay <ChevronRight className="w-4 h-4" />
               </button>
            </div>
          </div>

          {/* Admin Card */}
          <div className="group bg-white rounded-2xl shadow-xl border border-yellow-100 overflow-hidden hover:shadow-2xl hover:border-yellow-300 transition-all duration-300 hover:-translate-y-1 flex flex-col relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#FFD700]"></div>
            <div className="bg-gradient-to-b from-yellow-50 to-white p-6 flex justify-center items-center relative overflow-hidden h-40 md:h-48">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               <div className="relative z-10 w-28 h-28 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-500 border-4 border-yellow-50">
                  <Shield className="w-14 h-14 md:w-16 md:h-16 text-[#F59E0B]" />
               </div>
            </div>
            <div className="p-6 md:p-8 flex-1 flex flex-col text-center relative z-10">
               <h3 className="text-2xl font-bold text-[#B45309] mb-2 uppercase">Quản Trị Viên</h3>
               <p className="text-gray-500 text-sm mb-6 flex-1 leading-relaxed">Khu vực dành cho cấp ủy cấu hình hệ thống, nhập liệu và xuất báo cáo.</p>
               <button 
                onClick={() => setRole('admin')}
                className="w-full py-3.5 rounded-xl bg-[#FFD700] text-red-900 font-bold hover:bg-[#FCD34D] transition-all shadow-lg shadow-yellow-900/10 flex items-center justify-center gap-2 group-hover:gap-3 hover:shadow-yellow-900/20"
               >
                 Truy cập hệ thống <ChevronRight className="w-4 h-4" />
               </button>
            </div>
          </div>

        </div>

      </div>

      {/* Footer */}
      <div className="relative z-10 bg-[#BE1E2D] text-white py-6 mt-auto">
         <div className="container mx-auto px-6 text-center relative z-10">
            <p className="text-xs md:text-sm font-medium opacity-90 tracking-wide">
              © 2025 Bản quyền thuộc về Chi bộ Sinh viên</p>
         </div>
      </div>

    </div>
  );
};

export default App;