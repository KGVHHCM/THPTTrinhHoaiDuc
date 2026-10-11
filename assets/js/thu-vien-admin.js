// ============================================================
// FILE: assets/js/thu-vien-admin.js
// MỤC ĐÍCH: Toàn bộ hàm làm việc với Supabase cho mục "Quản lý thư viện"
// (album + ảnh + video do admin tự đăng) và các hàm xử lý phụ trợ:
//   - nén ảnh trước khi tải lên Storage
//   - nhận diện link video (YouTube / Facebook / Google Drive / file .mp4)
//
// Quy ước trả về giống các file API khác của dự án:
//   { thanhCong: true,  duLieu: ... }  hoặc  { thanhCong: false, loi: "..." }
//
// PHẢI nhúng SAU supabase-client.js (cần biến toàn cục supabaseClient).
// Tên hàm đều có đuôi "ThuVien" để KHÔNG trùng với hàm ở file khác.
// ============================================================

const TEN_BUCKET_THU_VIEN = "thu-vien";
const ANH_TOI_DA_PX = 1920;      // cạnh dài nhất của ảnh gốc sau khi nén
const THUMB_TOI_DA_PX = 480;     // cạnh dài nhất của ảnh nhỏ (cho lưới)
const CHAT_LUONG_ANH = 0.82;     // chất lượng JPEG (0 -> 1)
const DUNG_LUONG_FILE_TOI_DA = 25 * 1024 * 1024; // chặn file > 25MB trước khi nén


// ------------------------------------------------------------
// TIỆN ÍCH CHUNG
// ------------------------------------------------------------

// Chống chèn mã HTML khi in dữ liệu người dùng nhập ra giao diện
function thoatHtmlThuVien(chuoi) {
  return String(chuoi === null || chuoi === undefined ? "" : chuoi)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 1536000 -> "1.5 MB"
function dinhDangDungLuongThuVien(soByte) {
  const b = Number(soByte) || 0;
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + " MB";
  return (b / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

// "di tích, lễ kỷ niệm,  2024" -> ["di tích", "lễ kỷ niệm", "2024"] (bỏ trùng, bỏ rỗng)
function tachTheTuChuoiThuVien(chuoi) {
  const mang = String(chuoi || "")
    .split(",")
    .map(function (t) { return t.trim(); })
    .filter(function (t) { return t.length > 0; });
  return Array.from(new Set(mang));
}

function laLinkHopLeThuVien(chuoi) {
  try {
    const u = new URL(chuoi);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
}


// ------------------------------------------------------------
// ALBUM
// ------------------------------------------------------------
async function layDanhSachAlbumThuVien() {
  const { data, error } = await supabaseClient
    .from("thu_vien_album")
    .select("*")
    .order("thu_tu", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return { thanhCong: false, loi: error.message };
  return { thanhCong: true, duLieu: data };
}

async function themAlbumThuVien(duLieu) {
  const { data, error } = await supabaseClient
    .from("thu_vien_album")
    .insert(duLieu)
    .select()
    .single();

  if (error) return { thanhCong: false, loi: error.message };
  return { thanhCong: true, duLieu: data };
}

async function suaAlbumThuVien(id, duLieu) {
  const { error } = await supabaseClient
    .from("thu_vien_album")
    .update(duLieu)
    .eq("id", id);

  if (error) return { thanhCong: false, loi: error.message };
  return { thanhCong: true };
}

// Xoá album: ảnh/video bên trong KHÔNG bị xoá, chỉ chuyển về "Chưa có album"
// (do khoá ngoại ON DELETE SET NULL trong thu-vien.sql)
async function xoaAlbumThuVien(id) {
  const { error } = await supabaseClient
    .from("thu_vien_album")
    .delete()
    .eq("id", id);

  if (error) return { thanhCong: false, loi: error.message };
  return { thanhCong: true };
}


// ------------------------------------------------------------
// MEDIA (ẢNH + VIDEO)
// ------------------------------------------------------------

// Lấy TOÀN BỘ (cả nháp), đúng thứ tự hiển thị: thu_tu tăng dần, bằng nhau
// thì mục mới hơn lên trước
async function layDanhSachMediaThuVien() {
  const { data, error } = await supabaseClient
    .from("thu_vien_media")
    .select("*")
    .order("thu_tu", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return { thanhCong: false, loi: error.message };
  return { thanhCong: true, duLieu: data };
}

async function themMediaThuVien(duLieu) {
  const { data, error } = await supabaseClient
    .from("thu_vien_media")
    .insert(duLieu)
    .select()
    .single();

  if (error) return { thanhCong: false, loi: error.message };
  return { thanhCong: true, duLieu: data };
}

async function suaMediaThuVien(id, duLieu) {
  const { error } = await supabaseClient
    .from("thu_vien_media")
    .update(duLieu)
    .eq("id", id);

  if (error) return { thanhCong: false, loi: error.message };
  return { thanhCong: true };
}

// Sửa cùng 1 giá trị cho NHIỀU mục (thao tác hàng loạt)
async function suaNhieuMediaThuVien(mangId, duLieu) {
  if (!mangId.length) return { thanhCong: true };
  const { error } = await supabaseClient
    .from("thu_vien_media")
    .update(duLieu)
    .in("id", mangId);

  if (error) return { thanhCong: false, loi: error.message };
  return { thanhCong: true };
}

// Lưu thứ tự mới: mangCapNhat = [{ id, thu_tu }, ...]
// (dùng nhiều lệnh update song song thay vì upsert, vì upsert yêu cầu
// đủ các cột bắt buộc khác)
async function datThuTuMediaThuVien(mangCapNhat) {
  if (!mangCapNhat.length) return { thanhCong: true };

  const ketQua = await Promise.all(
    mangCapNhat.map(function (muc) {
      return supabaseClient
        .from("thu_vien_media")
        .update({ thu_tu: muc.thu_tu })
        .eq("id", muc.id);
    })
  );

  const loi = ketQua.find(function (kq) { return kq.error; });
  if (loi) return { thanhCong: false, loi: loi.error.message };
  return { thanhCong: true };
}

// Xoá file trên Storage (bỏ qua nếu mảng rỗng)
async function xoaFileStorageThuVien(mangDuongDan) {
  const ds = mangDuongDan.filter(Boolean);
  if (!ds.length) return { thanhCong: true };

  const { error } = await supabaseClient.storage
    .from(TEN_BUCKET_THU_VIEN)
    .remove(ds);

  if (error) return { thanhCong: false, loi: error.message };
  return { thanhCong: true };
}

// Xoá an toàn: xoá file trên Storage TRƯỚC (nếu có), rồi mới xoá dòng
// trong bảng. Nhận vào mảng các đối tượng media đầy đủ.
async function xoaNhieuMediaThuVien(mangMedia) {
  if (!mangMedia.length) return { thanhCong: true };

  const duongDan = [];
  mangMedia.forEach(function (m) {
    if (m.duong_dan_storage) duongDan.push(m.duong_dan_storage);
    if (m.duong_dan_thumb_storage) duongDan.push(m.duong_dan_thumb_storage);
  });

  const kqStorage = await xoaFileStorageThuVien(duongDan);

  const { error } = await supabaseClient
    .from("thu_vien_media")
    .delete()
    .in("id", mangMedia.map(function (m) { return m.id; }));

  if (error) return { thanhCong: false, loi: error.message };

  // Dòng đã xoá nhưng file còn sót trên Storage -> vẫn báo thành công,
  // kèm cảnh báo để giao diện nhắc người dùng
  if (!kqStorage.thanhCong) {
    return { thanhCong: true, canhBao: "Đã xoá dữ liệu nhưng chưa xoá được file trên Storage: " + kqStorage.loi };
  }
  return { thanhCong: true };
}


// ------------------------------------------------------------
// ẢNH: NÉN + TẢI LÊN STORAGE
// ------------------------------------------------------------

function docAnhTuFileThuVien(file) {
  return new Promise(function (giaiQuyet, tuChoi) {
    const duongDanTam = URL.createObjectURL(file);
    const anh = new Image();
    anh.onload = function () {
      URL.revokeObjectURL(duongDanTam);
      giaiQuyet(anh);
    };
    anh.onerror = function () {
      URL.revokeObjectURL(duongDanTam);
      tuChoi(new Error("Không đọc được ảnh (định dạng không được hỗ trợ?)"));
    };
    anh.src = duongDanTam;
  });
}

// Vẽ ảnh lên canvas với cạnh dài nhất = canhToiDa rồi xuất JPEG.
// Ảnh nhỏ hơn canhToiDa thì giữ nguyên kích thước (không phóng to).
function nenAnhThanhBlobThuVien(anh, canhToiDa) {
  return new Promise(function (giaiQuyet, tuChoi) {
    const tyLe = Math.min(1, canhToiDa / Math.max(anh.naturalWidth, anh.naturalHeight));
    const rong = Math.max(1, Math.round(anh.naturalWidth * tyLe));
    const cao = Math.max(1, Math.round(anh.naturalHeight * tyLe));

    const canvas = document.createElement("canvas");
    canvas.width = rong;
    canvas.height = cao;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // nền trắng cho ảnh PNG trong suốt (JPEG không có nền trong suốt)
    ctx.fillRect(0, 0, rong, cao);
    ctx.drawImage(anh, 0, 0, rong, cao);

    canvas.toBlob(function (blob) {
      if (blob) giaiQuyet(blob);
      else tuChoi(new Error("Không nén được ảnh"));
    }, "image/jpeg", CHAT_LUONG_ANH);
  });
}

async function upLenStorageThuVien(duongDan, blob, kieuFile) {
  const { error } = await supabaseClient.storage
    .from(TEN_BUCKET_THU_VIEN)
    .upload(duongDan, blob, {
      contentType: kieuFile,
      cacheControl: "31536000",
      upsert: false
    });
  if (error) throw new Error(error.message);

  const { data } = supabaseClient.storage
    .from(TEN_BUCKET_THU_VIEN)
    .getPublicUrl(duongDan);
  return data.publicUrl;
}

// Tải 1 ảnh lên Storage: nén ảnh gốc (<= 1920px) + tạo ảnh nhỏ (<= 480px).
// File GIF giữ nguyên (nén sẽ làm mất hoạt ảnh), không có ảnh nhỏ riêng.
//
// TRẢ VỀ: { thanhCong, duLieu: { url, urlThumb, duongDan, duongDanThumb, dungLuong } }
async function taiAnhLenStorageThuVien(file) {
  if (file.size > DUNG_LUONG_FILE_TOI_DA) {
    return { thanhCong: false, loi: "Ảnh lớn hơn 25MB, hãy chọn ảnh nhỏ hơn" };
  }

  const daUp = []; // để dọn dẹp nếu có bước sau bị lỗi
  try {
    const nam = new Date().getFullYear();
    const dinhDanh = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const goc = "anh/" + nam + "/" + dinhDanh;

    // ----- GIF: giữ nguyên -----
    if (file.type === "image/gif") {
      const duongDan = goc + ".gif";
      const url = await upLenStorageThuVien(duongDan, file, "image/gif");
      return {
        thanhCong: true,
        duLieu: { url: url, urlThumb: url, duongDan: duongDan, duongDanThumb: null, dungLuong: file.size }
      };
    }

    // ----- Ảnh thường: nén -----
    const anh = await docAnhTuFileThuVien(file);
    const blobLon = await nenAnhThanhBlobThuVien(anh, ANH_TOI_DA_PX);
    const blobNho = await nenAnhThanhBlobThuVien(anh, THUMB_TOI_DA_PX);

    const duongDan = goc + ".jpg";
    const duongDanThumb = goc + "-thumb.jpg";

    const url = await upLenStorageThuVien(duongDan, blobLon, "image/jpeg");
    daUp.push(duongDan);
    const urlThumb = await upLenStorageThuVien(duongDanThumb, blobNho, "image/jpeg");
    daUp.push(duongDanThumb);

    return {
      thanhCong: true,
      duLieu: {
        url: url,
        urlThumb: urlThumb,
        duongDan: duongDan,
        duongDanThumb: duongDanThumb,
        dungLuong: blobLon.size + blobNho.size
      }
    };
  } catch (e) {
    await xoaFileStorageThuVien(daUp); // dọn file đã lỡ tải lên
    return { thanhCong: false, loi: e.message };
  }
}


// ------------------------------------------------------------
// VIDEO: NHẬN DIỆN LINK
// ------------------------------------------------------------

// Phân tích link video người dùng dán vào.
// TRẢ VỀ: { thanhCong: true, duLieu: { loaiVideo, urlNhung, urlThumb } }
//      hoặc { thanhCong: false, loi }
function phanTichLinkVideoThuVien(link) {
  const lk = String(link || "").trim();
  if (!laLinkHopLeThuVien(lk)) {
    return { thanhCong: false, loi: "Link không hợp lệ (phải bắt đầu bằng http:// hoặc https://)" };
  }

  // YouTube: watch?v=, youtu.be/, shorts/, embed/, live/
  const khopYoutube = lk.match(
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
  );
  if (khopYoutube) {
    const id = khopYoutube[1];
    return {
      thanhCong: true,
      duLieu: {
        loaiVideo: "youtube",
        urlNhung: "https://www.youtube.com/embed/" + id,
        urlThumb: "https://img.youtube.com/vi/" + id + "/hqdefault.jpg"
      }
    };
  }

  // Google Drive: drive.google.com/file/d/<ID>/view
  const khopDrive = lk.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (khopDrive) {
    const id = khopDrive[1];
    return {
      thanhCong: true,
      duLieu: {
        loaiVideo: "drive",
        urlNhung: "https://drive.google.com/file/d/" + id + "/preview",
        urlThumb: "https://drive.google.com/thumbnail?id=" + id + "&sz=w640"
      }
    };
  }

  // Facebook: facebook.com/.../videos/..., fb.watch/..., facebook.com/reel/...
  if (/(?:^|\.)facebook\.com\//.test(lk.replace(/^https?:\/\//, "")) || /fb\.watch\//.test(lk)) {
    return {
      thanhCong: true,
      duLieu: {
        loaiVideo: "facebook",
        urlNhung: "https://www.facebook.com/plugins/video.php?href=" + encodeURIComponent(lk) + "&show_text=false&width=560",
        urlThumb: null // Facebook không cho lấy thumbnail công khai
      }
    };
  }

  // File video trực tiếp (.mp4, .webm, .ogg, .mov)
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(lk)) {
    return {
      thanhCong: true,
      duLieu: { loaiVideo: "file", urlNhung: lk, urlThumb: null }
    };
  }

  return {
    thanhCong: false,
    loi: "Chưa nhận diện được link video. Hỗ trợ: YouTube, Facebook, Google Drive hoặc link file .mp4/.webm"
  };
}

// Thử lấy tiêu đề video YouTube qua oEmbed (hỗ trợ CORS). Lỗi/quá 4 giây -> trả "".
async function layTieuDeYoutubeThuVien(link) {
  try {
    const dieuKhien = new AbortController();
    const hen = setTimeout(function () { dieuKhien.abort(); }, 4000);
    const phanHoi = await fetch(
      "https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(link),
      { signal: dieuKhien.signal }
    );
    clearTimeout(hen);
    if (!phanHoi.ok) return "";
    const json = await phanHoi.json();
    return json.title || "";
  } catch (e) {
    return "";
  }
}