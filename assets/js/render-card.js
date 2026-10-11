// ============================================================
// FILE: assets/js/render-card.js
// (Đã thêm: badge "+n ảnh" ở góc ảnh cho bài viết có nhiều ảnh phụ)
// ============================================================

const NHAN_LOAI_BAI_VIET_CONG_KHAI = {
  tin_tuc: "Tin tức & Hoạt động",
  hoi_uc: "Hồi ức nhân chứng",
  nghien_cuu: "Bài nghiên cứu",
  ky_niem: "Kỷ niệm & Ngày lễ",
};

const MA_SVG_DAU_TRIEM_NHO = `
  <svg viewBox="0 0 40 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <g>
      <ellipse cx="20" cy="11" rx="3" ry="7" />
      <ellipse cx="20" cy="11" rx="3" ry="7" transform="rotate(72 20 20)" />
      <ellipse cx="20" cy="11" rx="3" ry="7" transform="rotate(144 20 20)" />
      <ellipse cx="20" cy="11" rx="3" ry="7" transform="rotate(216 20 20)" />
      <ellipse cx="20" cy="11" rx="3" ry="7" transform="rotate(288 20 20)" />
    </g>
    <circle cx="20" cy="20" r="2.2" />
  </svg>
`;

function thoatHtml(chuoi) {
  if (!chuoi) {
    return "";
  }

  return chuoi
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function layMoTaHienThi(baiViet) {
  if (baiViet.mo_ta_ngan) {
    return baiViet.mo_ta_ngan;
  }

  const noiDungGoc = baiViet.noi_dung || "";
  const CO_DAI_TOI_DA = 160;

  if (noiDungGoc.length <= CO_DAI_TOI_DA) {
    return noiDungGoc;
  }

  return noiDungGoc.slice(0, CO_DAI_TOI_DA).trim() + "...";
}

function layNgayHienThi(baiViet) {
  const chuoiNgayGoc = baiViet.ngay_su_kien || baiViet.created_at;
  return new Date(chuoiNgayGoc).toLocaleDateString("vi-VN");
}

// ------------------------------------------------------------
// HÀM: taoHtmlTheBaiViet
// CẬP NHẬT: thêm badge "+n ảnh" ở góc trên-phải khung ảnh khi bài
// viết có ảnh phụ (danh_sach_anh), để người xem biết bài có nhiều
// ảnh trước khi bấm vào xem chi tiết.
// ------------------------------------------------------------
function taoHtmlTheBaiViet(baiViet) {
  const nhanLoai =
    NHAN_LOAI_BAI_VIET_CONG_KHAI[baiViet.loai_bai_viet] || "Bài viết";

  // Số ảnh phụ (ngoài ảnh đại diện) -> hiện badge nếu có ít nhất 1 ảnh
  const soAnhPhu = Array.isArray(baiViet.danh_sach_anh)
    ? baiViet.danh_sach_anh.length
    : 0;
  const htmlBadgeNhieuAnh =
    soAnhPhu > 0
      ? `<span class="badge-nhieu-anh">+${soAnhPhu} ảnh</span>`
      : "";

  const htmlKhungAnh = baiViet.anh_dai_dien
    ? `
      <div class="the-bai-viet-anh">
        <img
          src="${thoatHtml(baiViet.anh_dai_dien)}"
          alt=""
          loading="lazy"
        />
        <span class="nhan-loai-the">${nhanLoai}</span>
        ${htmlBadgeNhieuAnh}
      </div>
    `
    : `
      <div class="the-bai-viet-anh-rong">
        ${MA_SVG_DAU_TRIEM_NHO}
        <span class="nhan-loai-the">${nhanLoai}</span>
        ${htmlBadgeNhieuAnh}
      </div>
    `;

  return `
    <article class="the-bai-viet">
      <a href="bai-viet.html?id=${encodeURIComponent(
        baiViet.id
      )}" class="the-bai-viet-lienket">
        ${htmlKhungAnh}
        <div class="the-bai-viet-noidung">
          <h3>${thoatHtml(baiViet.tieu_de)}</h3>
          <p class="the-bai-viet-mota">${thoatHtml(layMoTaHienThi(baiViet))}</p>
          <span class="the-bai-viet-ngay">${layNgayHienThi(baiViet)}</span>
        </div>
      </a>
    </article>
  `;
}

function veDanhSachThe(mangBaiViet, idKhungChua, thongBaoKhiRong) {
  const oKhungChua = document.getElementById(idKhungChua);

  if (!oKhungChua) {
    console.error(
      'render-card.js: Không tìm thấy phần tử id="' + idKhungChua + '".'
    );
    return;
  }

  if (!mangBaiViet || mangBaiViet.length === 0) {
    const chuThongBao =
      thongBaoKhiRong || "Chưa có bài viết nào trong mục này.";
    oKhungChua.innerHTML = `<p class="thong-bao-rong-cong-khai">${chuThongBao}</p>`;
    oKhungChua.classList.remove("luoi-the-bai-viet");
    return;
  }

  oKhungChua.classList.add("luoi-the-bai-viet");
  oKhungChua.innerHTML = mangBaiViet.map(taoHtmlTheBaiViet).join("");
}