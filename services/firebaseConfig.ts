// --- CẤU HÌNH FIREBASE ---
// Đã được cập nhật thông tin từ project: quan-ly-chi-bo-4ea6b

export const firebaseConfig = {
    apiKey: "AIzaSyBpFRM3vgdTIwlRXe6uR6Oxk9Dr2hEOoCo",
    authDomain: "quan-ly-chi-bo-4ea6b.firebaseapp.com",
    databaseURL: "https://quan-ly-chi-bo-4ea6b-default-rtdb.firebaseio.com",
    projectId: "quan-ly-chi-bo-4ea6b",
    storageBucket: "quan-ly-chi-bo-4ea6b.firebasestorage.app",
    messagingSenderId: "1043830977640",
    appId: "1:1043830977640:web:63c57c51a0589c826a37dd",
    measurementId: "G-E7H6HTHXVB"
  };
  
  // Kiểm tra cấu hình hợp lệ
  export const isFirebaseConfigured = () => {
    return firebaseConfig.apiKey !== "DÁN_API_KEY_CỦA_BẠN_VÀO_ĐÂY" && firebaseConfig.databaseURL !== "";
  };