// ============================================================
// FILE: assets/js/cuocdoi.js
// MỤC ĐÍCH: Chứa toàn bộ hàm gọi API Supabase cho bảng
// "cuoc_doi_giai_doan" (CRUD dùng ở trang admin) + hàm dựng giao
// diện Tabs công khai hiển thị ở trang chủ (kgvh.html).
//
// File này PHẢI được nhúng SAU supabase-client.js trong HTML,
// giống quy ước của assets/js/posts.js.
// ============================================================

// Tên bucket riêng cho ảnh giai đoạn cuộc đời, tách khỏi bucket
// "anh-bai-viet" để dễ quản lý/dọn dẹp độc lập sau này.
// PHẢI khớp với bucket đã tạo trong Dashboard Supabase (xem ghi
// chú cuối file docs/schema_cuocdoi.sql)
const TEN_BUCKET_ANH_CUOC_DOI = "anh-cuoc-doi";

// ------------------------------------------------------------
// HÀM: layDanhSachGiaiDoan
// MỤC ĐÍCH: Lấy danh sách giai đoạn, sắp xếp theo thu_tu tăng dần
// (đúng trình tự thời gian, không phải trình tự nhập liệu)
//
// THAM SỐ:
//   - chiLayDaXuatBan: true = chỉ lấy giai đoạn đã xuất bản (trang
//     public); false = lấy CẢ bản nháp (trang quản lý admin)
//
// TRẢ VỀ: Promise resolve về { thanhCong, duLieu, loi }
// ------------------------------------------------------------
async function layDanhSachGiaiDoan(chiLayDaXuatBan) {
  let cauTruyVan = supabaseClient
    .from("cuoc_doi_giai_doan")
    .select("*")
    .order("thu_tu", { ascending: true });

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
// HÀM: layChiTietGiaiDoan
// MỤC ĐÍCH: Lấy thông tin đầy đủ 1 giai đoạn theo id (dùng khi
// mở form Sửa ở trang admin)
// ------------------------------------------------------------
async function layChiTietGiaiDoan(id) {
  const { data, error } = await supabaseClient
    .from("cuoc_doi_giai_doan")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { thanhCong: false, duLieu: null, loi: error.message };
  }

  return { thanhCong: true, duLieu: data, loi: "" };
}

// ------------------------------------------------------------
// HÀM: themGiaiDoan
// MỤC ĐÍCH: Thêm 1 giai đoạn mới vào database
// ------------------------------------------------------------
async function themGiaiDoan(duLieuGiaiDoan) {
  const { data, error } = await supabaseClient
    .from("cuoc_doi_giai_doan")
    .insert(duLieuGiaiDoan)
    .select()
    .single();

  if (error) {
    return { thanhCong: false, id: null, loi: error.message };
  }

  return { thanhCong: true, id: data.id, loi: "" };
}

// ------------------------------------------------------------
// HÀM: suaGiaiDoan
// MỤC ĐÍCH: Cập nhật 1 giai đoạn đã tồn tại
// ------------------------------------------------------------
async function suaGiaiDoan(id, duLieuGiaiDoan) {
  const duLieuCapNhat = {
    ...duLieuGiaiDoan,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient
    .from("cuoc_doi_giai_doan")
    .update(duLieuCapNhat)
    .eq("id", id);

  if (error) {
    return { thanhCong: false, loi: error.message };
  }

  return { thanhCong: true, loi: "" };
}

// ------------------------------------------------------------
// HÀM: xoaGiaiDoan
// MỤC ĐÍCH: Xoá vĩnh viễn 1 giai đoạn khỏi database
// (không tự xoá file ảnh liên quan trên Storage, giống xoaBaiViet)
// ------------------------------------------------------------
async function xoaGiaiDoan(id) {
  const { error } = await supabaseClient
    .from("cuoc_doi_giai_doan")
    .delete()
    .eq("id", id);

  if (error) {
    return { thanhCong: false, loi: error.message };
  }

  return { thanhCong: true, loi: "" };
}

// ------------------------------------------------------------
// HÀM: uploadAnhCuocDoi
// MỤC ĐÍCH: Tải 1 file ảnh lên bucket "anh-cuoc-doi", trả về URL
// công khai — logic giống hệt uploadAnh() trong posts.js, chỉ khác
// tên bucket đích
// ------------------------------------------------------------
async function uploadAnhCuocDoi(file) {
  const phanDuoiFile = file.name.split(".").pop();
  const tenFileMoi =
    Date.now() + "-" + Math.round(Math.random() * 1e9) + "." + phanDuoiFile;

  const { error: loiUpload } = await supabaseClient.storage
    .from(TEN_BUCKET_ANH_CUOC_DOI)
    .upload(tenFileMoi, file);

  if (loiUpload) {
    return { thanhCong: false, url: null, loi: loiUpload.message };
  }

  const { data } = supabaseClient.storage
    .from(TEN_BUCKET_ANH_CUOC_DOI)
    .getPublicUrl(tenFileMoi);

  return { thanhCong: true, url: data.publicUrl, loi: "" };
}

// ============================================================
// PHẦN DƯỚI ĐÂY: DỰNG GIAO DIỆN TABS CÔNG KHAI Ở TRANG CHỦ
// Chỉ chạy trên kgvh.html — trang này cần sẵn 2 phần tử:
//   <div id="cuoc-doi-tabs"></div>
//   <div id="cuoc-doi-panels"></div>
// ============================================================

// Biến toàn cục giữ lại danh sách giai đoạn sau khi tải, để hàm
// chuyển tab không phải gọi lại database mỗi lần bấm
let dsGiaiDoanCongKhai = [];

// ------------------------------------------------------------
// HÀM: khoiTaoCuocDoiSection
// MỤC ĐÍCH: Được gọi khi kgvh.html tải xong — lấy danh sách giai
// đoạn đã xuất bản, dựng tabs + panel đầu tiên, gắn hiệu ứng cuộn
// ------------------------------------------------------------
async function khoiTaoCuocDoiSection() {
  const oKhungTabs = document.getElementById("cuoc-doi-tabs");
  const oKhungPanels = document.getElementById("cuoc-doi-panels");

  // Nếu trang hiện tại không có 2 khung này (VD: đang mở trang khác,
  // không phải kgvh.html) thì bỏ qua, không báo lỗi gì thêm
  if (!oKhungTabs || !oKhungPanels) {
    return;
  }

  const ketQua = await layDanhSachGiaiDoan(true);

  if (!ketQua.thanhCong || ketQua.duLieu.length === 0) {
    // Chưa có giai đoạn nào được xuất bản -> ẩn hẳn khu vực này đi,
    // tránh hiện 1 khối trống trơn gây khó hiểu cho người xem
    const oSection = oKhungTabs.closest("section");
    if (oSection) {
      oSection.style.display = "none";
    }
    return;
  }

  dsGiaiDoanCongKhai = ketQua.duLieu;

  // ---- Dựng các nút tab ----
  oKhungTabs.innerHTML = "";
  dsGiaiDoanCongKhai.forEach(function (gd, chiSo) {
    const oNutTab = document.createElement("button");
    oNutTab.type = "button";
    oNutTab.className = "cuoc-doi-tab" + (chiSo === 0 ? " dang-active" : "");
    oNutTab.setAttribute("role", "tab");
    oNutTab.setAttribute("aria-selected", chiSo === 0 ? "true" : "false");
    oNutTab.dataset.id = gd.id;
    oNutTab.innerHTML =
      '<span class="cuoc-doi-tab-thoigian">' + thoatHtmlCuocDoi(gd.khoang_thoi_gian) + "</span>" +
      thoatHtmlCuocDoi(gd.tieu_de);

    oNutTab.addEventListener("click", function () {
      chuyenSangGiaiDoan(gd.id);
    });

    oKhungTabs.appendChild(oNutTab);
  });

  // ---- Dựng các panel nội dung (ẩn hết, trừ panel đầu tiên) ----
  oKhungPanels.innerHTML = "";
  dsGiaiDoanCongKhai.forEach(function (gd, chiSo) {
    const oPanel = document.createElement("article");
    oPanel.className = "cuoc-doi-panel" + (chiSo === 0 ? " dang-hien" : "");
    oPanel.dataset.panel = gd.id;
    oPanel.setAttribute("role", "tabpanel");

    // Nếu chưa có ảnh chính, dùng nền màu trơn thay vì để trống
    const anhHtml = gd.anh_chinh
      ? '<img src="' + gd.anh_chinh + '" alt="' + thoatHtmlCuocDoi(gd.tieu_de) + '" loading="lazy" />'
      : "";

    oPanel.innerHTML =
      '<div class="cuoc-doi-anh-khung">' + anhHtml + "</div>" +
      '<div class="cuoc-doi-noidung">' +
      '<span class="cuoc-doi-thoigian">' + thoatHtmlCuocDoi(gd.khoang_thoi_gian) + "</span>" +
      "<h3>" + thoatHtmlCuocDoi(gd.tieu_de) + "</h3>" +
      "<p>" + thoatHtmlCuocDoi(gd.noi_dung) + "</p>" +
      "</div>";

    oKhungPanels.appendChild(oPanel);
  });

  khoiTaoHieuUngCuonCuocDoi();
}

// ------------------------------------------------------------
// HÀM: thoatHtmlCuocDoi
// MỤC ĐÍCH: Escape ký tự đặc biệt trước khi chèn vào innerHTML,
// giống hệt hàm thoatHtml() dùng ở trang quản lý bài viết —
// tách riêng 1 bản trong file này để cuocdoi.js không phụ thuộc
// phải nhúng chung trang với posts.js
// ------------------------------------------------------------
function thoatHtmlCuocDoi(chuoi) {
  const oDivAo = document.createElement("div");
  oDivAo.textContent = chuoi == null ? "" : String(chuoi);
  return oDivAo.innerHTML;
}

// ------------------------------------------------------------
// HÀM: chuyenSangGiaiDoan
// MỤC ĐÍCH: Được gọi khi người xem bấm vào 1 nút tab — chuyển
// trạng thái "đang hiện" sang đúng panel + tab tương ứng, kèm
// hiệu ứng fade/slide nhờ class "dang-hien" (định nghĩa trong
// assets/css/cuoc-doi.css)
//
// THAM SỐ: id - id của giai đoạn vừa được bấm chọn
// ------------------------------------------------------------
function chuyenSangGiaiDoan(id) {
  document.querySelectorAll(".cuoc-doi-tab").forEach(function (oTab) {
    const dangChon = oTab.dataset.id === id;
    oTab.classList.toggle("dang-active", dangChon);
    oTab.setAttribute("aria-selected", dangChon ? "true" : "false");
  });

  document.querySelectorAll(".cuoc-doi-panel").forEach(function (oPanel) {
    oPanel.classList.toggle("dang-hien", oPanel.dataset.panel === id);
  });
}

// ------------------------------------------------------------
// HÀM: khoiTaoHieuUngCuonCuocDoi
// MỤC ĐÍCH: Tạo hiệu ứng parallax NHẸ cho ảnh trong panel đang
// hiện — ảnh di chuyển chậm hơn 1 chút so với tốc độ cuộn trang,
// tạo cảm giác có chiều sâu. Tự động TẮT nếu người dùng bật chế
// độ "giảm chuyển động" trong hệ điều hành.
// ------------------------------------------------------------
function khoiTaoHieuUngCuonCuocDoi() {
  const thichGiamChuyenDong = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (thichGiamChuyenDong) {
    return;
  }

  // dangCho: cờ chống việc xếp chồng quá nhiều lệnh cập nhật cùng lúc
  // khi trình duyệt bắn sự kiện "scroll" liên tục — dùng
  // requestAnimationFrame để chỉ tính toán lại tối đa 1 lần mỗi khung hình
  let dangCho = false;

  function capNhatViTriAnh() {
    dangCho = false;

    const oAnhDangHien = document.querySelector(
      ".cuoc-doi-panel.dang-hien .cuoc-doi-anh-khung img"
    );
    if (!oAnhDangHien) {
      return;
    }

    const khungHinh = oAnhDangHien.parentElement.getBoundingClientRect();
    const giuaManHinh = window.innerHeight / 2;
    const giuaKhung = khungHinh.top + khungHinh.height / 2;

    // Khoảng cách từ tâm khung ảnh tới tâm màn hình, giới hạn biên độ
    // di chuyển tối đa 18px để hiệu ứng NHẸ, không gây chóng mặt
    const doLech = Math.max(
      -18,
      Math.min(18, (giuaManHinh - giuaKhung) * 0.06)
    );

    oAnhDangHien.style.transform = "translateY(" + doLech.toFixed(1) + "px) scale(1.08)";
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!dangCho) {
        dangCho = true;
        requestAnimationFrame(capNhatViTriAnh);
      }
    },
    { passive: true }
  );

  // Tính toán 1 lần ngay khi khởi tạo, để ảnh đầu tiên cũng có hiệu
  // ứng đúng vị trí ngay cả khi người xem chưa cuộn trang
  capNhatViTriAnh();
}

// Tự động khởi tạo section ngay khi file này được tải, KHÔNG cần
// gọi thủ công trong kgvh.html — giống cách assets/js/nav.js tự chạy
document.addEventListener("DOMContentLoaded", khoiTaoCuocDoiSection);