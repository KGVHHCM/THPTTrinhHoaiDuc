// ============================================================
// FILE: assets/js/tour-admin.js
// MỤC ĐÍCH: Chứa các hàm gọi API Supabase liên quan đến TOUR 360°:
//   - Phần 1 (bảng tour_scene): quản lý từng ảnh 360° / "điểm đứng"
//   - Phần 2 (bảng tour_hotspot, bổ sung ở cuối file): quản lý các
//     điểm nhấn (hotspot) đặt TRÊN từng ảnh 360°
// Dùng riêng cho trang admin/quan-ly-tour.html.
//
// File này PHẢI được nhúng SAU supabase-client.js trong HTML, vì
// mọi hàm bên dưới đều dùng biến toàn cục "supabaseClient".
// ============================================================

// Tên bucket Storage riêng cho ảnh 360°, TÁCH RIÊNG khỏi bucket
// "anh-bai-viet" (xem giải thích đầy đủ trong docs/storage-setup-tour.sql)
const TEN_BUCKET_ANH_360 = "anh-360";

// ------------------------------------------------------------
// HÀM: layDanhSachScene
// MỤC ĐÍCH: Lấy TOÀN BỘ scene từ database, sắp xếp theo cột thu_tu
// tăng dần (đúng thứ tự admin tự sắp xếp), nếu 2 scene có cùng
// thu_tu thì sắp thêm theo ngày tạo cũ nhất lên trước (tránh thứ tự
// bị đảo lộn ngẫu nhiên mỗi lần tải lại trang khi thu_tu trùng nhau)
//
// TRẢ VỀ: Promise, resolve về { thanhCong, duLieu, loi }
// ------------------------------------------------------------
async function layDanhSachScene() {
  const { data, error } = await supabaseClient
    .from("tour_scene")
    .select("*")
    .order("thu_tu", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return { thanhCong: false, duLieu: [], loi: error.message };
  }

  return { thanhCong: true, duLieu: data, loi: "" };
}

// ------------------------------------------------------------
// HÀM: layChiTietScene
// MỤC ĐÍCH: Lấy thông tin đầy đủ 1 scene theo id
//
// THAM SỐ: id - UUID của scene cần lấy
// TRẢ VỀ: Promise, resolve về { thanhCong, duLieu, loi }
// ------------------------------------------------------------
async function layChiTietScene(id) {
  const { data, error } = await supabaseClient
    .from("tour_scene")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { thanhCong: false, duLieu: null, loi: error.message };
  }

  return { thanhCong: true, duLieu: data, loi: "" };
}

// ------------------------------------------------------------
// HÀM: themScene
// MỤC ĐÍCH: Thêm 1 scene mới vào database
//
// THAM SỐ: duLieuScene - object { ten_scene, mo_ta, url_anh_360, thu_tu }
// TRẢ VỀ: Promise, resolve về { thanhCong, id, loi }
// ------------------------------------------------------------
async function themScene(duLieuScene) {
  const { data, error } = await supabaseClient
    .from("tour_scene")
    .insert(duLieuScene)
    .select()
    .single();

  if (error) {
    return { thanhCong: false, id: null, loi: error.message };
  }

  return { thanhCong: true, id: data.id, loi: "" };
}

// ------------------------------------------------------------
// HÀM: suaScene
// MỤC ĐÍCH: Cập nhật thông tin 1 scene đã tồn tại
//
// THAM SỐ:
//   - id: UUID của scene cần sửa
//   - duLieuScene: object chứa các trường CẦN CẬP NHẬT
// TRẢ VỀ: Promise, resolve về { thanhCong, loi }
// ------------------------------------------------------------
async function suaScene(id, duLieuScene) {
  const { error } = await supabaseClient
    .from("tour_scene")
    .update(duLieuScene)
    .eq("id", id);

  if (error) {
    return { thanhCong: false, loi: error.message };
  }

  return { thanhCong: true, loi: "" };
}

// ------------------------------------------------------------
// HÀM: xoaScene
// MỤC ĐÍCH: Xoá vĩnh viễn 1 scene khỏi database.
//
// NHỜ RÀNG BUỘC ĐÃ KHAI BÁO SẴN TRONG docs/schema.sql:
//   - Mọi hotspot THUỘC scene này (cột scene_id) sẽ TỰ ĐỘNG bị xoá
//     theo (ON DELETE CASCADE) — không để lại hotspot "mồ côi".
//   - Mọi hotspot ở SCENE KHÁC từng trỏ TỚI scene này để "nối cảnh"
//     (cột scene_dich_id) sẽ TỰ ĐỘNG được gán về NULL (ON DELETE SET
//     NULL) — không bị lỗi tham chiếu tới 1 scene không còn tồn tại.
//
// THAM SỐ: id - UUID của scene cần xoá
// TRẢ VỀ: Promise, resolve về { thanhCong, loi }
//
// LƯU Ý: hàm này KHÔNG tự xoá file ảnh 360° liên quan trên Storage,
// giống cách xoaBaiViet() trong posts.js đang xử lý — để đơn giản
// hoá cho giai đoạn này.
// ------------------------------------------------------------
async function xoaScene(id) {
  const { error } = await supabaseClient
    .from("tour_scene")
    .delete()
    .eq("id", id);

  if (error) {
    return { thanhCong: false, loi: error.message };
  }

  return { thanhCong: true, loi: "" };
}

// ------------------------------------------------------------
// HÀM: datLamSceneBatDau
// MỤC ĐÍCH: Đánh dấu 1 scene là scene MỞ ĐẦU khi khách tham quan mở
// trang tour (cột la_scene_bat_dau). CHỈ NÊN có ĐÚNG 1 scene mang
// giá trị true trong toàn bảng tại 1 thời điểm — ràng buộc này
// KHÔNG thể khai báo bằng CHECK constraint thông thường của
// PostgreSQL (vì CHECK chỉ kiểm tra trong phạm vi 1 dòng, không so
// sánh được giữa nhiều dòng với nhau), nên phải tự kiểm soát ở tầng
// code bằng 2 bước UPDATE tuần tự:
//
//   BƯỚC 1: tắt cờ la_scene_bat_dau ở TẤT CẢ scene KHÁC id đang chọn
//   BƯỚC 2: bật cờ la_scene_bat_dau ở ĐÚNG scene có id truyền vào
//
// THAM SỐ: id - UUID của scene muốn đặt làm scene bắt đầu
// TRẢ VỀ: Promise, resolve về { thanhCong, loi }
// ------------------------------------------------------------
async function datLamSceneBatDau(id) {
  // .neq("id", id): lọc "khác với id này" — chỉ tắt cờ ở các scene
  // CÒN LẠI, không đụng tới scene sắp được bật cờ ở bước 2 bên dưới
  const { error: loiBuoc1 } = await supabaseClient
    .from("tour_scene")
    .update({ la_scene_bat_dau: false })
    .neq("id", id);

  if (loiBuoc1) {
    return { thanhCong: false, loi: loiBuoc1.message };
  }

  const { error: loiBuoc2 } = await supabaseClient
    .from("tour_scene")
    .update({ la_scene_bat_dau: true })
    .eq("id", id);

  if (loiBuoc2) {
    return { thanhCong: false, loi: loiBuoc2.message };
  }

  return { thanhCong: true, loi: "" };
}

// ------------------------------------------------------------
// HÀM: uploadAnh360
// MỤC ĐÍCH: Tải 1 file ảnh 360° (định dạng equirectangular) lên
// Supabase Storage, bucket "anh-360", trả về URL công khai để lưu
// vào cột url_anh_360 của bảng tour_scene.
//
// Cách tạo tên file DUY NHẤT ĐỒNG NHẤT với hàm uploadAnh() trong
// posts.js (thời gian hiện tại + số ngẫu nhiên + đuôi file gốc),
// nhưng viết thành hàm RIÊNG ở đây (không sửa lại uploadAnh() trong
// posts.js) để tránh đụng vào luồng upload ảnh bài viết đang hoạt
// động ổn định, đồng thời cho phép trỏ tới bucket khác.
//
// THAM SỐ: file - đối tượng File lấy từ input type="file"
// TRẢ VỀ: Promise, resolve về { thanhCong, url, loi }
// ------------------------------------------------------------
async function uploadAnh360(file) {
  const phanDuoiFile = file.name.split(".").pop();
  const tenFileMoi =
    Date.now() + "-" + Math.round(Math.random() * 1e9) + "." + phanDuoiFile;

  const { error: loiUpload } = await supabaseClient.storage
    .from(TEN_BUCKET_ANH_360)
    .upload(tenFileMoi, file);

  if (loiUpload) {
    return { thanhCong: false, url: null, loi: loiUpload.message };
  }

  const { data } = supabaseClient.storage
    .from(TEN_BUCKET_ANH_360)
    .getPublicUrl(tenFileMoi);

  return { thanhCong: true, url: data.publicUrl, loi: "" };
}

// ------------------------------------------------------------
// HÀM: uploadAnhHotspot
// MỤC ĐÍCH: Tải 1 ảnh cận cảnh minh hoạ cho hotspot loại "info" lên
// Supabase Storage, CÙNG bucket "anh-360" với ảnh panorama nhưng
// nằm trong thư mục con "hotspots/" để tách riêng, dễ quản lý.
//
// THAM SỐ: file - đối tượng File lấy từ input type="file"
// TRẢ VỀ: Promise, resolve về { thanhCong, url, loi }
// ------------------------------------------------------------
async function uploadAnhHotspot(file) {
  const phanDuoiFile = file.name.split(".").pop();
  const tenFileMoi =
    "hotspots/" +
    Date.now() +
    "-" +
    Math.round(Math.random() * 1e9) +
    "." +
    phanDuoiFile;

  const { error: loiUpload } = await supabaseClient.storage
    .from(TEN_BUCKET_ANH_360)
    .upload(tenFileMoi, file);

  if (loiUpload) {
    return { thanhCong: false, url: null, loi: loiUpload.message };
  }

  const { data } = supabaseClient.storage
    .from(TEN_BUCKET_ANH_360)
    .getPublicUrl(tenFileMoi);

  return { thanhCong: true, url: data.publicUrl, loi: "" };
}

// ============================================================
// PHẦN 2 (BỔ SUNG): CÁC HÀM LÀM VIỆC VỚI BẢNG tour_hotspot
// Mỗi hotspot thuộc về ĐÚNG 1 scene (cột scene_id), có 2 loại:
//   - "info"  -> hiện nội dung chú thích (cột noi_dung_info) khi bấm
//   - "scene" -> chuyển sang 1 scene khác (cột scene_dich_id) khi bấm
// Toạ độ hotspot trên mặt cầu ảnh 360° lưu ở 2 cột toa_do_pitch
// (góc lên/xuống) và toa_do_yaw (góc trái/phải), theo đúng đơn vị
// độ (degree) mà thư viện Pannellum.js sử dụng.
// ============================================================

// ------------------------------------------------------------
// HÀM: layDanhSachHotspotTheoScene
// MỤC ĐÍCH: Lấy toàn bộ hotspot thuộc về 1 scene cụ thể, sắp xếp
// theo thời điểm tạo cũ nhất lên trước (giữ thứ tự ổn định trong
// danh sách quản lý, không bị xáo trộn ngẫu nhiên mỗi lần tải lại)
//
// THAM SỐ: idScene - UUID của scene cần lấy hotspot
// TRẢ VỀ: Promise, resolve về { thanhCong, duLieu, loi }
// ------------------------------------------------------------
async function layDanhSachHotspotTheoScene(idScene) {
  const { data, error } = await supabaseClient
    .from("tour_hotspot")
    .select("*")
    .eq("scene_id", idScene)
    .order("created_at", { ascending: true });

  if (error) {
    return { thanhCong: false, duLieu: [], loi: error.message };
  }

  return { thanhCong: true, duLieu: data, loi: "" };
}

// ------------------------------------------------------------
// HÀM: themHotspot
// MỤC ĐÍCH: Thêm 1 hotspot mới vào database
//
// THAM SỐ: duLieuHotspot - object gồm các cột:
//   { scene_id, loai_hotspot, toa_do_pitch, toa_do_yaw,
//     tieu_de_hotspot, noi_dung_info, scene_dich_id }
// TRẢ VỀ: Promise, resolve về { thanhCong, id, loi }
// ------------------------------------------------------------
async function themHotspot(duLieuHotspot) {
  const { data, error } = await supabaseClient
    .from("tour_hotspot")
    .insert(duLieuHotspot)
    .select()
    .single();

  if (error) {
    return { thanhCong: false, id: null, loi: error.message };
  }

  return { thanhCong: true, id: data.id, loi: "" };
}

// ------------------------------------------------------------
// HÀM: suaHotspot
// MỤC ĐÍCH: Cập nhật thông tin 1 hotspot đã tồn tại (kể cả khi chỉ
// đổi vị trí — trường hợp này duLieuHotspot vẫn gửi đủ cả
// toa_do_pitch/toa_do_yaw MỚI cùng các trường khác không đổi, vì
// trang admin luôn gửi lại nguyên object đầy đủ mỗi lần lưu)
//
// THAM SỐ:
//   - id: UUID của hotspot cần sửa
//   - duLieuHotspot: object chứa các trường CẦN CẬP NHẬT
// TRẢ VỀ: Promise, resolve về { thanhCong, loi }
// ------------------------------------------------------------
async function suaHotspot(id, duLieuHotspot) {
  const { error } = await supabaseClient
    .from("tour_hotspot")
    .update(duLieuHotspot)
    .eq("id", id);

  if (error) {
    return { thanhCong: false, loi: error.message };
  }

  return { thanhCong: true, loi: "" };
}

// ------------------------------------------------------------
// HÀM: xoaHotspot
// MỤC ĐÍCH: Xoá vĩnh viễn 1 hotspot khỏi database
//
// THAM SỐ: id - UUID của hotspot cần xoá
// TRẢ VỀ: Promise, resolve về { thanhCong, loi }
// ------------------------------------------------------------
async function xoaHotspot(id) {
  const { error } = await supabaseClient
    .from("tour_hotspot")
    .delete()
    .eq("id", id);

  if (error) {
    return { thanhCong: false, loi: error.message };
  }

  return { thanhCong: true, loi: "" };
}