// ============================================================
// FILE: assets/js/gallery.js
// MỤC ĐÍCH: Gom TOÀN BỘ ảnh và video từ mọi bài viết ĐÃ XUẤT BẢN
// (ở cả 4 loại: tin_tuc/hoi_uc/nghien_cuu/ky_niem) thành 2 danh sách
// phẳng, dùng riêng cho trang thu-vien.html.
//
// LƯU Ý: dự án KHÔNG có bảng riêng cho thư viện — ảnh lấy từ 2 cột
// "anh_dai_dien" + "danh_sach_anh", video lấy từ cột "danh_sach_video",
// đều thuộc bảng bai_viet (xem ghi chú trong docs/schema.sql).
//
// File này PHẢI được nhúng SAU posts.js (tái sử dụng hàm
// layDanhSachBaiViet, không viết lại logic gọi Supabase) và SAU
// render-card.js (tái sử dụng hàm thoatHtml để tránh vỡ layout khi
// tiêu đề bài viết chứa ký tự đặc biệt).
// ============================================================

// ------------------------------------------------------------
// HÀM: layToanBoAnhVideoThuVien
// MỤC ĐÍCH: Gọi API lấy TẤT CẢ bài viết đã xuất bản (không lọc theo
// loại), rồi duyệt qua từng bài để gom ảnh/video, kèm theo thông tin
// bài viết gốc (để bấm vào ảnh/video sẽ dẫn thẳng về đúng bài đó).
//
// THAM SỐ: không có
// TRẢ VỀ: 1 Promise, resolve về { thanhCong, mangAnh, mangVideo, loi }
//   - mangAnh / mangVideo: mảng object { url, idBaiViet, tieuDeBaiViet }
// ------------------------------------------------------------
async function layToanBoAnhVideoThuVien() {
  // loaiBaiViet = null: lấy CẢ 4 loại bài viết; chiLayDaXuatBan = true:
  // chỉ lấy bài đã công khai (thư viện là trang public, không được
  // lộ ảnh/video của bài đang ở dạng nháp)
  const ketQua = await layDanhSachBaiViet(null, true);

  if (!ketQua.thanhCong) {
    return { thanhCong: false, mangAnh: [], mangVideo: [], loi: ketQua.loi };
  }

  const mangAnh = [];
  const mangVideo = [];

  ketQua.duLieu.forEach(function (bv) {
    // Ảnh đại diện (nếu bài viết có khai báo) cũng được tính là 1
    // ảnh trong thư viện, không chỉ riêng ảnh phụ
    if (bv.anh_dai_dien) {
      mangAnh.push({
        url: bv.anh_dai_dien,
        idBaiViet: bv.id,
        tieuDeBaiViet: bv.tieu_de,
      });
    }

    // Toàn bộ ảnh phụ (nếu có) được gom vào cùng danh sách
    if (Array.isArray(bv.danh_sach_anh)) {
      bv.danh_sach_anh.forEach(function (urlAnh) {
        mangAnh.push({
          url: urlAnh,
          idBaiViet: bv.id,
          tieuDeBaiViet: bv.tieu_de,
        });
      });
    }

    // Video (nếu bài viết có khai báo link video)
    if (Array.isArray(bv.danh_sach_video)) {
      bv.danh_sach_video.forEach(function (urlVideo) {
        mangVideo.push({
          url: urlVideo,
          idBaiViet: bv.id,
          tieuDeBaiViet: bv.tieu_de,
        });
      });
    }
  });

  return { thanhCong: true, mangAnh: mangAnh, mangVideo: mangVideo, loi: "" };
}

// ------------------------------------------------------------
// HÀM: layIdYoutube
// MỤC ĐÍCH: Trích xuất ID video từ 1 đường dẫn YouTube, hỗ trợ các
// định dạng phổ biến admin có thể dán vào (link xem thường dạng
// "youtube.com/watch?v=...", link rút gọn "youtu.be/...", hoặc link
// nhúng sẵn "youtube.com/embed/..."), dùng để dựng URL nhúng <iframe>.
//
// THAM SỐ: url - chuỗi đường dẫn video admin đã dán vào form
// TRẢ VỀ: chuỗi ID video YouTube, hoặc null nếu KHÔNG khớp định dạng
// nào ở trên (khi đó coi như đây là link file video trực tiếp)
// ------------------------------------------------------------
function layIdYoutube(url) {
  const cacMauRegex = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtube\.com\/embed\/)([^?&]+)/,
    /(?:youtu\.be\/)([^?&]+)/,
  ];

  for (const mau of cacMauRegex) {
    const ketQuaKhop = url.match(mau);
    if (ketQuaKhop) {
      return ketQuaKhop[1];
    }
  }

  return null;
}

// ------------------------------------------------------------
// HÀM: taoHtmlTheVideo
// MỤC ĐÍCH: Nhận vào 1 object video (lấy từ mangVideo ở trên), trả
// về chuỗi HTML hiển thị video đó trong lưới thư viện:
//   - Nếu là link YouTube -> nhúng <iframe> phát trực tiếp trên trang
//   - Ngược lại -> coi như link file video trực tiếp (VD: .mp4 lưu
//     trên Supabase Storage) và dùng thẻ <video> có sẵn của trình duyệt
//
// THAM SỐ: video - object { url, idBaiViet, tieuDeBaiViet }
// TRẢ VỀ: chuỗi HTML của 1 thẻ <figure> trong lưới video
// ------------------------------------------------------------
function taoHtmlTheVideo(video) {
  const idYoutube = layIdYoutube(video.url);

  const htmlNoiDungVideo = idYoutube
    ? `<iframe
         src="https://www.youtube.com/embed/${idYoutube}"
         title="Video thư viện"
         loading="lazy"
         allowfullscreen
       ></iframe>`
    : `<video src="${thoatHtml(video.url)}" controls preload="metadata"></video>`;

  return `<figure class="the-video-thuvien">${htmlNoiDungVideo}</figure>`;
}