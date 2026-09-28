# Macca Toàn Thắng — Website giới thiệu sản phẩm

Website ưu tiên desktop, sử dụng HTML, CSS và JavaScript thuần. Không cần Node.js, npm hoặc bước build.

## Mở website

Dùng **Open with Live Server** trong VS Code và mở `index.html`, hoặc đưa toàn bộ thư mục lên dịch vụ lưu trữ website tĩnh. Giữ nguyên cấu trúc đường dẫn tương đối. Với luồng nhiều trang, cần mở các trang trên cùng origin HTTP/HTTPS để giỏ hàng được dùng chung ổn định. Mở trực tiếp bằng `file://` có thể xem giao diện nhưng cơ chế chia sẻ localStorage giữa các tệp khác nhau phụ thuộc trình duyệt.

Phông chữ Google Fonts cần Internet; khi offline, website tự chuyển sang phông chữ hệ thống. Ảnh banner được lưu trong dự án, không phụ thuộc dịch vụ ảnh bên ngoài. Khuyến nghị xem ở chiều rộng 1280–1600 px; có bố cục thích ứng cho màn hình nhỏ.

## Trang câu chuyện thương hiệu

`cau-chuyen.html` là trang riêng, dùng `story.css` và `story.js`. Điều hướng ở trang chủ, giỏ hàng, tư vấn và thanh toán đã trỏ đến trang này. Trang chủ giữ một phần giới thiệu ngắn có nút đọc tiếp.

Trang mới có giới thiệu tinh thần thương hiệu và thẻ bài “Quả vàng” đánh thức đất cằn, tác giả Lệ Oanh, nguồn [Báo Phú Thọ](https://baophutho.vn/qua-vang-danh-thuc-dat-can-245476.htm). Thẻ gồm tóm tắt ngắn và liên kết mở bài gốc ở tab mới, không chép lại toàn văn hoặc ảnh của tòa soạn. Ảnh đầu trang là ảnh minh họa AI sẵn có, được ghi chú rõ. Nội dung không tự nhận nhân vật bài báo là người sáng lập thương hiệu hoặc gán chứng nhận OCOP chưa được xác nhận.

## Trang sản phẩm riêng

`san-pham.html` dùng `catalog.css`, `store.js` và logic dùng chung trong `app.js`. Trang có danh mục, tìm kiếm không dấu, số lượng kết quả, sắp xếp giá, chi tiết và thêm giỏ hàng. Liên kết `san-pham.html?category=gift` mở danh mục quà tặng; có thể dùng `?category=shell`, `?category=kernel` hoặc `?q=nhan` để mở lựa chọn ban đầu.

Liên kết Sản phẩm trên toàn website và nút tiếp tục mua sắm đã dẫn đến trang mới. Trang chủ vẫn giữ bộ sưu tập giới thiệu và nút xem tất cả. Đã chạy 14 kiểm tra logic/liên kết; chưa kiểm tra trực quan trang mới trong trình duyệt.

## Góc macca và Liên hệ

- `goc-macca.html`: trang bài viết với tìm kiếm không dấu, lọc Thưởng thức / Góc bếp / Quà tặng và trạng thái không có kết quả.
- Đường dẫn `goc-macca.html?article=thuong-thuc-macca`, `?article=sua-chua-macca`, `?article=chon-qua-macca` mở nội dung đầy đủ; mã bài không tồn tại có lối quay về.
- `journal-data.js`: nguồn bài viết dùng chung cho trang chủ và Góc macca. `journal.js` xử lý danh sách và bài chi tiết.
- `lien-he.html`: biểu mẫu tên, email, điện thoại tùy chọn, chủ đề và lời nhắn. Có kiểm tra dữ liệu, xem lại, chỉnh sửa và tải tệp TXT. `contact.js` xử lý biểu mẫu; thông tin chỉ trong bộ nhớ trang, chưa gửi qua mạng.
- `content-pages.css`: giao diện hai trang. `story.js` cập nhật năm và giỏ hàng dùng chung.
- Hotline, email doanh nghiệp và địa chỉ chưa được cung cấp nên hiển thị đang cập nhật; không tạo số điện thoại hoặc vị trí giả.

Điều hướng Góc macca / Liên hệ trên toàn website đã trỏ đến các trang riêng. Thẻ bài viết ở trang chủ mở đường dẫn bài tương ứng. Đã chạy 17 kiểm tra logic và liên kết; chưa kiểm tra trực quan trên trình duyệt.

## Các trang mới

- `tu-van.html`: biểu mẫu tư vấn, chọn nhu cầu, số lượng và ngân sách; kiểm tra thông tin, xem lại, chỉnh sửa và tải bản yêu cầu.
- `gio-hang.html`: danh sách sản phẩm, nhập hoặc tăng giảm số lượng, xóa, gợi ý thêm sản phẩm và tổng tiền.
- `thanh-toan.html`: thông tin nhận hàng, hai mức phí vận chuyển mẫu, COD mô phỏng, xem kết quả và tải đơn mẫu.
- `store.js`: dữ liệu sản phẩm, đọc/ghi giỏ hàng có kiểm tra và hàm tính giá dùng chung.
- `commerce.js` / `commerce.css`: logic và giao diện cho các trang mới, giữ phong cách desktop của trang chủ.

Các nút Giỏ hàng và Tạo yêu cầu tư vấn trên trang chủ đã chuyển đến trang riêng. Giỏ đồng bộ qua localStorage. Đơn mẫu giữ nguyên giỏ để có thể chỉnh sửa; thông tin cá nhân và bản tóm tắt chỉ tồn tại trong bộ nhớ trang, mất khi tải lại. Không gửi thông tin đến cửa hàng. Chuyển khoản/thẻ/ví điện tử chưa khả dụng và không thu thập thông tin thanh toán.

## Tính năng

- Trang chủ, câu chuyện thương hiệu, bộ sưu tập, quà tặng, bài viết, liên hệ.
- Lọc danh mục, tìm kiếm không dấu và sắp xếp giá.
- Hộp thoại xem chi tiết sản phẩm và bài viết.
- Giỏ hàng: thêm, xóa, tăng giảm số lượng, tính tạm tính, lưu trong localStorage khi trình duyệt cho phép.
- Khôi phục giỏ hàng có kiểm tra dữ liệu; giới hạn 99 sản phẩm mỗi loại; đồng bộ giữa các tab cùng origin.
- Biểu mẫu kiểm tra thông tin và tải tệp yêu cầu TXT về máy. Không gửi đơn, không thu tiền, không lưu thông tin cá nhân vào localStorage.
- Điều hướng bàn phím, nhãn truy cập, dialog gốc của trình duyệt, thông báo trạng thái, chế độ giảm chuyển động.

## Chỉnh sửa

- `index.html`: nội dung thương hiệu, điều hướng, các khu vực trang chủ.
- `styles.css`: màu sắc, kiểu chữ, bố cục desktop và các breakpoint.
- `app.js`: tìm kiếm, lọc sản phẩm, bài viết, chính sách và tương tác trang chủ.
- `store.js`: mảng `products`, giá VND, quy cách, khóa lưu giỏ và phí vận chuyển mẫu (30.000 ₫ tiêu chuẩn / 45.000 ₫ nhanh). Khi thay đổi phí, cập nhật cả nhãn tương ứng trong `thanh-toan.html`.
- `assets/macca-hero.png`: ảnh banner AI.
- `assets/macca-natural.png`, `assets/macca-kernel.png`, `assets/macca-roasted.png`, `assets/macca-gift.png`: bốn ảnh AI riêng theo sản phẩm, dùng chung trong danh mục, chi tiết, gợi ý, giỏ hàng và thanh toán. Đường dẫn đặt tại trường `image` trong `store.js`. Thay bằng ảnh sản phẩm thật khi triển khai bán hàng.
- `assets/product-image-prompts.md`: prompt và đường dẫn đầy đủ của bộ ảnh sản phẩm, tạo bằng imagegen tích hợp.
- `assets/favicon.svg`: biểu tượng tab trình duyệt.

## Trước khi mở bán thật

Đây là frontend mẫu, chưa phải hệ thống thương mại điện tử vận hành đầy đủ. Giá, quy cách, hình minh họa và hộp quà là dữ liệu thiết kế. Không có đánh giá khách hàng, chứng nhận hoặc thành tích giả.

Cần bổ sung dữ liệu thật về sản phẩm, thành phần, xuất xứ, nhãn, tồn kho, thông tin pháp nhân, địa chỉ, hotline và chính sách đã được doanh nghiệp xác nhận. Kết nối API sản phẩm/đơn hàng, tính phí vận chuyển và cổng thanh toán nếu cần. Máy chủ phải kiểm tra lại giá và tồn kho; không tin dữ liệu từ trình duyệt. Thay chức năng tải bản yêu cầu bằng quy trình gửi đơn có xác nhận thành công/lỗi từ máy chủ. Các yêu cầu triển khai kinh doanh cần được rà soát riêng trước khi công bố.

## Kiểm thử luồng nhiều trang

Chạy `node tests/commerce.test.cjs` nếu máy có Node.js. Đã chạy thành công 13 kiểm tra qua Node VM của công cụ: dữ liệu giỏ không hợp lệ; thêm/sửa/xóa; phí giao hàng; giỏ trống; giỏ thay đổi trong tab khác; biểu mẫu thiếu dữ liệu; bản tóm tắt an toàn; phương thức không khả dụng; tư vấn/xem lại/tải xuống; đồng bộ tab; lỗi lưu trữ; liên kết và cú pháp. Các kiểm tra dùng DOM giả lập, không thay cho kiểm tra trình duyệt.

Kiểm tra thủ công trên HTTP: thêm sản phẩm ở trang chủ → mở giỏ → thay đổi số lượng → thanh toán → nhập địa chỉ → chọn giao nhanh → xác nhận đơn mẫu → tải tệp. Kiểm tra tư vấn với nội dung hợp lệ và thiếu thông tin; quay lại chỉnh sửa; tải bản yêu cầu. Kiểm tra thêm nút Back, điều hướng bàn phím và reload.

## Kiểm tra đã thực hiện

- JavaScript hợp lệ về cú pháp qua Node VM.
- Không trùng ID và không có anchor nội bộ trỏ đến ID thiếu.
- Kiểm tra logic bằng Node VM với DOM giả lập: lọc dữ liệu giỏ lưu trữ, tạm tính, lưu giỏ, bộ lọc, tìm kiếm không dấu, xử lý từ khóa dưới dạng văn bản, sắp xếp giá, giới hạn số lượng và giỏ trống.
- Kiểm tra biểu thức số điện thoại với số nội địa, mã quốc gia và chuỗi không hợp lệ.
- Chưa kiểm tra trực quan hoặc end-to-end trong trình duyệt vì phiên làm việc không có trình duyệt kết nối. Cần xác nhận lại bố cục 1440 px, 1024 px và 390 px, focus bàn phím, Esc/đóng dialog, tải tệp yêu cầu và lưu giỏ sau khi reload trên trình duyệt thực tế.

## Nguồn ảnh

Tạo bằng công cụ imagegen tích hợp. Tệp: `assets/macca-hero.png`.

Prompt cuối:

> Use case: product-mockup. Create a premium editorial food photograph for a Vietnamese macadamia brand website hero. Landscape 3:2 composition. A shallow handmade brown ceramic bowl overflowing with cream-colored round macadamia kernels and a few rich brown macadamia shells, on warm ivory linen and pale beige stone table. Fresh glossy dark green macadamia leaves on a branch enter upper right, a few cracked shells and kernels scattered foreground. Warm afternoon natural side lighting, beautiful realistic textures, sophisticated organic food magazine photography, restrained colors, close up shot, shallow depth of field. No lettering, no logos, no other nuts, no packaging. Bowl center-right, full image filled with photography.


## Logo liên hệ và cỡ chữ

Bốn biểu tượng điện thoại, Zalo, Facebook và Gmail được cố định ở góc dưới bên phải trên cả 8 trang. Trên màn hình hẹp chúng xếp thành cụm 2×2. Nút chỉ hiển thị logo; nhãn truy cập và chú thích hover giúp nhận biết từng kênh. Các khối liên hệ lớn trước đây đã được bỏ.

Nhập thông tin công khai đã xác nhận trong `owner-contact.js` để kích hoạt URL `tel:`, `mailto:` và HTTPS đúng tên miền Zalo/Facebook. Khi dữ liệu còn trống, biểu tượng vẫn hiển thị nhưng không mở liên kết giả. Cỡ chữ nội dung và biểu mẫu đã được tăng lên khoảng 16–18px.
