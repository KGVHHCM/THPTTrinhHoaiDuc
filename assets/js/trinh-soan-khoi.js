/*
  FILE: assets/js/trinh-soan-khoi.js
  MỤC ĐÍCH: Trình soạn bài kiểu "khối" dùng chung cho
    - admin/bai-viet-form.html  (tin tức)
    - admin/tu-lieu-form.html   (tư liệu & ký ức)

  CÁC LOẠI KHỐI: chu, tieu_de, anh (1 hoặc nhiều ảnh), trich_dan, video, pdf
  DỮ LIỆU LƯU: mảng JSON vào cột noi_dung_khoi (jsonb). Đồng thời vẫn
  điền các cột cũ (noi_dung, danh_sach_anh, danh_sach_video,
  file_dinh_kem) để các trang công khai cũ chưa sửa vẫn hiển thị được.

  CÁCH DÙNG (trong form):
    trinhSoanKhoi.khoiTao("trinh-soan-khoi");
    trinhSoanKhoi.napTuBaiViet(baiViet);                 // khi sửa bài
    const kq = await trinhSoanKhoi.hoanTatDeLuu(uploadAnh, uploadFileDinhKem);
*/

const trinhSoanKhoi = (function () {
  const DANH_SACH_LOAI = [
    { loai: "chu", nhan: "Chữ" },
    { loai: "tieu_de", nhan: "Tiêu đề" },
    { loai: "anh", nhan: "Ảnh (1 hoặc nhiều ảnh)" },
    { loai: "trich_dan", nhan: "Trích dẫn" },
    { loai: "video", nhan: "Video" },
    { loai: "pdf", nhan: "File PDF" },
  ];

  let mangKhoi = [];
  let oBoChua = null;
  let chiSoDangKeo = null;
  let daThayDoi = false;
  let khoaNhapHienTai = null;

  // ------------------------------------------------------------
  // TIỆN ÍCH
  // ------------------------------------------------------------
  function thoatHtml(chuoi) {
    return String(chuoi == null ? "" : chuoi)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Chỉ cho phép link http(s) hoặc blob (xem trước) để tránh link javascript:
  function urlAnToan(url) {
    const u = String(url || "").trim();
    return /^(https?:\/\/|blob:)/i.test(u) ? u : "";
  }

  function layMaYoutube(url) {
    const m = String(url || "").match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
    );
    return m ? m[1] : null;
  }

  function danhDauThayDoi() {
    daThayDoi = true;
  }

  function taoKhoiMoi(loai) {
    switch (loai) {
      case "chu":
        return { loai: loai, van_ban: "" };
      case "tieu_de":
        return { loai: loai, van_ban: "", cap: 2 };
      case "anh":
        // danh_sach: [{ url, chu_thich, file, xem_truoc }]; bo_cuc: "luoi" | "doc"
        return { loai: "anh", danh_sach: [], bo_cuc: "luoi" };
      case "trich_dan":
        return { loai: loai, van_ban: "", nguon: "" };
      case "video":
        return { loai: loai, url: "" };
      case "pdf":
        return { loai: loai, url: "", ten: "", file: null, xem_truoc: "" };
      default:
        return { loai: "chu", van_ban: "" };
    }
  }

  // Chuyển khối ảnh kiểu cũ ({loai:"anh", url} hoặc {loai:"thu_vien"}) về
  // dạng mới {loai:"anh", danh_sach:[...]}
  function chuanHoaKhoi(khoi) {
    if (khoi.loai === "anh" || khoi.loai === "thu_vien") {
      let ds = [];
      if (Array.isArray(khoi.danh_sach)) {
        ds = khoi.danh_sach;
      } else if (khoi.url) {
        ds = [{ url: khoi.url, chu_thich: khoi.chu_thich || "" }];
      }
      return {
        loai: "anh",
        bo_cuc: khoi.bo_cuc === "doc" ? "doc" : "luoi",
        danh_sach: ds.map(function (a) {
          const url = typeof a === "string" ? a : a.url;
          const chuThich = typeof a === "string" ? "" : a.chu_thich || "";
          return { url: url, chu_thich: chuThich, file: null, xem_truoc: "" };
        }),
      };
    }
    return Object.assign(taoKhoiMoi(khoi.loai), khoi);
  }

  // ------------------------------------------------------------
  // VẼ GIAO DIỆN
  // ------------------------------------------------------------
  function htmlThanKhoi(khoi) {
    switch (khoi.loai) {
      case "chu":
        return (
          '<textarea data-truong="van_ban" rows="5" placeholder="Nhập đoạn văn...">' +
          thoatHtml(khoi.van_ban) + "</textarea>"
        );

      case "tieu_de":
        return (
          '<input type="text" data-truong="van_ban" placeholder="Nhập tiêu đề" value="' +
          thoatHtml(khoi.van_ban) + '" />' +
          '<select data-truong="cap">' +
          '<option value="2"' + (khoi.cap !== 3 ? " selected" : "") + ">Tiêu đề lớn</option>" +
          '<option value="3"' + (khoi.cap === 3 ? " selected" : "") + ">Tiêu đề nhỏ</option>" +
          "</select>"
        );

      case "trich_dan":
        return (
          '<textarea data-truong="van_ban" rows="3" placeholder="Nội dung trích dẫn...">' +
          thoatHtml(khoi.van_ban) + "</textarea>" +
          '<input type="text" data-truong="nguon" placeholder="Nguồn / người nói (không bắt buộc)" value="' +
          thoatHtml(khoi.nguon) + '" />'
        );

      case "video":
        return (
          '<input type="text" data-truong="url" placeholder="Dán link YouTube hoặc link video trực tiếp (.mp4)" value="' +
          thoatHtml(khoi.url) + '" />'
        );

      case "anh": {
        const cacO = khoi.danh_sach
          .map(function (a, i) {
            return (
              '<div class="o-anh-khoi">' +
                '<img src="' + thoatHtml(a.xem_truoc || a.url) + '" alt="Ảnh trong khối" />' +
                '<input type="text" data-chu-thich-anh="' + i + '" placeholder="Chú thích (không bắt buộc)" value="' +
                  thoatHtml(a.chu_thich) + '" />' +
                '<div class="o-anh-khoi-nut">' +
                  '<button type="button" data-hanh-dong="anh-truoc" data-anh="' + i + '" title="Chuyển ảnh lên trước"' + (i === 0 ? " disabled" : "") + ">◀</button>" +
                  '<button type="button" data-hanh-dong="anh-sau" data-anh="' + i + '" title="Chuyển ảnh ra sau"' + (i === khoi.danh_sach.length - 1 ? " disabled" : "") + ">▶</button>" +
                  '<button type="button" class="khoi-nut-xoa" data-hanh-dong="xoa-anh" data-anh="' + i + '" title="Xóa ảnh này">Xóa</button>' +
                "</div>" +
              "</div>"
            );
          })
          .join("");
        return (
          '<input type="file" accept="image/*" multiple data-chon-file="anh" />' +
          '<p class="ghi-chu-truong">Chọn được nhiều ảnh cùng lúc, và có thể bấm chọn thêm nhiều lần. Chỉ chọn 1 ảnh thì ảnh hiển thị lớn.</p>' +
          (khoi.danh_sach.length > 0
            ? '<select data-truong="bo_cuc">' +
                '<option value="luoi"' + (khoi.bo_cuc !== "doc" ? " selected" : "") + ">Xếp lưới (nhiều ảnh nhỏ cạnh nhau)</option>" +
                '<option value="doc"' + (khoi.bo_cuc === "doc" ? " selected" : "") + ">Xếp dọc (mỗi ảnh một hàng, ảnh lớn)</option>" +
              "</select>"
            : "") +
          '<div class="luoi-o-anh-khoi">' + cacO + "</div>"
        );
      }

      case "pdf": {
        const dangCo = khoi.file ? khoi.file.name : khoi.url ? khoi.url.split("/").pop() : "";
        return (
          '<input type="file" accept="application/pdf" data-chon-file="pdf" />' +
          (dangCo ? '<p class="khoi-ten-file">Đang chọn: ' + thoatHtml(dangCo) + "</p>" : "") +
          '<input type="text" data-truong="ten" placeholder="Tên hiển thị của file" value="' +
          thoatHtml(khoi.ten) + '" />'
        );
      }
    }
    return "";
  }

  function veMotKhoi(khoi, chiSo) {
    const nhan = DANH_SACH_LOAI.find(function (x) { return x.loai === khoi.loai; }).nhan;
    const o = document.createElement("div");
    o.className = "khoi-noi-dung";
    o.dataset.chiSo = chiSo;
    o.innerHTML =
      '<div class="khoi-thanh-tren">' +
        '<span class="khoi-tay-cam" title="Kéo để đổi thứ tự" aria-hidden="true">⠿</span>' +
        '<span class="khoi-ten-loai">' + nhan + "</span>" +
        '<div class="khoi-nut-nhom">' +
          '<button type="button" data-hanh-dong="len" title="Chuyển lên"' + (chiSo === 0 ? " disabled" : "") + ">▲</button>" +
          '<button type="button" data-hanh-dong="xuong" title="Chuyển xuống"' + (chiSo === mangKhoi.length - 1 ? " disabled" : "") + ">▼</button>" +
          '<button type="button" data-hanh-dong="nhan-ban" title="Nhân bản khối này">Nhân bản</button>' +
          '<button type="button" data-hanh-dong="xoa" class="khoi-nut-xoa" title="Xóa khối">Xóa</button>' +
        "</div>" +
      "</div>" +
      '<div class="khoi-than">' + htmlThanKhoi(khoi) + "</div>";
    return o;
  }

  function veToanBo() {
    oBoChua.innerHTML = "";
    if (mangKhoi.length === 0) {
      oBoChua.innerHTML =
        '<p class="khoi-trong">Chưa có khối nào. Bấm một nút bên dưới để thêm khối đầu tiên.</p>';
      return;
    }
    mangKhoi.forEach(function (khoi, chiSo) {
      oBoChua.appendChild(veMotKhoi(khoi, chiSo));
    });
  }

  // ------------------------------------------------------------
  // THAO TÁC TRÊN KHỐI
  // ------------------------------------------------------------
  function themKhoi(loai) {
    mangKhoi.push(taoKhoiMoi(loai));
    veToanBo();
    danhDauThayDoi();
    const oMoi = oBoChua.lastElementChild;
    oMoi.scrollIntoView({ behavior: "smooth", block: "center" });
    const oNhap = oMoi.querySelector("textarea, input[type=text]");
    if (oNhap) {
      oNhap.focus({ preventScroll: true });
    }
  }

  function doiViTri(tu, den) {
    if (den < 0 || den >= mangKhoi.length || tu === den) {
      return;
    }
    const khoiDuocDoi = mangKhoi.splice(tu, 1)[0];
    mangKhoi.splice(den, 0, khoiDuocDoi);
    veToanBo();
    danhDauThayDoi();
  }

  function nhanBan(chiSo) {
    const goc = mangKhoi[chiSo];
    const ban = Object.assign({}, goc);
    if (goc.danh_sach) {
      ban.danh_sach = goc.danh_sach.map(function (a) { return Object.assign({}, a); });
    }
    mangKhoi.splice(chiSo + 1, 0, ban);
    veToanBo();
    danhDauThayDoi();
  }

  function layChiSoKhoi(phanTu) {
    const o = phanTu.closest(".khoi-noi-dung");
    return o ? Number(o.dataset.chiSo) : -1;
  }

  function xuLyClick(e) {
    const nut = e.target.closest("[data-hanh-dong]");
    if (!nut || nut.disabled) {
      return;
    }
    const chiSo = layChiSoKhoi(nut);
    if (chiSo < 0) {
      return;
    }
    switch (nut.dataset.hanhDong) {
      case "len":
        doiViTri(chiSo, chiSo - 1);
        break;
      case "xuong":
        doiViTri(chiSo, chiSo + 1);
        break;
      case "nhan-ban":
        nhanBan(chiSo);
        break;
      case "xoa":
        if (confirm("Xóa khối này?")) {
          mangKhoi.splice(chiSo, 1);
          veToanBo();
          danhDauThayDoi();
        }
        break;
      case "xoa-anh":
        mangKhoi[chiSo].danh_sach.splice(Number(nut.dataset.anh), 1);
        veToanBo();
        danhDauThayDoi();
        break;
      case "anh-truoc":
      case "anh-sau": {
        const ds = mangKhoi[chiSo].danh_sach;
        const i = Number(nut.dataset.anh);
        const j = nut.dataset.hanhDong === "anh-truoc" ? i - 1 : i + 1;
        if (j >= 0 && j < ds.length) {
          const tam = ds[i];
          ds[i] = ds[j];
          ds[j] = tam;
          veToanBo();
          danhDauThayDoi();
        }
        break;
      }
    }
  }

  function xuLyNhap(e) {
    const chiSo = layChiSoKhoi(e.target);
    if (chiSo < 0) {
      return;
    }

    // Chú thích của từng ảnh trong khối ảnh
    if (e.target.dataset.chuThichAnh !== undefined) {
      mangKhoi[chiSo].danh_sach[Number(e.target.dataset.chuThichAnh)].chu_thich = e.target.value;
      danhDauThayDoi();
      return;
    }

    const truong = e.target.dataset.truong;
    if (!truong) {
      return;
    }
    mangKhoi[chiSo][truong] = truong === "cap" ? Number(e.target.value) : e.target.value;
    danhDauThayDoi();
  }

  function xuLyChonFile(e) {
    const loai = e.target.dataset.chonFile;
    if (!loai) {
      return;
    }
    const chiSo = layChiSoKhoi(e.target);
    const cacFile = Array.from(e.target.files);
    if (chiSo < 0 || cacFile.length === 0) {
      return;
    }
    const khoi = mangKhoi[chiSo];

    if (loai === "anh") {
      cacFile.forEach(function (f) {
        khoi.danh_sach.push({ url: "", chu_thich: "", file: f, xem_truoc: URL.createObjectURL(f) });
      });
    } else if (loai === "pdf") {
      khoi.file = cacFile[0];
      khoi.xem_truoc = URL.createObjectURL(cacFile[0]);
      if (!khoi.ten) {
        khoi.ten = cacFile[0].name;
      }
    }
    veToanBo();
    danhDauThayDoi();
  }

  // ------------------------------------------------------------
  // KÉO THẢ BẰNG CHUỘT (chỉ kéo được khi bấm giữ vào tay cầm ⠿;
  // trên điện thoại dùng nút ▲ ▼)
  // ------------------------------------------------------------
  function ketThucKeo() {
    chiSoDangKeo = null;
    oBoChua.querySelectorAll(".khoi-noi-dung").forEach(function (k) {
      k.removeAttribute("draggable");
      k.classList.remove("dang-keo", "dich-tha");
    });
  }

  function ganSuKienKeoTha() {
    oBoChua.addEventListener("mousedown", function (e) {
      oBoChua.querySelectorAll(".khoi-noi-dung").forEach(function (k) {
        k.removeAttribute("draggable");
      });
      const oKhoi = e.target.closest(".khoi-noi-dung");
      if (oKhoi && e.target.closest(".khoi-tay-cam")) {
        oKhoi.setAttribute("draggable", "true");
      }
    });

    oBoChua.addEventListener("dragstart", function (e) {
      const oKhoi = e.target.closest(".khoi-noi-dung");
      if (!oKhoi || oKhoi.getAttribute("draggable") !== "true") {
        return;
      }
      chiSoDangKeo = Number(oKhoi.dataset.chiSo);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(chiSoDangKeo));
      oKhoi.classList.add("dang-keo");
    });

    oBoChua.addEventListener("dragover", function (e) {
      if (chiSoDangKeo === null) {
        return;
      }
      e.preventDefault();
      oBoChua.querySelectorAll(".dich-tha").forEach(function (k) {
        k.classList.remove("dich-tha");
      });
      const oDich = e.target.closest(".khoi-noi-dung");
      if (oDich) {
        oDich.classList.add("dich-tha");
      }
    });

    oBoChua.addEventListener("drop", function (e) {
      if (chiSoDangKeo === null) {
        return;
      }
      e.preventDefault();
      const oDich = e.target.closest(".khoi-noi-dung");
      const tu = chiSoDangKeo;
      ketThucKeo();
      if (oDich) {
        doiViTri(tu, Number(oDich.dataset.chiSo));
      }
    });

    oBoChua.addEventListener("dragend", ketThucKeo);
  }

  // ------------------------------------------------------------
  // HÀM CÔNG KHAI: khởi tạo, nạp dữ liệu cũ
  // ------------------------------------------------------------
  function khoiTao(idPhanTu) {
    const goc = document.getElementById(idPhanTu);
    const cacNutThem = DANH_SACH_LOAI.map(function (x) {
      return '<button type="button" class="nut-them-khoi" data-them="' + x.loai + '">+ ' + x.nhan + "</button>";
    }).join("");

    goc.innerHTML =
      '<div class="khoi-danh-sach"></div>' +
      '<div class="thanh-them-khoi">' + cacNutThem + "</div>";

    oBoChua = goc.querySelector(".khoi-danh-sach");

    goc.querySelector(".thanh-them-khoi").addEventListener("click", function (e) {
      const nut = e.target.closest("[data-them]");
      if (nut) {
        themKhoi(nut.dataset.them);
      }
    });
    oBoChua.addEventListener("click", xuLyClick);
    oBoChua.addEventListener("input", xuLyNhap);
    oBoChua.addEventListener("change", xuLyChonFile);
    ganSuKienKeoTha();

    veToanBo();
  }

  // Bài cũ (chưa có noi_dung_khoi) -> chuyển thành các khối để sửa tiếp
  function chuyenBaiCu(bv) {
    const ketQua = [];
    if (bv.noi_dung && bv.noi_dung.trim()) {
      ketQua.push(Object.assign(taoKhoiMoi("chu"), { van_ban: bv.noi_dung.trim() }));
    }
    if (bv.danh_sach_anh && bv.danh_sach_anh.length > 0) {
      const khoiAnh = taoKhoiMoi("anh");
      khoiAnh.danh_sach = bv.danh_sach_anh.map(function (url) {
        return { url: url, chu_thich: "", file: null, xem_truoc: "" };
      });
      ketQua.push(khoiAnh);
    }
    (bv.danh_sach_video || []).forEach(function (url) {
      ketQua.push(Object.assign(taoKhoiMoi("video"), { url: url }));
    });
    if (bv.file_dinh_kem) {
      const ten = decodeURIComponent(bv.file_dinh_kem.split("/").pop());
      ketQua.push(Object.assign(taoKhoiMoi("pdf"), { url: bv.file_dinh_kem, ten: ten }));
    }
    return ketQua;
  }

  function napTuBaiViet(bv) {
    if (Array.isArray(bv.noi_dung_khoi) && bv.noi_dung_khoi.length > 0) {
      mangKhoi = bv.noi_dung_khoi.map(chuanHoaKhoi);
    } else {
      mangKhoi = chuyenBaiCu(bv);
    }
    veToanBo();
  }

  // ------------------------------------------------------------
  // LƯU: upload file mới, dọn khối rỗng, tạo các cột tương thích
  // ------------------------------------------------------------
  function taoCotTuongThich(mang) {
    const doan = [];
    const cacAnh = [];
    const cacVideo = [];
    let filePdf = null;

    mang.forEach(function (k) {
      if (k.loai === "chu" || k.loai === "tieu_de") {
        doan.push(k.van_ban);
      } else if (k.loai === "trich_dan") {
        doan.push("“" + k.van_ban + "”" + (k.nguon ? " — " + k.nguon : ""));
      } else if (k.loai === "anh") {
        k.danh_sach.forEach(function (a) { cacAnh.push(a.url); });
      } else if (k.loai === "video") {
        cacVideo.push(k.url);
      } else if (k.loai === "pdf" && !filePdf) {
        filePdf = k.url;
      }
    });

    return {
      noi_dung: doan.join("\n\n"),
      danh_sach_anh: cacAnh,
      danh_sach_video: cacVideo,
      file_dinh_kem: filePdf,
    };
  }

  async function hoanTatDeLuu(hamUploadAnh, hamUploadPdf) {
    const boNho = new Map(); // tránh upload 2 lần khi khối được nhân bản

    async function taiLen(file, ham, tienToLoi) {
      if (boNho.has(file)) {
        return boNho.get(file);
      }
      const kq = await ham(file);
      if (!kq.thanhCong) {
        throw new Error(tienToLoi + kq.loi);
      }
      boNho.set(file, kq.url);
      return kq.url;
    }

    const ketQua = [];

    for (const khoi of mangKhoi) {
      if (khoi.loai === "chu") {
        const vb = khoi.van_ban.trim();
        if (vb) {
          ketQua.push({ loai: "chu", van_ban: vb });
        }
      } else if (khoi.loai === "tieu_de") {
        const vb = khoi.van_ban.trim();
        if (vb) {
          ketQua.push({ loai: "tieu_de", van_ban: vb, cap: khoi.cap === 3 ? 3 : 2 });
        }
      } else if (khoi.loai === "trich_dan") {
        const vb = khoi.van_ban.trim();
        if (vb) {
          ketQua.push({ loai: "trich_dan", van_ban: vb, nguon: (khoi.nguon || "").trim() });
        }
      } else if (khoi.loai === "video") {
        const url = (khoi.url || "").trim();
        if (url) {
          ketQua.push({ loai: "video", url: url });
        }
      } else if (khoi.loai === "anh") {
        const danhSach = [];
        for (const a of khoi.danh_sach) {
          let url = a.url;
          if (a.file) {
            url = await taiLen(a.file, hamUploadAnh, "Lỗi tải ảnh: ");
          }
          if (url) {
            danhSach.push({ url: url, chu_thich: (a.chu_thich || "").trim() });
          }
        }
        if (danhSach.length > 0) {
          ketQua.push({ loai: "anh", bo_cuc: khoi.bo_cuc === "doc" ? "doc" : "luoi", danh_sach: danhSach });
        }
      } else if (khoi.loai === "pdf") {
        let url = khoi.url;
        if (khoi.file) {
          url = await taiLen(khoi.file, hamUploadPdf, "Lỗi tải file đính kèm: ");
        }
        if (url) {
          ketQua.push({ loai: "pdf", url: url, ten: (khoi.ten || "").trim() || "Tài liệu đính kèm" });
        }
      }
    }

    if (ketQua.length === 0) {
      throw new Error("Bài viết cần có ít nhất một khối nội dung.");
    }

    return Object.assign({ khoi: ketQua }, taoCotTuongThich(ketQua));
  }

  // ------------------------------------------------------------
  // HIỂN THỊ NỘI DUNG (dùng cho Xem trước; trang công khai có thể
  // dùng lại hàm taoHtmlNoiDung này ở bước sau)
  // ------------------------------------------------------------
  function taoHtmlNoiDung(mang) {
    return mang
      .map(function (khoi) {
        switch (khoi.loai) {
          case "chu":
            return '<div class="bv-khoi bv-khoi-chu">' +
              thoatHtml(khoi.van_ban).replace(/\n/g, "<br>") + "</div>";

          case "tieu_de": {
            const the = khoi.cap === 3 ? "h3" : "h2";
            return "<" + the + ' class="bv-khoi bv-khoi-tieu-de">' +
              thoatHtml(khoi.van_ban) + "</" + the + ">";
          }

          case "trich_dan":
            return '<blockquote class="bv-khoi bv-khoi-trich-dan"><p>' +
              thoatHtml(khoi.van_ban).replace(/\n/g, "<br>") + "</p>" +
              (khoi.nguon ? "<footer>" + thoatHtml(khoi.nguon) + "</footer>" : "") +
              "</blockquote>";

          case "anh":
          case "thu_vien": {
            // chuanHoaKhoi đưa cả dữ liệu cũ (anh đơn, thu_vien) về danh_sach
            const cacAnh = chuanHoaKhoi(khoi).danh_sach.filter(function (a) {
              return urlAnToan(a.url);
            });
            if (cacAnh.length === 0) { return ""; }

            const htmlMotAnh = function (a) {
              return '<figure class="bv-anh"><img src="' + thoatHtml(urlAnToan(a.url)) +
                '" alt="' + thoatHtml(a.chu_thich) + '" loading="lazy" />' +
                (a.chu_thich ? "<figcaption>" + thoatHtml(a.chu_thich) + "</figcaption>" : "") +
                "</figure>";
            };

            // 1 ảnh -> hiển thị lớn; nhiều ảnh -> theo bố cục đã chọn
            const lopBoCuc = cacAnh.length === 1
              ? "bv-khoi-anh-don"
              : khoi.bo_cuc === "doc" ? "bv-khoi-anh-doc" : "bv-khoi-anh-luoi";
            return '<div class="bv-khoi bv-khoi-anh ' + lopBoCuc + '">' +
              cacAnh.map(htmlMotAnh).join("") + "</div>";
          }

          case "video": {
            const ma = layMaYoutube(khoi.url);
            if (ma) {
              return '<div class="bv-khoi bv-khoi-video"><iframe src="https://www.youtube.com/embed/' + ma +
                '" title="Video" allowfullscreen loading="lazy"></iframe></div>';
            }
            const url = urlAnToan(khoi.url);
            return url
              ? '<div class="bv-khoi bv-khoi-video"><video controls src="' + thoatHtml(url) + '"></video></div>'
              : "";
          }

          case "pdf": {
            const url = urlAnToan(khoi.url);
            if (!url) { return ""; }
            return '<a class="bv-khoi bv-khoi-pdf" href="' + thoatHtml(url) +
              '" target="_blank" rel="noopener">Tài liệu: ' + thoatHtml(khoi.ten || "Tải file PDF") + "</a>";
          }
        }
        return "";
      })
      .join("");
  }

  function chuyenSangDangXem() {
    return mangKhoi.map(function (khoi) {
      if (khoi.loai === "anh") {
        return {
          loai: "anh",
          bo_cuc: khoi.bo_cuc,
          danh_sach: khoi.danh_sach.map(function (a) {
            return { url: a.xem_truoc || a.url, chu_thich: a.chu_thich };
          }),
        };
      }
      if (khoi.loai === "pdf") {
        return { loai: "pdf", url: khoi.xem_truoc || khoi.url, ten: khoi.ten };
      }
      return khoi;
    });
  }

  function xemTruoc(tieuDe) {
    let khung = document.getElementById("khung-xem-truoc");
    if (!khung) {
      khung = document.createElement("div");
      khung.id = "khung-xem-truoc";
      khung.className = "khung-xem-truoc";
      khung.innerHTML =
        '<div class="xem-truoc-hop">' +
          '<button type="button" class="xem-truoc-dong">Đóng xem trước</button>' +
          '<div class="xem-truoc-noi-dung"></div>' +
        "</div>";
      document.body.appendChild(khung);

      khung.addEventListener("click", function (e) {
        if (e.target === khung || e.target.closest(".xem-truoc-dong")) {
          khung.classList.remove("mo");
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          khung.classList.remove("mo");
        }
      });
    }

    khung.querySelector(".xem-truoc-noi-dung").innerHTML =
      '<h1 class="bv-tieu-de">' + thoatHtml(tieuDe || "(Chưa có tiêu đề)") + "</h1>" +
      taoHtmlNoiDung(chuyenSangDangXem());
    khung.classList.add("mo");
  }

  // ------------------------------------------------------------
  // TỰ LƯU NHÁP (localStorage của trình duyệt, 10 giây/lần khi có thay đổi)
  // Lưu ý: ảnh/PDF chưa tải lên sẽ không nằm trong bản nháp.
  // ------------------------------------------------------------
  function khoiDeLuuNhap() {
    return mangKhoi.map(function (khoi) {
      if (khoi.loai === "anh") {
        return {
          loai: "anh",
          bo_cuc: khoi.bo_cuc,
          danh_sach: khoi.danh_sach
            .filter(function (a) { return a.url; })
            .map(function (a) { return { url: a.url, chu_thich: a.chu_thich }; }),
        };
      }
      const ban = Object.assign({}, khoi);
      delete ban.file;
      delete ban.xem_truoc;
      return ban;
    });
  }

  function hienTrangThai(noiDung) {
    const o = document.getElementById("trang-thai-tu-luu");
    if (o) {
      o.textContent = noiDung;
    }
  }

  function batTuLuuNhap(khoaLuu, layTruongNgoai, datTruongNgoai) {
    const khoa = "nhap-" + khoaLuu;
    khoaNhapHienTai = khoa;

    try {
      const daLuu = JSON.parse(localStorage.getItem(khoa) || "null");
      if (daLuu) {
        const gio = new Date(daLuu.thoi_gian).toLocaleString("vi-VN");
        if (confirm("Có bản nháp tự lưu lúc " + gio + ". Khôi phục bản nháp này?\n(Ảnh và PDF chưa tải lên không nằm trong bản nháp.)")) {
          datTruongNgoai(daLuu.truong);
          mangKhoi = (daLuu.khoi || []).map(chuanHoaKhoi);
          veToanBo();
          daThayDoi = true;
        } else {
          localStorage.removeItem(khoa);
        }
      }
    } catch (loi) {
      console.warn("Không đọc được bản nháp:", loi);
    }

    setInterval(function () {
      if (!daThayDoi) {
        return;
      }
      try {
        localStorage.setItem(khoa, JSON.stringify({
          thoi_gian: Date.now(),
          truong: layTruongNgoai(),
          khoi: khoiDeLuuNhap(),
        }));
        hienTrangThai("Đã tự lưu nháp lúc " + new Date().toLocaleTimeString("vi-VN"));
      } catch (loi) {
        console.warn("Không tự lưu được:", loi);
      }
    }, 10000);

    window.addEventListener("beforeunload", function (e) {
      if (daThayDoi) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
  }

  function xoaNhapTuLuu() {
    daThayDoi = false;
    if (khoaNhapHienTai) {
      localStorage.removeItem(khoaNhapHienTai);
    }
  }

  return {
    khoiTao: khoiTao,
    napTuBaiViet: napTuBaiViet,
    hoanTatDeLuu: hoanTatDeLuu,
    xemTruoc: xemTruoc,
    batTuLuuNhap: batTuLuuNhap,
    xoaNhapTuLuu: xoaNhapTuLuu,
    danhDauThayDoi: danhDauThayDoi,
    taoHtmlNoiDung: taoHtmlNoiDung,
  };
})();