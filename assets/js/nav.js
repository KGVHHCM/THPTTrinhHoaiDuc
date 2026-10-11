// ============================================================
// FILE: assets/js/nav.js
// MỤC ĐÍCH: Sinh ra HTML cho HEADER (logo + menu điều hướng) và
// FOOTER dùng CHUNG cho mọi trang PUBLIC
//
// CẬP NHẬT: Footer có thêm 2 nút logo "Đoàn trường" (fanpage Facebook)
// và "Web trường" (website trường). Chỉ sửa 2 đường link ở
// LIEN_KET_FOOTER bên dưới. Mọi phần khác giữ nguyên.
// ============================================================

// ------------------------------------------------------------
// DANH_SACH_MENU
// ------------------------------------------------------------
const DANH_SACH_MENU = [
  { duongDan: "index.html", nhan: "Trang chủ" },
  { duongDan: "tin-tuc-hoat-dong.html", nhan: "Tin tức & Hoạt động" },
  { duongDan: "tu-lieu-ky-uc.html", nhan: "Tư liệu & Ký ức" },
  { duongDan: "thu-vien.html", nhan: "Thư viện" },
  { duongDan: "khong-gian-3d.html", nhan: "Không gian 2D" },
];

// ------------------------------------------------------------
// LIEN_KET_FOOTER: 2 nút logo trong footer
// Đổi link ở trường "duongDan" nếu sau này cần thay
// ------------------------------------------------------------
const LIEN_KET_FOOTER = [
  {
    nhan: "Đoàn trường",
    duongDan: "https://www.facebook.com/share/1cojPfjCbq/",
    anh: "assets/images/logo-doan-truong.png",
    moTa: "Fanpage Facebook Đoàn trường THPT Trịnh Hoài Đức",
  },
  {
    nhan: "Web trường",
    duongDan: "https://thpttrinhhoaiducbinhduong.edu.vn/",
    anh: "assets/images/logotruong.png",
    moTa: "Website Trường THPT Trịnh Hoài Đức",
  },
];

// ------------------------------------------------------------
// HẰNG SỐ: MA_SVG_DAU_TRIEM
// ------------------------------------------------------------
const MA_SVG_DAU_TRIEM = `
  <svg viewBox="0 0 40 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle
      cx="20"
      cy="20"
      r="18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    />

    <g>
      <ellipse cx="20" cy="11" rx="3" ry="7" />
      <ellipse
        cx="20"
        cy="11"
        rx="3"
        ry="7"
        transform="rotate(72 20 20)"
      />
      <ellipse
        cx="20"
        cy="11"
        rx="3"
        ry="7"
        transform="rotate(144 20 20)"
      />
      <ellipse
        cx="20"
        cy="11"
        rx="3"
        ry="7"
        transform="rotate(216 20 20)"
      />
      <ellipse
        cx="20"
        cy="11"
        rx="3"
        ry="7"
        transform="rotate(288 20 20)"
      />
    </g>

    <circle cx="20" cy="20" r="2.2" />
  </svg>
`;

// ------------------------------------------------------------
// HÀM: layTenFileHienTai
// ------------------------------------------------------------
function layTenFileHienTai() {
  const duongDan = window.location.pathname;
  const tenFile = duongDan.split("/").pop();

  return tenFile === "" ? "index.html" : tenFile;
}

// ------------------------------------------------------------
// HÀM: sinhHtmlMenu
// ------------------------------------------------------------
function sinhHtmlMenu() {
  const tenFileHienTai = layTenFileHienTai();

  return DANH_SACH_MENU.map(function (muc) {
    const lopActive =
      muc.duongDan === tenFileHienTai ? " dang-active" : "";

    const thuocTinhAria =
      muc.duongDan === tenFileHienTai
        ? ' aria-current="page"'
        : "";

    return (
      '<li><a href="' +
      muc.duongDan +
      '" class="' +
      lopActive.trim() +
      '"' +
      thuocTinhAria +
      ">" +
      muc.nhan +
      "</a></li>"
    );
  }).join("");
}

// ------------------------------------------------------------
// HÀM: sinhHtmlLienKetFooter
// Sinh HTML cho 2 nút logo trong footer từ mảng LIEN_KET_FOOTER.
// Mở link ở tab mới (target="_blank") + rel="noopener noreferrer"
// để an toàn khi mở trang ngoài.
// ------------------------------------------------------------
function sinhHtmlLienKetFooter() {
  return LIEN_KET_FOOTER.map(function (muc) {
    return (
      '<a href="' + muc.duongDan + '"' +
      ' class="footer-nut-logo"' +
      ' target="_blank" rel="noopener noreferrer"' +
      ' aria-label="' + muc.moTa + '">' +
      '<img src="' + muc.anh + '" alt="" width="40" height="40">' +
      "<span>" + muc.nhan + "</span>" +
      "</a>"
    );
  }).join("");
}

// ------------------------------------------------------------
// HÀM: renderHeader
// ------------------------------------------------------------
function renderHeader() {
  const oDiemNeo = document.getElementById("site-header");

  if (!oDiemNeo) {
    console.error(
      'nav.js: Không tìm thấy phần tử id="site-header" trên trang này.'
    );
    return;
  }

  // Nút "Bỏ qua đến nội dung chính"
  oDiemNeo.insertAdjacentHTML(
    "beforebegin",
    '<a href="#noi-dung-chinh" class="bo-qua-den-noi-dung">Bỏ qua đến nội dung chính</a>'
  );

  // HEADER
  oDiemNeo.outerHTML = `
    <header class="site-header">
      <div class="khung-header">

        <a href="index.html" class="logo-trang">

          <span class="dau-triem" aria-hidden="true">
             <img src="assets/images/logotruong.png" alt="Logo Không gian văn hóa Hồ Chí Minh">
          </span>

          <span class="ten-trang">

            <strong>Trường THPT Trịnh Hoài Đức</strong>

            <span class="ten-trang-phu">
              Không gian văn hóa Hồ Chí Minh
            </span>

          </span>

        </a>

        <button
          type="button"
          class="nut-menu-di-dong"
          id="nut-menu-di-dong"
          aria-expanded="false"
          aria-controls="menu-chinh"
        >
          <span class="chi-doc-may">
            Mở/đóng menu điều hướng
          </span>

          <span
            class="bieu-tuong-menu"
            aria-hidden="true"
          ></span>
        </button>

        <nav
          class="menu-chinh"
          id="menu-chinh"
          aria-label="Menu chính"
        >
          <ul>
            ${sinhHtmlMenu()}
          </ul>
        </nav>

      </div>
    </header>
  `;
}

// ------------------------------------------------------------
// HÀM: renderFooter
// ------------------------------------------------------------
function renderFooter() {
  const oDiemNeo = document.getElementById("site-footer");

  if (!oDiemNeo) {
    console.error(
      'nav.js: Không tìm thấy phần tử id="site-footer" trên trang này.'
    );
    return;
  }

  const namHienTai = new Date().getFullYear();

  oDiemNeo.outerHTML = `
    <footer class="site-footer">

      <div class="khung-footer">

        <span
          class="dau-triem-footer"
          aria-hidden="true"
        >
          ${MA_SVG_DAU_TRIEM}
        </span>

        <p class="ten-footer">
          Không gian văn hóa Hồ Chí Minh
        </p>

        <!-- 2 NÚT LOGO: ĐOÀN TRƯỜNG + WEB TRƯỜNG -->
        <div class="footer-lien-ket">
          ${sinhHtmlLienKetFooter()}
        </div>

        <p class="dong-ban-quyen">
          © ${namHienTai} — Trang thông tin nội bộ phục vụ giáo dục lịch sử, văn hóa.
        </p>

        <!-- LỐI VÀO ADMIN -->

        <a
          href="admin/login.html"
          class="loi-vao-admin-an"
          aria-label="Đăng nhập quản trị"
        >
          <span class="chi-doc-may">
            Đăng nhập quản trị
          </span>
        </a>

      </div>

    </footer>
  `;
}

// ------------------------------------------------------------
// HÀM: ganSuKienMenuDiDong
// ------------------------------------------------------------
function ganSuKienMenuDiDong() {
  const nutHamburger =
    document.getElementById("nut-menu-di-dong");

  const menu =
    document.getElementById("menu-chinh");

  if (!nutHamburger || !menu) {
    return;
  }

  // Hàm đóng menu
  function dongMenu() {
    menu.classList.remove("dang-mo");

    nutHamburger.classList.remove("dang-mo");

    nutHamburger.setAttribute(
      "aria-expanded",
      "false"
    );
  }

  // Bấm hamburger
  nutHamburger.addEventListener("click", function () {

    const dangMo =
      menu.classList.toggle("dang-mo");

    nutHamburger.classList.toggle(
      "dang-mo",
      dangMo
    );

    nutHamburger.setAttribute(
      "aria-expanded",
      dangMo ? "true" : "false"
    );
  });

  // Bấm Escape
  document.addEventListener(
    "keydown",
    function (suKien) {

      if (suKien.key === "Escape") {
        dongMenu();
      }

    }
  );

  // Bấm link -> đóng menu
  menu.querySelectorAll("a").forEach(
    function (lienKet) {

      lienKet.addEventListener(
        "click",
        dongMenu
      );

    }
  );
}

// ------------------------------------------------------------
// HÀM: khoiTaoDieuHuong
// ------------------------------------------------------------
function khoiTaoDieuHuong() {

  renderHeader();

  renderFooter();

  ganSuKienMenuDiDong();
}

// ------------------------------------------------------------
// CHẠY KHI TRANG TẢI XONG
// ------------------------------------------------------------
document.addEventListener(
  "DOMContentLoaded",
  khoiTaoDieuHuong
);