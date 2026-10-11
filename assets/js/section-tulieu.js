// ============================================================
// FILE: assets/js/section-tulieu.js
// MỤC ĐÍCH: Xử lý logic chuyển TAB LỌC dùng riêng ở trang
// tu-lieu-ky-uc.html (lọc bài viết theo hồi ức / nghiên cứu / kỷ
// niệm ngay trên 1 trang, không chuyển sang trang khác). Tách riêng
// thành 1 file để không lẫn với logic gọi API (posts.js) hay logic
// vẽ thẻ bài viết (render-card.js) — file này CHỈ lo phần "bấm tab
// nào thì tab đó sáng lên", việc tải lại dữ liệu tương ứng do
// chính trang tu-lieu-ky-uc.html tự xử lý qua hàm callback truyền vào.
// ============================================================

// ------------------------------------------------------------
// HÀM: ganSuKienTab
// MỤC ĐÍCH: Gắn sự kiện bấm cho toàn bộ nút có class "tab-tulieu"
// nằm bên trong 1 khung chứa, tự động chuyển class "dang-active" +
// thuộc tính aria-selected sang đúng tab vừa bấm, rồi gọi hàm xử lý
// được truyền vào kèm giá trị data-loai của tab đó.
//
// THAM SỐ:
//   - idKhungTab: id của phần tử bao ngoài chứa các nút tab
//   - hamKhiDoiTab: hàm callback (nhận 1 tham số là chuỗi loại bài
//     viết, VD: "hoi_uc", hoặc "" nếu là tab "Tất cả"), được gọi
//     mỗi khi người dùng bấm sang 1 tab khác
//
// TRẢ VỀ: không có
// ------------------------------------------------------------
function ganSuKienTab(idKhungTab, hamKhiDoiTab) {
  const oKhungTab = document.getElementById(idKhungTab);

  // Nếu trang quên đặt đúng id khung tab, báo lỗi ra console để dễ
  // phát hiện khi đang phát triển, thay vì im lặng không hiện gì cả
  if (!oKhungTab) {
    console.error(
      'section-tulieu.js: Không tìm thấy phần tử id="' + idKhungTab + '".'
    );
    return;
  }

  const danhSachNutTab = oKhungTab.querySelectorAll(".tab-tulieu");

  danhSachNutTab.forEach(function (nutTab) {
    nutTab.addEventListener("click", function () {
      // Nếu bấm đúng tab ĐANG mở sẵn, không làm gì thêm — tránh gọi
      // lại API không cần thiết khi người dùng lỡ bấm trùng tab hiện tại
      if (nutTab.classList.contains("dang-active")) {
        return;
      }

      // Bỏ trạng thái active khỏi TẤT CẢ tab trước, rồi chỉ gắn lại
      // đúng cho 1 tab vừa được bấm
      danhSachNutTab.forEach(function (nut) {
        nut.classList.remove("dang-active");
        nut.setAttribute("aria-selected", "false");
      });
      nutTab.classList.add("dang-active");
      nutTab.setAttribute("aria-selected", "true");

      // dataset.loai đọc giá trị từ thuộc tính data-loai="..." đã đặt
      // sẵn trên mỗi nút tab trong HTML (xem tu-lieu-ky-uc.html)
      hamKhiDoiTab(nutTab.dataset.loai);
    });
  });
}