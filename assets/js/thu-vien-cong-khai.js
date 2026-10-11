// ============================================================
// FILE: assets/js/thu-vien-congkhai.js
// MỤC ĐÍCH: Phần CÔNG KHAI của mục "Quản lý thư viện" — đọc ảnh/video
// do admin đăng (bảng thu_vien_media + thu_vien_album, xem
// docs/thu-vien.sql) rồi GHÉP vào cùng danh sách với ảnh/video gom từ
// bài viết (gallery.js), để trang thu-vien.html hiển thị chung.
//
// File này CHỈ THÊM chức năng, không sửa gì trong gallery.js:
//   - Nếu 2 bảng mới chưa tồn tại (chưa chạy thu-vien.sql) hoặc bị lỗi,
//     layMediaThuVienCongKhai() trả về thanhCong:false và trang vẫn
//     hiện ảnh/video cũ từ bài viết như trước.
//
// PHẢI nhúng SAU gallery.js + render-card.js (cần hàm thoatHtml) và
// SAU supabase-client.js (cần biến supabaseClient).
// Tên hàm đều có đuôi "ThuVien" để không trùng với file khác.
// ============================================================

// Bộ lọc đang chọn: "all" | "noi-bat" | <id album>
let boLocThuVienHienTai = "all";

// Tra nhanh video do admin đăng theo id (dùng khi bấm thẻ video để mở popup)
const MAP_VIDEO_THU_VIEN = new Map();

let daGanSuKienLocThuVien = false;
let daGanSuKienVideoThuVien = false;


// ------------------------------------------------------------
// HÀM: layMediaThuVienCongKhai
// MỤC ĐÍCH: Lấy album + media ĐÃ XUẤT BẢN do admin đăng.
// Luôn lọc da_xuat_ban = true ở phía client để dù admin đang đăng
// nhập trên cùng trình duyệt cũng không lộ bản nháp ra trang công khai.
// TRẢ VỀ: { thanhCong, dsAlbum, dsMedia, loi }
// ------------------------------------------------------------
async function layMediaThuVienCongKhai() {
  try {
    const [kqAlbum, kqMedia] = await Promise.all([
      supabaseClient
        .from("thu_vien_album")
        .select("*")
        .eq("da_xuat_ban", true)
        .order("thu_tu", { ascending: true })
        .order("created_at", { ascending: false }),
      supabaseClient
        .from("thu_vien_media")
        .select("*")
        .eq("da_xuat_ban", true)
        .order("thu_tu", { ascending: true })
        .order("created_at", { ascending: false })
    ]);

    if (kqAlbum.error || kqMedia.error) {
      const loi = (kqAlbum.error || kqMedia.error).message;
      return { thanhCong: false, dsAlbum: [], dsMedia: [], loi: loi };
    }
    return { thanhCong: true, dsAlbum: kqAlbum.data, dsMedia: kqMedia.data, loi: "" };
  } catch (e) {
    return { thanhCong: false, dsAlbum: [], dsMedia: [], loi: e.message };
  }
}


// ------------------------------------------------------------
// HÀM: gopDuLieuThuVien
// MỤC ĐÍCH: Ghép dữ liệu do admin đăng (ketQuaMoi) với ảnh/video lấy từ
// bài viết (ketQuaCu, kết quả của layToanBoAnhVideoThuVien()).
//
// THỨ TỰ: mục do admin đăng đứng TRƯỚC (mục "nổi bật" lên đầu, còn lại
// theo thứ tự admin đã kéo thả), rồi tới ảnh/video từ bài viết.
//
// Mục của ảnh/video do admin đăng có thêm các trường:
//   nguon: "thuvien", id, albumId, noiBat, tieuDe, moTa, nguonTacGia,
//   ngayChup, the, urlThumb (+ loaiVideo, urlNhung cho video)
// và vẫn có sẵn url / idBaiViet / tieuDeBaiViet để tương thích với
// lightbox cũ trong thu-vien.html.
//
// TRẢ VỀ: { thanhCong: true, mangAnh, mangVideo, dsAlbum }
// ------------------------------------------------------------
function gopDuLieuThuVien(ketQuaCu, ketQuaMoi) {
  const mangAnh = [];
  const mangVideo = [];
  const dsAlbum = ketQuaMoi.thanhCong ? ketQuaMoi.dsAlbum : [];

  MAP_VIDEO_THU_VIEN.clear();

  if (ketQuaMoi.thanhCong) {
    // Mục nằm trong album đang bị ẩn thì cũng ẩn theo
    const idAlbumHienThi = new Set(dsAlbum.map(function (a) { return a.id; }));
    const dsMedia = ketQuaMoi.dsMedia.filter(function (m) {
      return !m.album_id || idAlbumHienThi.has(m.album_id);
    });

    // Mục nổi bật lên trước; sort ổn định nên thứ tự cũ trong mỗi nhóm được giữ nguyên
    dsMedia.sort(function (a, b) {
      return (b.noi_bat ? 1 : 0) - (a.noi_bat ? 1 : 0);
    });

    dsMedia.forEach(function (m) {
      const chung = {
        nguon: "thuvien",
        id: m.id,
        albumId: m.album_id,
        noiBat: !!m.noi_bat,
        tieuDe: m.tieu_de || "",
        moTa: m.mo_ta || "",
        nguonTacGia: m.nguon_tac_gia || "",
        ngayChup: m.ngay_chup || "",
        the: m.the || [],
        url: m.url,
        idBaiViet: null
      };

      if (m.loai === "anh") {
        chung.urlThumb = m.url_thumb || m.url;
        chung.tieuDeBaiViet = m.tieu_de || "Ảnh trong thư viện";
        mangAnh.push(chung);
      } else {
        chung.urlThumb = m.url_thumb || "";
        chung.loaiVideo = m.loai_video || "";
        chung.urlNhung = m.url_nhung || m.url;
        chung.tieuDeBaiViet = m.tieu_de || "Video trong thư viện";
        mangVideo.push(chung);
        MAP_VIDEO_THU_VIEN.set(m.id, chung);
      }
    });
  }

  if (ketQuaCu.thanhCong) {
    ketQuaCu.mangAnh.forEach(function (a) { mangAnh.push(a); });
    ketQuaCu.mangVideo.forEach(function (v) { mangVideo.push(v); });
  }

  return { thanhCong: true, mangAnh: mangAnh, mangVideo: mangVideo, dsAlbum: dsAlbum };
}


// ------------------------------------------------------------
// HÀM: locMucTheoBoLocThuVien
// MỤC ĐÍCH: Lọc 1 mảng ảnh (hoặc video) theo bộ lọc đang chọn.
// Ảnh/video lấy từ bài viết không thuộc album nào nên CHỈ xuất hiện
// ở mục "Tất cả".
// ------------------------------------------------------------
function locMucTheoBoLocThuVien(mang) {
  if (boLocThuVienHienTai === "all") return mang;

  if (boLocThuVienHienTai === "noi-bat") {
    return mang.filter(function (m) { return m.nguon === "thuvien" && m.noiBat; });
  }

  return mang.filter(function (m) { return m.nguon === "thuvien" && m.albumId === boLocThuVienHienTai; });
}


// ------------------------------------------------------------
// HÀM: veBoLocAlbumThuVien
// MỤC ĐÍCH: Vẽ hàng nút lọc (Tất cả / ★ Nổi bật / từng album) vào
// #thuvien-loc. Không có album nào và không có mục nổi bật thì ẩn cả
// hàng (không có gì để lọc).
//
// THAM SỐ:
//   duLieu  - kết quả của gopDuLieuThuVien()
//   khiDoi  - hàm được gọi sau khi người dùng đổi bộ lọc (để vẽ lại lưới)
// ------------------------------------------------------------
function veBoLocAlbumThuVien(duLieu, khiDoi) {
  const oLoc = document.getElementById("thuvien-loc");
  if (!oLoc) return;

  const mucMoi = duLieu.mangAnh.concat(duLieu.mangVideo).filter(function (m) {
    return m.nguon === "thuvien";
  });

  const demTheoAlbum = {};
  let soNoiBat = 0;
  mucMoi.forEach(function (m) {
    if (m.albumId) demTheoAlbum[m.albumId] = (demTheoAlbum[m.albumId] || 0) + 1;
    if (m.noiBat) soNoiBat++;
  });

  const dsAlbumCoMuc = duLieu.dsAlbum.filter(function (a) { return demTheoAlbum[a.id] > 0; });

  if (dsAlbumCoMuc.length === 0 && soNoiBat === 0) {
    oLoc.hidden = true;
    oLoc.innerHTML = "";
    boLocThuVienHienTai = "all";
    return;
  }

  // Nếu bộ lọc đang chọn không còn tồn tại thì về "Tất cả"
  const conTonTai =
    boLocThuVienHienTai === "all" ||
    (boLocThuVienHienTai === "noi-bat" && soNoiBat > 0) ||
    dsAlbumCoMuc.some(function (a) { return a.id === boLocThuVienHienTai; });
  if (!conTonTai) boLocThuVienHienTai = "all";

  function taoChip(giaTri, nhan, soLuong) {
    const dangChon = boLocThuVienHienTai === giaTri;
    return (
      '<button type="button" class="thuvien-chip' + (dangChon ? " dang-active" : "") +
      '" data-loc="' + thoatHtml(giaTri) + '" aria-pressed="' + (dangChon ? "true" : "false") + '">' +
      thoatHtml(nhan) + '<span class="thuvien-chip-dem">' + soLuong + "</span></button>"
    );
  }

  let htmlChip = taoChip("all", "Tất cả", duLieu.mangAnh.length + duLieu.mangVideo.length);
  if (soNoiBat > 0) htmlChip += taoChip("noi-bat", "★ Nổi bật", soNoiBat);
  dsAlbumCoMuc.forEach(function (a) {
    htmlChip += taoChip(a.id, a.ten, demTheoAlbum[a.id]);
  });

  oLoc.innerHTML =
    '<div class="thuvien-loc-chips" role="group" aria-label="Lọc theo album">' + htmlChip + "</div>" +
    '<p class="thuvien-loc-mo-ta" id="thuvien-loc-mo-ta"></p>';
  oLoc.hidden = false;
  capNhatMoTaAlbumThuVien(duLieu.dsAlbum);

  // Gắn sự kiện 1 lần duy nhất (các nút bị vẽ lại, nhưng khung #thuvien-loc thì giữ nguyên)
  if (daGanSuKienLocThuVien) return;
  daGanSuKienLocThuVien = true;

  oLoc.addEventListener("click", function (e) {
    const nut = e.target.closest(".thuvien-chip");
    if (!nut) return;

    boLocThuVienHienTai = nut.dataset.loc;
    oLoc.querySelectorAll(".thuvien-chip").forEach(function (c) {
      const dangChon = c === nut;
      c.classList.toggle("dang-active", dangChon);
      c.setAttribute("aria-pressed", dangChon ? "true" : "false");
    });
    capNhatMoTaAlbumThuVien(duLieu.dsAlbum);
    if (typeof khiDoi === "function") khiDoi();
  });
}

// Hiện mô tả của album đang chọn (nếu có) ngay dưới hàng nút lọc
function capNhatMoTaAlbumThuVien(dsAlbum) {
  const o = document.getElementById("thuvien-loc-mo-ta");
  if (!o) return;
  const album = dsAlbum.find(function (a) { return a.id === boLocThuVienHienTai; });
  o.textContent = album && album.mo_ta ? album.mo_ta : "";
  o.style.display = o.textContent ? "" : "none";
}


// ------------------------------------------------------------
// HÀM: dinhDangNgayThuVien — "2024-05-03" -> "03/05/2024"
// ------------------------------------------------------------
function dinhDangNgayThuVien(chuoi) {
  const khop = String(chuoi || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return khop ? khop[3] + "/" + khop[2] + "/" + khop[1] : String(chuoi || "");
}


// ------------------------------------------------------------
// HÀM: taoChuThichAnhThuVien
// MỤC ĐÍCH: Dựng HTML chú thích hiện dưới ảnh trong lightbox (tiêu đề,
// mô tả, ngày + nguồn). Ảnh lấy từ bài viết (không phải admin đăng) trả
// về chuỗi rỗng -> lightbox giữ nguyên như cũ, không có chú thích.
// ------------------------------------------------------------
function taoChuThichAnhThuVien(anh) {
  if (!anh || anh.nguon !== "thuvien") return "";

  const dongPhu = [];
  if (anh.ngayChup) dongPhu.push(dinhDangNgayThuVien(anh.ngayChup));
  if (anh.nguonTacGia) dongPhu.push("Nguồn: " + anh.nguonTacGia);

  let html = "";
  if (anh.tieuDe) html += "<strong>" + thoatHtml(anh.tieuDe) + "</strong>";
  if (anh.moTa) html += "<span>" + thoatHtml(anh.moTa) + "</span>";
  if (dongPhu.length) html += "<small>" + thoatHtml(dongPhu.join(", ")) + "</small>";
  return html;
}


// ------------------------------------------------------------
// HÀM: taoHtmlTheVideoThuVien
// MỤC ĐÍCH: Thẻ video do admin đăng. Chỉ hiện ảnh xem trước + nút phát
// (KHÔNG nhúng iframe sẵn) để trang nhẹ khi có nhiều video; bấm vào mới
// mở popup phát (xem moVideoThuVien). Video lấy từ bài viết vẫn dùng
// taoHtmlTheVideo() cũ trong gallery.js.
// ------------------------------------------------------------
function taoHtmlTheVideoThuVien(video) {
  const phanAnh = video.urlThumb
    ? '<img src="' + thoatHtml(video.urlThumb) + '" alt="" loading="lazy" />'
    : "";

  const phu = video.moTa || video.nguonTacGia || "";

  return (
    '<figure class="the-video-thuvien the-video-thuvien-moi">' +
      '<button type="button" class="thuvien-video-nut" data-id="' + thoatHtml(video.id) + '" ' +
        'aria-label="Phát video: ' + thoatHtml(video.tieuDe || "Video") + '">' +
        '<span class="thuvien-video-anh">' + phanAnh +
          '<span class="thuvien-video-play" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>' +
          "</span>" +
        "</span>" +
      "</button>" +
      "<figcaption>" +
        (video.tieuDe ? '<span class="thuvien-video-tieu-de">' + thoatHtml(video.tieuDe) + "</span>" : "") +
        (phu ? '<span class="thuvien-video-phu">' + thoatHtml(phu) + "</span>" : "") +
      "</figcaption>" +
    "</figure>"
  );
}


// ------------------------------------------------------------
// POPUP PHÁT VIDEO
// Dùng lại class .lightbox-anh / .lightbox-nut-dong của style.css để
// đồng bộ giao diện với lightbox ảnh. Popup được tạo 1 lần khi cần.
// ------------------------------------------------------------
function layPopupVideoThuVien() {
  let nen = document.getElementById("popup-video-thuvien");
  if (nen) return nen;

  nen = document.createElement("div");
  nen.id = "popup-video-thuvien";
  nen.className = "lightbox-anh lightbox-video";
  nen.setAttribute("role", "dialog");
  nen.setAttribute("aria-modal", "true");
  nen.setAttribute("aria-label", "Phát video");
  nen.innerHTML =
    '<button type="button" class="lightbox-nut-dong" id="popup-video-dong" aria-label="Đóng">&times;</button>' +
    '<div class="lightbox-video-khung" id="popup-video-khung"></div>' +
    '<p class="lightbox-video-tieu-de" id="popup-video-tieu-de"></p>';
  document.body.appendChild(nen);

  nen.querySelector("#popup-video-dong").addEventListener("click", dongVideoThuVien);
  nen.addEventListener("click", function (e) { if (e.target === nen) dongVideoThuVien(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nen.classList.contains("dang-mo")) dongVideoThuVien();
  });

  return nen;
}

function moVideoThuVien(video) {
  const nen = layPopupVideoThuVien();
  const khung = nen.querySelector("#popup-video-khung");

  if (video.loaiVideo === "file") {
    khung.innerHTML = '<video src="' + thoatHtml(video.urlNhung) + '" controls autoplay playsinline></video>';
  } else {
    let src = video.urlNhung;
    if (video.loaiVideo === "youtube") {
      src += (src.indexOf("?") === -1 ? "?" : "&") + "autoplay=1&rel=0";
    }
    khung.innerHTML =
      '<iframe src="' + thoatHtml(src) + '" title="' + thoatHtml(video.tieuDe || "Video") + '" ' +
      'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
  }

  nen.querySelector("#popup-video-tieu-de").textContent = video.tieuDe || "";
  nen.classList.add("dang-mo");
}

function dongVideoThuVien() {
  const nen = document.getElementById("popup-video-thuvien");
  if (!nen) return;
  nen.classList.remove("dang-mo");
  nen.querySelector("#popup-video-khung").innerHTML = ""; // xoá iframe/video để dừng phát
}

// Gắn sự kiện bấm thẻ video (uỷ quyền sự kiện lên khung lưới, gọi 1 lần)
function ganSuKienVideoThuVien() {
  if (daGanSuKienVideoThuVien) return;
  daGanSuKienVideoThuVien = true;

  document.getElementById("luoi-video-thuvien").addEventListener("click", function (e) {
    const nut = e.target.closest(".thuvien-video-nut");
    if (!nut) return;
    const video = MAP_VIDEO_THU_VIEN.get(nut.dataset.id);
    if (video) moVideoThuVien(video);
  });
}