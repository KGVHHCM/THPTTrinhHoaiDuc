// ============================================================
// FILE: assets/js/tour-public.js
// MỤC ĐÍCH: Các hàm ĐỌC dữ liệu tour 360° (bảng tour_scene và
// tour_hotspot) dành RIÊNG cho trang PUBLIC khong-gian-3d.html —
// nơi khách tham quan (KHÔNG cần đăng nhập) xem virtual tour.
//
// TẠI SAO TÁCH RIÊNG khỏi assets/js/tour-admin.js (dù có 2 hàm tên
// giống hệt bên đó): trang public không cần và không nên tải kèm
// các hàm GHI dữ liệu (themScene, suaScene, xoaScene, uploadAnh360...)
// chỉ dành cho admin. Tách file giúp trang public nhẹ hơn và rõ ràng
// phạm vi sử dụng (chỉ đọc) — lưu ý lớp bảo vệ THẬT SỰ vẫn là RLS ở
// tầng database (đã cấu hình ở docs/schema.sql), việc tách file này
// chỉ là gọn gàng cho code, không thay thế cho bảo mật.
//
// File này PHẢI được nhúng SAU supabase-client.js trong HTML, vì
// mọi hàm bên dưới đều dùng biến toàn cục "supabaseClient".
// ============================================================

// ------------------------------------------------------------
// HÀM: layDanhSachScene
// MỤC ĐÍCH: Lấy TOÀN BỘ scene đã có trong database, sắp xếp theo
// cột thu_tu tăng dần (đúng thứ tự admin đã sắp xếp trong trang quản
// trị), nếu trùng thu_tu thì sắp thêm theo ngày tạo cũ nhất lên trước.
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
// HÀM: layDanhSachHotspotTheoScene
// MỤC ĐÍCH: Lấy toàn bộ hotspot thuộc về 1 scene cụ thể, dùng để vẽ
// điểm đánh dấu lên ảnh 360° khi khách đang xem đúng scene đó.
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