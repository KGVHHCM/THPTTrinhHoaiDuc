// ============================================================
// FILE: assets/js/sach.js
// MỤC ĐÍCH: Lấy danh sách sách (bảng Supabase "sach") và tạo HTML
// cho từng thẻ sách, dùng ở khu vực carousel "Giới thiệu sách"
// trên trang thu-vien.html. Tách riêng 1 file (giống gallery.js,
// posts.js) để sau này trang khác cần hiển thị sách thì chỉ cần
// nhúng thêm file này, không phải copy lại code.
//
// PHỤ THUỘC: cần supabase-client.js (biến supabaseClient) và
// render-card.js (hàm thoatHtml) đã được nhúng TRƯỚC file này.
// ============================================================

// ------------------------------------------------------------
// HÀM: layDanhSachSach
// MỤC ĐÍCH: Truy vấn bảng "sach" trên Supabase, chỉ lấy sách có
// da_xuat_ban = true, sắp xếp theo cột thu_tu tăng dần (thu_tu
// càng nhỏ càng hiện trước trong carousel).
//
// TRẢ VỀ: { thanhCong: boolean, mangSach: Array }
// ------------------------------------------------------------
async function layDanhSachSach() {
  const { data, error } = await supabaseClient
    .from("sach")
    .select("*")
    .eq("da_xuat_ban", true)
    .order("thu_tu", { ascending: true });

  if (error) {
    console.error("Lỗi khi tải danh sách sách:", error);
    return { thanhCong: false, mangSach: [] };
  }

  return { thanhCong: true, mangSach: data || [] };
}

// ------------------------------------------------------------
// HÀM: taoHtmlTheSach
// MỤC ĐÍCH: Sinh HTML cho 1 thẻ sách trong carousel. Nếu sách có
// link_doc thì bọc cả thẻ trong 1 liên kết mở ở tab mới (đọc/tải
// sách); nếu không có link_doc thì chỉ hiển thị thông tin, không
// bấm được (dùng <div> thay vì <a>, tránh liên kết "chết" gây
// khó hiểu cho người xem).
//
// THAM SỐ: sach - 1 bản ghi từ bảng "sach"
//   (id, ten_sach, tac_gia, anh_bia, mo_ta, link_doc, thu_tu, da_xuat_ban)
// TRẢ VỀ: chuỗi HTML của 1 thẻ sách
// ------------------------------------------------------------
function taoHtmlTheSach(sach) {
  // Ảnh bìa: nếu sách chưa có anh_bia, hiện khung thay thế có icon
  // quyển sách mờ, đồng bộ cách xử lý "chưa có ảnh" như thẻ bài viết
  // (.the-bai-viet-anh-rong) ở style.css mục 11
  const anhBia = sach.anh_bia
    ? `<img src="${thoatHtml(sach.anh_bia)}" alt="${thoatHtml(sach.ten_sach)}" loading="lazy" />`
    : `<div class="the-sach-anh-rong" aria-hidden="true">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
           <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5v-18Z" />
           <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
         </svg>
       </div>`;

  const noiDungThe = `
    <div class="the-sach-anh">${anhBia}</div>
    <div class="the-sach-noidung">
      <h3>${thoatHtml(sach.ten_sach)}</h3>
      ${sach.tac_gia ? `<p class="the-sach-tacgia">${thoatHtml(sach.tac_gia)}</p>` : ""}
      ${sach.mo_ta ? `<p class="the-sach-mota">${thoatHtml(sach.mo_ta)}</p>` : ""}
    </div>
  `;

  if (sach.link_doc) {
    return `
      <a
        href="${thoatHtml(sach.link_doc)}"
        target="_blank"
        rel="noopener noreferrer"
        class="the-sach the-sach-lienket"
      >
        ${noiDungThe}
      </a>
    `;
  }

  return `<div class="the-sach">${noiDungThe}</div>`;
}

// ============================================================
// CÁC HÀM DƯỚI ĐÂY DÙNG RIÊNG CHO KHU VỰC ADMIN (quan-ly-sach.html,
// sach-form.html). Khác với layDanhSachSach() ở trên (chỉ lấy sách
// đã xuất bản, dùng cho trang public), các hàm này thao tác trực
// tiếp lên bảng "sach" không lọc da_xuat_ban, vì admin cần thấy và
// sửa được cả sách đang ẩn.
// ============================================================

// ------------------------------------------------------------
// HÀM: layToanBoSachAdmin
// MỤC ĐÍCH: Lấy TẤT CẢ sách (không lọc da_xuat_ban), sắp xếp theo
// thu_tu tăng dần, dùng cho bảng danh sách trong quan-ly-sach.html
// ------------------------------------------------------------
async function layToanBoSachAdmin() {
  const { data, error } = await supabaseClient
    .from("sach")
    .select("*")
    .order("thu_tu", { ascending: true });

  if (error) {
    console.error("Lỗi khi tải toàn bộ sách (admin):", error);
    return { thanhCong: false, mangSach: [] };
  }

  return { thanhCong: true, mangSach: data || [] };
}

// ------------------------------------------------------------
// HÀM: layMotSach
// MỤC ĐÍCH: Lấy đúng 1 bản ghi sách theo id, dùng để đổ dữ liệu lên
// form khi admin bấm "Sửa" trong quan-ly-sach.html
//
// THAM SỐ: id - id (uuid) của sách cần lấy
// TRẢ VỀ: { thanhCong: boolean, sach: object|null }
// ------------------------------------------------------------
async function layMotSach(id) {
  const { data, error } = await supabaseClient
    .from("sach")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Lỗi khi tải chi tiết sách:", error);
    return { thanhCong: false, sach: null };
  }

  return { thanhCong: true, sach: data };
}

// ------------------------------------------------------------
// HÀM: luuSach
// MỤC ĐÍCH: Lưu 1 bản ghi sách — nếu có "id" thì UPDATE bản ghi
// đang có, nếu không có "id" (tạo mới) thì INSERT bản ghi mới.
// Gộp chung 2 trường hợp thêm/sửa vào 1 hàm để sach-form.html dùng
// lại được cho cả 2 chế độ, không phải viết 2 hàm gần giống nhau.
//
// THAM SỐ:
//   duLieu - object chứa các cột cần lưu (ten_sach, tac_gia, anh_bia,
//            mo_ta, link_doc, thu_tu, da_xuat_ban)
//   id     - id của sách cần sửa; truyền null/undefined nếu là thêm mới
// TRẢ VỀ: { thanhCong: boolean, loi: string|null }
// ------------------------------------------------------------
async function luuSach(duLieu, id) {
  let error;

  if (id) {
    ({ error } = await supabaseClient.from("sach").update(duLieu).eq("id", id));
  } else {
    ({ error } = await supabaseClient.from("sach").insert(duLieu));
  }

  if (error) {
    console.error("Lỗi khi lưu sách:", error);
    return { thanhCong: false, loi: error.message };
  }

  return { thanhCong: true, loi: null };
}

// ------------------------------------------------------------
// HÀM: xoaSach
// MỤC ĐÍCH: Xoá hẳn 1 bản ghi sách khỏi bảng "sach" theo id
//
// THAM SỐ: id - id của sách cần xoá
// TRẢ VỀ: { thanhCong: boolean }
// ------------------------------------------------------------
async function xoaSach(id) {
  const { error } = await supabaseClient.from("sach").delete().eq("id", id);

  if (error) {
    console.error("Lỗi khi xoá sách:", error);
    return { thanhCong: false };
  }

  return { thanhCong: true };
}

// ------------------------------------------------------------
// HÀM: uploadFilePdfSach
// MỤC ĐÍCH: Upload 1 file PDF lên Supabase Storage (bucket
// "file-pdf-sach"), trả về URL công khai để lưu vào cột "file_pdf"
// của bảng "sach". Bucket này cần được tạo sẵn ở Supabase Dashboard
// (Storage) và đặt chế độ "Public" thì getPublicUrl() mới xem/tải
// được trực tiếp.
//
// THAM SỐ: file - đối tượng File lấy từ <input type="file">
// TRẢ VỀ: { thanhCong: boolean, url: string|null, loi: string|null }
// ------------------------------------------------------------
async function uploadFilePdfSach(file) {
  try {
    // Đặt tên file kèm timestamp để tránh trùng tên khi 2 sách khác
    // nhau lỡ có file cùng tên gốc; đồng thời lọc bỏ ký tự lạ/dấu
    // tiếng Việt trong tên file (Supabase Storage không nhận đường
    // dẫn có 1 số ký tự đặc biệt)
    const tenFileAnToan = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const duongDan = `sach/${tenFileAnToan}`;

    const { error: loiUpload } = await supabaseClient.storage
      .from("file-pdf-sach")
      .upload(duongDan, file, { cacheControl: "3600", upsert: false });

    if (loiUpload) {
      console.error("Lỗi khi upload file PDF sách:", loiUpload);
      return { thanhCong: false, url: null, loi: loiUpload.message };
    }

    const { data } = supabaseClient.storage.from("file-pdf-sach").getPublicUrl(duongDan);

    return { thanhCong: true, url: data.publicUrl, loi: null };
  } catch (loi) {
    console.error("Lỗi khi upload file PDF sách:", loi);
    return { thanhCong: false, url: null, loi: loi.message };
  }
}