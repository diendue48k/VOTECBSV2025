import * as XLSX from 'xlsx';
import { Voter, CandidatePhase1, CandidatePhase2 } from '../types';

// Hàm lấy đối tượng XLSX an toàn cho cả môi trường ESM và CommonJS (CDN)
const getXLSX = (): any => {
  // @ts-ignore
  if (XLSX.read) return XLSX;
  // @ts-ignore
  if (XLSX.default && XLSX.default.read) return XLSX.default;
  return XLSX;
};

// Hàm ánh xạ tiêu đề cột từ tiếng Việt sang key trong code
// Chấp nhận: "Họ tên", "Họ Tên", "  Họ tên  "
const mapKeys = (row: any, map: Record<string, string>): any => {
  const newRow: any = {};
  const rowKeys = Object.keys(row);
  
  for (const [vnKey, enKey] of Object.entries(map)) {
    // Tìm key trong row khớp với vnKey (không phân biệt hoa thường, khoảng trắng)
    const foundKey = rowKeys.find(k => k.trim().toLowerCase().includes(vnKey.toLowerCase()));
    if (foundKey) {
      newRow[enKey] = row[foundKey];
    }
  }
  return newRow;
};

export const readVoters = (file: File): Promise<Voter[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const X = getXLSX();
        const data = e.target?.result;
        const workbook = X.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = X.utils.sheet_to_json(sheet);

        const mappedData = json.map((row: any) => {
          const mapped = mapKeys(row, {
            'cccd': 'cccd',
            'mssv': 'mssv',
            'họ tên': 'hoTen',
            'ngày vào': 'ngayVaoDang',
            'chính thức': 'loaiDangVien',
            'nhóm': 'nhom'
          });
          
          if(!mapped.cccd || !mapped.hoTen) return null;

          return {
            cccd: String(mapped.cccd).trim(),
            mssv: mapped.mssv ? String(mapped.mssv).trim() : '',
            hoTen: mapped.hoTen,
            ngayVaoDang: mapped.ngayVaoDang || '',
            loaiDangVien: mapped.loaiDangVien || '',
            nhom: mapped.nhom || '',
            hasVotedPhase1: false,
            hasVotedPhase2: false
          };
        }).filter(Boolean) as Voter[];

        resolve(mappedData);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsBinaryString(file);
  });
};

export const readCandidatesP1 = (file: File): Promise<CandidatePhase1[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const X = getXLSX();
        const data = e.target?.result;
        const workbook = X.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = X.utils.sheet_to_json(sheet);

        const mappedData = json.map((row: any) => {
          const mapped = mapKeys(row, {
            'cccd': 'cccd',
            'mssv': 'mssv',
            'họ tên': 'hoTen',
            'ngày vào': 'ngayVaoDang',
            'chính thức': 'loaiDangVien',
            'nhóm': 'nhom',
            'khóa': 'khoa',
            'chức vụ': 'chucVu',
            'điểm ht': 'diemHT',
            'điểm rl': 'diemRL',
            'thành tích': 'thanhTich',
            'tự đánh giá': 'tuDanhGia',
            'mức độ htnv': 'tuDanhGia'
          });
          if(!mapped.cccd) return null;
          
          return {
            ...mapped,
            cccd: String(mapped.cccd).trim(),
            mssv: mapped.mssv ? String(mapped.mssv).trim() : '',
            tuDanhGia: mapped.tuDanhGia || ''
          };
        }).filter(Boolean) as CandidatePhase1[];
        resolve(mappedData);
      } catch (err) { reject(err); }
    };
    reader.readAsBinaryString(file);
  });
};

export const readCandidatesP2 = (file: File): Promise<CandidatePhase2[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const X = getXLSX();
        const data = e.target?.result;
        const workbook = X.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = X.utils.sheet_to_json(sheet);

        const mappedData = json.map((row: any) => {
          const mapped = mapKeys(row, {
            'cccd': 'cccd',
            'mssv': 'mssv',
            'họ tên': 'hoTen',
            'ngày vào': 'ngayVaoDang',
            'chính thức': 'loaiDangVien',
            'nhóm': 'nhom',
            'khóa': 'khoa',
            'chức vụ': 'chucVu',
            'điểm ht': 'diemHT',
            'điểm rl': 'diemRL',
            'thành tích': 'thanhTich',
            'đề xuất': 'chiBoDeXuat'
          });
          if(!mapped.cccd) return null;

          return {
            ...mapped,
            cccd: String(mapped.cccd).trim(),
            mssv: mapped.mssv ? String(mapped.mssv).trim() : '',
            tuDanhGia: '' // P2 doesn't strictly need this but good to have
          };
        }).filter(Boolean) as CandidatePhase2[];
        resolve(mappedData);
      } catch (err) { reject(err); }
    };
    reader.readAsBinaryString(file);
  });
};

export const exportToExcel = (data: any[], fileName: string) => {
  try {
    const X = getXLSX();
    const ws = X.utils.json_to_sheet(data);
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, "Result");
    X.writeFile(wb, `${fileName}.xlsx`);
  } catch (e) {
    console.error("Export error", e);
    alert("Lỗi xuất file Excel. Vui lòng thử lại.");
  }
};

export const downloadTemplate = (type: 'voters' | 'p1' | 'p2') => {
  let headers = [];
  let name = "";
  if (type === 'voters') {
    headers = [{ 'CCCD': '0123456789', 'MSSV': 'B123456', 'Họ tên': 'Nguyễn Văn A', 'Ngày vào Đảng': '03/02/2020', 'Chính thức/Dự bị': 'Chính thức', 'Nhóm': 'Chi bộ 1' }];
    name = "Mau_DS_Cu_Tri";
  } else if (type === 'p1') {
    headers = [{ 
      'CCCD': '0123456789', 
      'MSSV': 'B123456', 
      'Họ tên': 'Nguyễn Văn A', 
      'Ngày vào Đảng': '03/02/2020', 
      'Chính thức/Dự bị': 'Chính thức', 
      'Nhóm': 'Chi bộ 1', 
      'Khóa': 'K46', 
      'Chức vụ': 'Đảng viên', 
      'Điểm HT': 90, 
      'Điểm RL': 85, 
      'Thành tích': 'Giấy khen',
      'Tự đánh giá mức độ HTNV': 'Hoàn thành tốt'
    }];
    name = "Mau_DS_Bau_P1";
  } else {
    headers = [{ 'CCCD': '0123456789', 'MSSV': 'B123456', 'Họ tên': 'Nguyễn Văn A', 'Ngày vào Đảng': '03/02/2020', 'Chính thức/Dự bị': 'Chính thức', 'Nhóm': 'Chi bộ 1', 'Khóa': 'K46', 'Chức vụ': 'Đảng viên', 'Điểm HT': 90, 'Điểm RL': 85, 'Thành tích': 'Giấy khen', 'Chi bộ đề xuất': 'Xuất sắc' }];
    name = "Mau_DS_Bau_P2";
  }
  exportToExcel(headers, name);
}