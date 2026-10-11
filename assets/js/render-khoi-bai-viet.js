// ============================================================
// FILE: assets/js/render-khoi-bai-viet.js
// MỤC ĐÍCH (trang PUBLIC):
//   1. layMangKhoiBaiViet(bv): lấy mảng khối nội dung của 1 bài viết.
//      Bài mới có cột noi_dung_khoi; bài cũ (chưa có) được tự chuyển
//      thành khối từ noi_dung / danh_sach_anh / danh_sach_video /
//      file_dinh_kem, nên bài cũ vẫn hiển thị đúng.
//   2. veDanhSachTheXemThem(...): vẽ lưới thẻ bài viết có nút
//      "Xem thêm / Thu gọn" kiểu bài đăng Facebook.
//
// PHỤ THUỘC (phải nhúng TRƯỚC file này):
//   render-card.js        -> thoatHtml, NHAN_LOAI_BAI_VIET_CONG_KHAI, layNgayHienThi
//   trinh-soan-khoi.js    -> trinhSoanKhoi.taoHtmlNoiDung (vẽ các khối ra HTML)
// ============================================================

// ------------------------------------------------------------
// HÀM: layMangKhoiBaiViet
// THAM SỐ: bv - 1 bản ghi bài viết lấy từ bảng bai_viet
// TRẢ VỀ: mảng khối (có thể rỗng)
// ------------------------------------------------------------
function layMangKhoiBaiViet(bv) {
  if (Array.isArray(bv.noi_dung_khoi) && bv.noi_dung_khoi.length > 0) {
    return bv.noi_dung_khoi;
  }

  // Bài cũ: dựng khối từ các cột cũ
  const mang = [];

  if (bv.noi_dung && bv.noi_dung.trim()) {
    mang.push({ loai: "chu", van_ban: bv.noi_dung.trim() });
  }

  if (Array.isArray(bv.danh_sach_anh) && bv.danh_sach_anh.length > 0) {
    mang.push({
      loai: "anh",
      bo_cuc: "luoi",
      danh_sach: bv.danh_sach_anh.map(function (url) {
        return { url: url, chu_thich: "" };
      }),
    });
  }

  (bv.danh_sach_video || []).forEach(function (url) {
    mang.push({ loai: "video", url: url });
  });

  if (bv.file_dinh_kem) {
    mang.push({ loai: "pdf", url: bv.file_dinh_kem, ten: "Tài liệu đính kèm" });
  }

  return mang;
}

// ------------------------------------------------------------
// HÀM: layDoanTrichNgan
// MỤC ĐÍCH: Đoạn chữ ngắn hiện khi thẻ đang THU GỌN.
// Ưu tiên "Mô tả ngắn" admin đã viết; nếu để trống thì lấy ~180 ký
// tự đầu của khối chữ đầu tiên.
// ------------------------------------------------------------
function layDoanTrichNgan(bv, mangKhoi) {
  const moTa = (bv.mo_ta_ngan || "").trim();
  if (moTa) {
    return moTa;
  }

  const khoiChu = mangKhoi.find(function (k) {
    return (k.loai === "chu" || k.loai === "trich_dan") && k.van_ban;
  });
  if (!khoiChu) {
    return "";
  }

  const vanBan = khoiChu.van_ban.replace(/\s+/g, " ").trim();
  return vanBan.length > 180 ? vanBan.slice(0, 180).trim() + "…" : vanBan;
}

// Lưu mảng khối theo id bài viết, để lúc bấm "Xem thêm" mới vẽ
// nội dung đầy đủ (tránh tải sẵn video/ảnh của mọi bài cùng lúc)
let mangKhoiTheoIdBaiViet = {};

function taoHtmlTheXemThem(bv) {
  const mangKhoi = layMangKhoiBaiViet(bv);
  mangKhoiTheoIdBaiViet[bv.id] = mangKhoi;

  const id = thoatHtml(String(bv.id));
  const duongDan = "bai-viet.html?id=" + encodeURIComponent(bv.id);
  const nhanLoai = NHAN_LOAI_BAI_VIET_CONG_KHAI[bv.loai_bai_viet] || "Bài viết";
  const ngay = layNgayHienThi(bv);
  const doanTrichNgan = layDoanTrichNgan(bv, mangKhoi);
  const soAnhPhu = Array.isArray(bv.danh_sach_anh) ? bv.danh_sach_anh.length : 0;

  const htmlAnh = bv.anh_dai_dien
    ? '<div class="the-bai-viet-anh"><img src="' + thoatHtml(bv.anh_dai_dien) +
      '" alt="" loading="lazy" />'
    : '<div class="the-bai-viet-anh-rong">';

  const htmlBadge = soAnhPhu > 0
    ? '<span class="badge-nhieu-anh">+' + soAnhPhu + " ảnh</span>"
    : "";

  const htmlNut = mangKhoi.length > 0
    ? '<button type="button" class="nut-xem-them-bai" aria-expanded="false">Xem thêm</button>'
    : "";

  return (
    '<article class="the-bai-viet the-bai-viet-xem-them" data-id="' + id + '">' +
      '<a class="the-bai-viet-lienket" href="' + duongDan + '" aria-label="' + thoatHtml(bv.tieu_de) + '">' +
        htmlAnh +
          '<span class="nhan-loai-the">' + thoatHtml(nhanLoai) + "</span>" +
          htmlBadge +
        "</div>" +
      "</a>" +
      '<div class="the-bai-viet-noidung">' +
        '<h3><a href="' + duongDan + '">' + thoatHtml(bv.tieu_de) + "</a></h3>" +
        (doanTrichNgan
          ? '<p class="the-bai-viet-mota">' + thoatHtml(doanTrichNgan) + "</p>"
          : "") +
        '<div class="the-bai-viet-day-du"></div>' +
        '<div class="the-bai-viet-chan">' +
          '<span class="the-bai-viet-ngay">' + ngay + "</span>" +
          htmlNut +
        "</div>" +
      "</div>" +
    "</article>"
  );
}

// ------------------------------------------------------------
// HÀM: chuyenTrangThaiXemThem
// MỤC ĐÍCH: Bấm "Xem thêm" -> bung toàn bộ nội dung CHỮ ngay trong
// thẻ (không kèm ảnh/video/PDF); bấm "Thu gọn" -> co lại như cũ.
// Mỗi thẻ hoạt động ĐỘC LẬP (class "dang-mo" gắn riêng từng thẻ).
// ------------------------------------------------------------
function chuyenTrangThaiXemThem(nut) {
  const oThe = nut.closest(".the-bai-viet-xem-them");
  const oDayDu = oThe.querySelector(".the-bai-viet-day-du");
  const dangMo = oThe.classList.toggle("dang-mo");

  if (dangMo) {
    // Chỉ hiện nội dung CHỮ: bỏ các khối ảnh, video, PDF
    const chiKhoiChu = (mangKhoiTheoIdBaiViet[oThe.dataset.id] || []).filter(
      function (k) {
        return k.loai !== "anh" && k.loai !== "video" && k.loai !== "pdf";
      }
    );
    oDayDu.innerHTML = trinhSoanKhoi.taoHtmlNoiDung(chiKhoiChu);
  } else {
    // Xoá nội dung khi thu gọn: dừng video đang phát, giải phóng ảnh
    oDayDu.innerHTML = "";
    oThe.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  nut.textContent = dangMo ? "Thu gọn" : "Xem thêm";
  nut.setAttribute("aria-expanded", dangMo ? "true" : "false");
}

// ------------------------------------------------------------
// HÀM: veDanhSachTheXemThem
// MỤC ĐÍCH: Thay veDanhSachThe() ở trang tin-tuc-hoat-dong.html.
// THAM SỐ (giống veDanhSachThe):
//   - danhSach: mảng bài viết
//   - idKhung: id phần tử sẽ chứa lưới thẻ
//   - thongBaoRong: câu hiện khi chưa có bài nào
// ------------------------------------------------------------
function veDanhSachTheXemThem(danhSach, idKhung, thongBaoRong) {
  const oKhung = document.getElementById(idKhung);
  mangKhoiTheoIdBaiViet = {};

  if (!danhSach || danhSach.length === 0) {
    oKhung.innerHTML =
      '<p class="thong-bao-rong-cong-khai">' + thoatHtml(thongBaoRong) + "</p>";
    return;
  }

  oKhung.innerHTML =
    '<div class="luoi-the-bai-viet luoi-the-xem-them">' +
    danhSach.map(taoHtmlTheXemThem).join("") +
    "</div>";

  // 1 trình xử lý duy nhất cho cả lưới (gán lại thay vì cộng dồn)
  oKhung.onclick = function (suKien) {
    const nut = suKien.target.closest(".nut-xem-them-bai");
    if (nut) {
      chuyenTrangThaiXemThem(nut);
    }
  };
}