// ============================================================
// FILE: assets/js/posts.js
// MỤC ĐÍCH: Chứa toàn bộ hàm gọi API Supabase liên quan đến
// BÀI VIẾT (bảng bai_viet) và UPLOAD FILE (ảnh + tài liệu PDF)
// lên Supabase Storage. Dùng chung cho cả trang public (đọc bài)
// và trang admin (thêm/sửa/xoá bài) — CẢ 2 khu vực quản lý
// "Tin tức & Hoạt động" (quan-ly-bai-viet.html) và "Tư liệu & Ký ức"
// (quan-ly-tu-lieu.html) đều dùng chung file này, vì cả 2 đều thao
// tác trên cùng 1 bảng bai_viet, chỉ khác nhau ở loai_bai_viet.
//
// File này PHẢI được nhúng SAU supabase-client.js trong HTML.
// ============================================================

// Tên bucket lưu trữ ẢNH bài viết trên Supabase Storage
const TEN_BUCKET_ANH = "anh-bai-viet";

// Tên bucket lưu trữ TÀI LIỆU ĐÍNH KÈM (PDF) — tách riêng khỏi
// bucket ảnh vì khác loại nội dung, dễ quản lý/dọn dẹp sau này.
// Dùng riêng cho mục "Tư liệu & Ký ức".
const TEN_BUCKET_TAI_LIEU = "tai-lieu-dinh-kem";

// ------------------------------------------------------------
// HÀM: layDanhSachBaiViet
// MỤC ĐÍCH: Lấy danh sách bài viết từ database, có thể lọc theo loại
//
// THAM SỐ:
//   - loaiBaiViet: chuỗi ('tin_tuc' | 'hoi_uc' | 'nghien_cuu' | 'ky_niem')
//                  hoặc null nếu muốn lấy TẤT CẢ các loại
//   - chiLayDaXuatBan: true = chỉ lấy bài đã xuất bản (dùng cho trang
//                      public); false = lấy CẢ bài nháp (dùng cho
//                      trang quản lý của admin để admin xem được bài
//                      chưa công khai)
//
// TRẢ VỀ: 1 Promise, resolve về { thanhCong, duLieu, loi }
//   - duLieu: mảng các bài viết (rỗng nếu không có hoặc bị lỗi)
// ------------------------------------------------------------
async function layDanhSachBaiViet(loaiBaiViet, chiLayDaXuatBan) {
  let cauTruyVan = supabaseClient
    .from("bai_viet")
    .select("*")
    .order("created_at", { ascending: false });

  if (loaiBaiViet) {
    cauTruyVan = cauTruyVan.eq("loai_bai_viet", loaiBaiViet);
  }

  if (chiLayDaXuatBan) {
    cauTruyVan = cauTruyVan.eq("da_xuat_ban", true);
  }

  const { data, error } = await cauTruyVan;

  if (error) {
    return { thanhCong: false, duLieu: [], loi: error.message };
  }

  return { thanhCong: true, duLieu: data, loi: "" };
}

// ------------------------------------------------------------
// HÀM: layChiTietBaiViet
// MỤC ĐÍCH: Lấy thông tin đầy đủ của 1 bài viết dựa theo id
// ------------------------------------------------------------
async function layChiTietBaiViet(id) {
  const { data, error } = await supabaseClient
    .from("bai_viet")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { thanhCong: false, duLieu: null, loi: error.message };
  }

  return { thanhCong: true, duLieu: data, loi: "" };
}

// ------------------------------------------------------------
// HÀM: themBaiViet
// MỤC ĐÍCH: Thêm 1 bài viết mới vào database
// ------------------------------------------------------------
async function themBaiViet(duLieuBaiViet) {
  const { data, error } = await supabaseClient
    .from("bai_viet")
    .insert(duLieuBaiViet)
    .select()
    .single();

  if (error) {
    return { thanhCong: false, id: null, loi: error.message };
  }

  return { thanhCong: true, id: data.id, loi: "" };
}

// ------------------------------------------------------------
// HÀM: suaBaiViet
// MỤC ĐÍCH: Cập nhật thông tin 1 bài viết đã tồn tại
// ------------------------------------------------------------
async function suaBaiViet(id, duLieuBaiViet) {
  const duLieuCapNhat = {
    ...duLieuBaiViet,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient
    .from("bai_viet")
    .update(duLieuCapNhat)
    .eq("id", id);

  if (error) {
    return { thanhCong: false, loi: error.message };
  }

  return { thanhCong: true, loi: "" };
}

// ------------------------------------------------------------
// HÀM: xoaBaiViet
// MỤC ĐÍCH: Xoá vĩnh viễn 1 bài viết khỏi database
// ------------------------------------------------------------
async function xoaBaiViet(id) {
  const { error } = await supabaseClient.from("bai_viet").delete().eq("id", id);

  if (error) {
    return { thanhCong: false, loi: error.message };
  }

  return { thanhCong: true, loi: "" };
}

// ------------------------------------------------------------
// HÀM: uploadAnh
// MỤC ĐÍCH: Tải 1 file ảnh lên Supabase Storage (bucket anh-bai-viet)
// ------------------------------------------------------------
async function uploadAnh(file) {
  const phanDuoiFile = file.name.split(".").pop();
  const tenFileMoi =
    Date.now() + "-" + Math.round(Math.random() * 1e9) + "." + phanDuoiFile;

  const { error: loiUpload } = await supabaseClient.storage
    .from(TEN_BUCKET_ANH)
    .upload(tenFileMoi, file);

  if (loiUpload) {
    return { thanhCong: false, url: null, loi: loiUpload.message };
  }

  const { data } = supabaseClient.storage
    .from(TEN_BUCKET_ANH)
    .getPublicUrl(tenFileMoi);

  return { thanhCong: true, url: data.publicUrl, loi: "" };
}

// ------------------------------------------------------------
// HÀM: uploadFileDinhKem
// MỤC ĐÍCH: Tải 1 file PDF lên Supabase Storage (bucket
// tai-lieu-dinh-kem), trả về URL công khai để lưu vào cột
// file_dinh_kem của bài viết. Dùng riêng cho mục "Tư liệu & Ký ức".
//
// THAM SỐ:
//   - file: đối tượng File PDF lấy từ input type="file"
//
// TRẢ VỀ: 1 Promise, resolve về { thanhCong, url, loi }
// ------------------------------------------------------------
async function uploadFileDinhKem(file) {
  const phanDuoiFile = file.name.split(".").pop();
  const tenFileMoi =
    Date.now() + "-" + Math.round(Math.random() * 1e9) + "." + phanDuoiFile;

  const { error: loiUpload } = await supabaseClient.storage
    .from(TEN_BUCKET_TAI_LIEU)
    .upload(tenFileMoi, file);

  if (loiUpload) {
    return { thanhCong: false, url: null, loi: loiUpload.message };
  }

  const { data } = supabaseClient.storage
    .from(TEN_BUCKET_TAI_LIEU)
    .getPublicUrl(tenFileMoi);

  return { thanhCong: true, url: data.publicUrl, loi: "" };
}