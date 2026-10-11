// ============================================================
// FILE: assets/js/render-tulieu.js
// MỤC ĐÍCH: Vẽ danh sách tư liệu (hồi ức / nghiên cứu / kỷ niệm)
// theo 3 KIỂU BỐ CỤC khác nhau cho tu-lieu-ky-uc.html — người xem
// chọn qua lại giữa các kiểu này bằng thanh #doi-bo-cuc-tulieu:
//
//   1. veDanhSachTuLieuMagazine — bố cục MAGAZINE gốc (không đổi):
//      1 khối nổi bật to + danh sách hàng ngang xen kẽ trái/phải.
//   2. veDanhSachTuLieuBento — bố cục BENTO/MOSAIC (MỚI): lưới
//      CSS Grid bất đối xứng, ô nổi bật chiếm 2x2, các ô còn lại
//      xếp vuông đều xung quanh.
//   3. veDanhSachTuLieuMasonry — bố cục MASONRY kiểu Pinterest
//      (MỚI): dùng CSS columns, ảnh giữ nguyên tỉ lệ khung hình
//      gốc thay vì crop vuông đều như thẻ bài viết thông thường.
//
// Cả 3 hàm DÙNG CHUNG 1 quy ước "nổi bật": bài ĐẦU TIÊN trong mảng
// truyền vào (mới nhất, do đã sort created_at giảm dần từ
// tu-lieu-ky-uc.html) luôn được đánh dấu là bài nổi bật — KHÔNG cần
// thêm cột dữ liệu mới trong bảng bai_viet.
//
// File này KHÔNG thay thế render-card.js, chỉ bổ sung các hàm vẽ
// riêng cho trang tu-lieu-ky-uc.html. Phải nhúng SAU
// assets/js/render-card.js vì tận dụng lại các hàm/hằng số toàn cục
// đã khai báo sẵn ở đó: thoatHtml(), MA_SVG_DAU_TRIEM_NHO,
// NHAN_LOAI_BAI_VIET_CONG_KHAI.
// ============================================================

function layMoTaTuLieu(baiViet, coDaiToiDa) {
  if (baiViet.mo_ta_ngan) {
    return baiViet.mo_ta_ngan;
  }

  const noiDungGoc = baiViet.noi_dung || "";

  if (noiDungGoc.length <= coDaiToiDa) {
    return noiDungGoc;
  }

  return noiDungGoc.slice(0, coDaiToiDa).trim() + "...";
}

function layDongMetaTuLieu(baiViet) {
  const chuoiNgayGoc = baiViet.ngay_su_kien || baiViet.created_at;
  const ngay = new Date(chuoiNgayGoc).toLocaleDateString("vi-VN");

  if (baiViet.nguoi_ke) {
    return `${ngay} <span class="tulieu-meta-cham">·</span> ${thoatHtml(
      baiViet.nguoi_ke
    )}`;
  }

  return ngay;
}

function taoHtmlKhoiNoiBat(baiViet) {
  const nhanLoai =
    NHAN_LOAI_BAI_VIET_CONG_KHAI[baiViet.loai_bai_viet] || "Bài viết";

  const htmlKhungAnh = baiViet.anh_dai_dien
    ? `<img src="${thoatHtml(
        baiViet.anh_dai_dien
      )}" alt="" loading="lazy" />`
    : `<div class="tulieu-noibat-anh-rong">${MA_SVG_DAU_TRIEM_NHO}</div>`;

  const duongDanBaiViet = "bai-viet.html?id=" + encodeURIComponent(baiViet.id);

  return (
    '<article class="tulieu-noibat">' +
    '<a href="' + duongDanBaiViet + '" class="tulieu-noibat-lienket">' +
    '<div class="tulieu-noibat-anh">' + htmlKhungAnh + '</div>' +
    '<div class="tulieu-noibat-noidung">' +
    '<span class="nhan-loai-tulieu">' + nhanLoai + '</span>' +
    '<h2>' + thoatHtml(baiViet.tieu_de) + '</h2>' +
    '<p class="tulieu-noibat-mota">' + thoatHtml(layMoTaTuLieu(baiViet, 260)) + '</p>' +
    '<span class="tulieu-meta">' + layDongMetaTuLieu(baiViet) + '</span>' +
    '</div>' +
    '</a>' +
    '</article>'
  );
}

function taoHtmlDongTuLieu(baiViet, chiSo) {
  const nhanLoai =
    NHAN_LOAI_BAI_VIET_CONG_KHAI[baiViet.loai_bai_viet] || "Bài viết";

  const lopDaoChieu = chiSo % 2 === 1 ? " tulieu-dong-dao-chieu" : "";

  const htmlKhungAnh = baiViet.anh_dai_dien
    ? `<img src="${thoatHtml(
        baiViet.anh_dai_dien
      )}" alt="" loading="lazy" />`
    : `<div class="tulieu-dong-anh-rong">${MA_SVG_DAU_TRIEM_NHO}</div>`;

  const duongDanBaiViet = "bai-viet.html?id=" + encodeURIComponent(baiViet.id);

  return (
    '<article class="tulieu-dong' + lopDaoChieu + '">' +
    '<a href="' + duongDanBaiViet + '" class="tulieu-dong-lienket">' +
    '<div class="tulieu-dong-anh">' + htmlKhungAnh + '</div>' +
    '<div class="tulieu-dong-noidung">' +
    '<span class="nhan-loai-tulieu-nho">' + nhanLoai + '</span>' +
    '<h3>' + thoatHtml(baiViet.tieu_de) + '</h3>' +
    '<p class="tulieu-dong-mota">' + thoatHtml(layMoTaTuLieu(baiViet, 130)) + '</p>' +
    '<span class="tulieu-meta tulieu-meta-nho">' + layDongMetaTuLieu(baiViet) + '</span>' +
    '</div>' +
    '</a>' +
    '</article>'
  );
}

function veDanhSachTuLieuMagazine(mangBaiViet, idKhungChua, thongBaoKhiRong) {
  const oKhungChua = document.getElementById(idKhungChua);

  if (!oKhungChua) {
    console.error(
      'render-tulieu.js: Không tìm thấy phần tử id="' + idKhungChua + '".'
    );
    return;
  }

  oKhungChua.classList.remove("luoi-the-bai-viet");

  if (!mangBaiViet || mangBaiViet.length === 0) {
    const chuThongBao =
      thongBaoKhiRong || "Chưa có tư liệu nào trong mục này.";
    oKhungChua.innerHTML = `<p class="thong-bao-rong-cong-khai">${chuThongBao}</p>`;
    return;
  }

  const [baiNoiBat, ...danhSachConLai] = mangBaiViet;

  const htmlKhoiNoiBat = taoHtmlKhoiNoiBat(baiNoiBat);

  const htmlDanhSach =
    danhSachConLai.length > 0
      ? `<div class="tulieu-danh-sach">${danhSachConLai
          .map(function (baiViet, chiSo) {
            return taoHtmlDongTuLieu(baiViet, chiSo);
          })
          .join("")}</div>`
      : "";

  oKhungChua.innerHTML = `
    <div class="tulieu-bo-cuc">
      ${htmlKhoiNoiBat}
      ${htmlDanhSach}
    </div>
  `;
}

// ------------------------------------------------------------
// HÀM: taoHtmlOBento
// ĐÃ SỬA: nhãn loại (nhan-loai-tulieu-nho) không còn nằm trong
// .tulieu-bento-overlay (phần chữ mờ dưới đáy ảnh) nữa, mà tách
// ra thành 1 tag riêng ".the-nhan-loai-goc" — là con trực tiếp
// của .tulieu-bento-lienket, định vị tuyệt đối ở góc trên bên
// trái ảnh (xem CSS .the-nhan-loai-goc trong style.css). Các phần
// khác của thẻ (tiêu đề, meta, link, ảnh) giữ nguyên như cũ.
// ------------------------------------------------------------
function taoHtmlOBento(baiViet, laNoiBat) {
  const nhanLoai =
    NHAN_LOAI_BAI_VIET_CONG_KHAI[baiViet.loai_bai_viet] || "Bài viết";

  const lopCss = laNoiBat
    ? "tulieu-bento-o tulieu-bento-noibat"
    : "tulieu-bento-o";

  const htmlKhungAnh = baiViet.anh_dai_dien
    ? `<img src="${thoatHtml(
        baiViet.anh_dai_dien
      )}" alt="" loading="lazy" />`
    : `<div class="tulieu-bento-anh-rong">${MA_SVG_DAU_TRIEM_NHO}</div>`;

  const duongDanBaiViet = "bai-viet.html?id=" + encodeURIComponent(baiViet.id);

  return (
    '<article class="' + lopCss + '">' +
    '<a href="' + duongDanBaiViet + '" class="tulieu-bento-lienket">' +
    '<div class="tulieu-bento-anh">' + htmlKhungAnh + '</div>' +
    '<span class="the-nhan-loai-goc">' + nhanLoai + '</span>' +
    '<div class="tulieu-bento-overlay">' +
    '<h3>' + thoatHtml(baiViet.tieu_de) + '</h3>' +
    '<span class="tulieu-meta tulieu-meta-nho">' + layDongMetaTuLieu(baiViet) + '</span>' +
    '</div>' +
    '</a>' +
    '</article>'
  );
}

function veDanhSachTuLieuBento(mangBaiViet, idKhungChua, thongBaoKhiRong) {
  const oKhungChua = document.getElementById(idKhungChua);

  if (!oKhungChua) {
    console.error(
      'render-tulieu.js: Không tìm thấy phần tử id="' + idKhungChua + '".'
    );
    return;
  }

  oKhungChua.classList.remove("luoi-the-bai-viet");

  if (!mangBaiViet || mangBaiViet.length === 0) {
    const chuThongBao =
      thongBaoKhiRong || "Chưa có tư liệu nào trong mục này.";
    oKhungChua.innerHTML = `<p class="thong-bao-rong-cong-khai">${chuThongBao}</p>`;
    return;
  }

  const htmlDanhSachO = mangBaiViet
    .map(function (baiViet, chiSo) {
      return taoHtmlOBento(baiViet, chiSo === 0);
    })
    .join("");

  oKhungChua.innerHTML = `<div class="tulieu-bento-luoi">${htmlDanhSachO}</div>`;
}

function taoHtmlTheMasonry(baiViet, laNoiBat) {
  const nhanLoai =
    NHAN_LOAI_BAI_VIET_CONG_KHAI[baiViet.loai_bai_viet] || "Bài viết";

  const lopCss = laNoiBat
    ? "tulieu-masonry-the tulieu-masonry-noibat"
    : "tulieu-masonry-the";

  const htmlKhungAnh = baiViet.anh_dai_dien
    ? `<img src="${thoatHtml(
        baiViet.anh_dai_dien
      )}" alt="" loading="lazy" />`
    : `<div class="tulieu-masonry-anh-rong">${MA_SVG_DAU_TRIEM_NHO}</div>`;

  const duongDanBaiViet = "bai-viet.html?id=" + encodeURIComponent(baiViet.id);

  return (
    '<article class="' + lopCss + '">' +
    '<a href="' + duongDanBaiViet + '" class="tulieu-masonry-lienket">' +
    '<div class="tulieu-masonry-anh">' + htmlKhungAnh + '</div>' +
    '<div class="tulieu-masonry-noidung">' +
    '<span class="nhan-loai-tulieu-nho">' + nhanLoai + '</span>' +
    '<h3>' + thoatHtml(baiViet.tieu_de) + '</h3>' +
    '<p class="tulieu-dong-mota">' + thoatHtml(layMoTaTuLieu(baiViet, 130)) + '</p>' +
    '<span class="tulieu-meta tulieu-meta-nho">' + layDongMetaTuLieu(baiViet) + '</span>' +
    '</div>' +
    '</a>' +
    '</article>'
  );
}

function veDanhSachTuLieuMasonry(mangBaiViet, idKhungChua, thongBaoKhiRong) {
  const oKhungChua = document.getElementById(idKhungChua);

  if (!oKhungChua) {
    console.error(
      'render-tulieu.js: Không tìm thấy phần tử id="' + idKhungChua + '".'
    );
    return;
  }

  oKhungChua.classList.remove("luoi-the-bai-viet");

  if (!mangBaiViet || mangBaiViet.length === 0) {
    const chuThongBao =
      thongBaoKhiRong || "Chưa có tư liệu nào trong mục này.";
    oKhungChua.innerHTML = `<p class="thong-bao-rong-cong-khai">${chuThongBao}</p>`;
    return;
  }

  const htmlDanhSachThe = mangBaiViet
    .map(function (baiViet, chiSo) {
      return taoHtmlTheMasonry(baiViet, chiSo === 0);
    })
    .join("");

  oKhungChua.innerHTML = `<div class="tulieu-masonry-luoi">${htmlDanhSachThe}</div>`;
}