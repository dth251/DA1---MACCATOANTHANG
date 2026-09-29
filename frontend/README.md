# Macca Toàn Thắng — Website giới thiệu sản phẩm

Website sử dụng HTML, CSS và JavaScript thuần. Giao diện không cần bước build; chức năng gửi yêu cầu và hộp thư admin chạy bằng máy chủ Node.js, không cần cài thư viện npm.

## Gửi yêu cầu về tài khoản admin

Ba biểu mẫu **Liên hệ**, **Tư vấn** và **Yêu cầu đặt hàng** gửi dữ liệu đến `POST /api/requests`. Sau khi máy chủ lưu thành công, khách nhận mã yêu cầu. Admin đăng nhập một lần tại `/admin.html`, sau đó dùng chung phiên cho Tổng quan, Sản phẩm, Đơn hàng, Yêu cầu từ khách, Khách hàng và Nội dung. Mục Yêu cầu từ khách cho phép xem, tìm kiếm, lọc và cập nhật trạng thái mà không đăng nhập lại. Hộp thư tự làm mới mỗi 30 giây khi đang mở. Đây là hộp thư trên website, không phải gửi email tự động.

### Chạy trên máy Windows

1. Cài Node.js 22 hoặc mới hơn nếu máy chưa có.
2. Từ thư mục `frontend`, chạy `./start-admin.ps1` trong PowerShell. Nhập tên đăng nhập và mật khẩu admin tối thiểu 12 ký tự. Mật khẩu được nhập ẩn; không có mật khẩu mặc định trong mã nguồn.
3. Mở `http://127.0.0.1:3000` để gửi thử từ trang khách hàng và `http://127.0.0.1:3000/admin.html#inbox` để đăng nhập admin bằng thông tin vừa nhập.
4. Giữ cửa sổ máy chủ hoạt động. Các lần khởi động sau nên dùng cùng thông tin đăng nhập.

Nếu môi trường đã cấp biến `ADMIN_USERNAME` và `ADMIN_PASSWORD`, chạy trực tiếp `node server/server.cjs`. Mặc định tên đăng nhập là `admin`, cổng `3000`, chỉ lắng nghe trên `127.0.0.1`. Node.js trong PATH là cần thiết cho hai cách chạy này.

### Đưa lên hosting

Hosting phải chạy được tiến trình Node.js lâu dài và có ổ lưu trữ bền vững. Dùng cùng origin cho website và `/api`; cấu hình HTTPS, `NODE_ENV=production`, `PUBLIC_ORIGIN=https://ten-mien-cua-ban` (không có dấu `/` cuối), `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `HOST=0.0.0.0` và `PORT` phù hợp. `DATA_DIR` cần trỏ tới thư mục hoặc volume tồn tại qua các lần triển khai. Không dùng Live Server hay hosting chỉ phục vụ tệp tĩnh cho luồng gửi thật.

Máy chủ hiện dùng một tiến trình và tệp JSON tại `.admin-data/requests.json` (hoặc `DATA_DIR`). Không chạy nhiều bản sao dùng chung tệp. Sao lưu dữ liệu khi triển khai; thư mục dữ liệu và tệp `.env` đã được loại khỏi Git và máy chủ không phục vụ chúng qua HTTP. Với nhiều máy chủ hoặc lượng đơn lớn cần thay tệp bằng cơ sở dữ liệu.

Mỗi yêu cầu có mã chống gửi trùng: thử lại cùng nội dung sau lỗi mạng không tạo thêm bản ghi. Giá và phí đơn hàng được tính trên máy chủ theo `server/catalog.json`; cần cập nhật tệp này cùng `store.js` khi đổi giá. Thay đổi giá trong danh mục quản lý cục bộ chưa thay giá website. Khách vẫn cần cửa hàng xác nhận đơn; hệ thống chưa thu tiền trực tuyến và chưa tự trừ tồn kho.

Mật khẩu admin được kiểm tra bằng scrypt; phiên đăng nhập dùng cookie HttpOnly/SameSite, hết hạn sau 8 giờ hoặc khi máy chủ khởi động lại. Chỉ các API admin có phiên hợp lệ mới đọc/cập nhật được yêu cầu. Dữ liệu yêu cầu không lưu vào localStorage của khách; sessionStorage chỉ giữ mã thử lại và dấu băm nội dung. Phần Đăng ký/Đăng nhập của khách hàng vẫn là giao diện riêng, chưa có hệ thống tài khoản khách.

Kiểm thử: `node tests/requests.test.cjs` (HTTP, xác thực, lưu bền vững, chống trùng, lỗi lưu), `node tests/request-client.test.cjs` (thử lại khi mất kết nối), `node tests/commerce.test.cjs` (biểu mẫu và giỏ hàng), `node tests/admin.test.cjs` (quản lý cục bộ).

## Mở website

Dùng máy chủ phía trên để sử dụng đầy đủ luồng gửi yêu cầu. **Open with Live Server** hoặc mở `index.html` trực tiếp chỉ phục vụ xem giao diện, không tiếp nhận biểu mẫu. Giữ nguyên cấu trúc đường dẫn tương đối. Với luồng nhiều trang, cần mở các trang trên cùng origin HTTP/HTTPS để giỏ hàng được dùng chung ổn định.

Phông chữ Google Fonts cần Internet; khi offline, website tự chuyển sang phông chữ hệ thống. Ảnh banner được lưu trong dự án, không phụ thuộc dịch vụ ảnh bên ngoài. Khuyến nghị xem ở chiều rộng 1280–1600 px; có bố cục thích ứng cho màn hình nhỏ.

## Trang quản lý admin

Mở `admin.html` trên máy chủ. Trang quản lý dùng phong cách xanh/mộc của website, có bố cục thích ứng và điều hướng riêng; không thêm mục admin vào header khách hàng.

- **Tổng quan:** thống kê sản phẩm, đơn hàng thủ công, khách hàng và giá trị đơn hoàn thành (bao gồm phí giao hàng). Không có doanh thu hoặc đơn hàng giả.
- **Sản phẩm:** khởi tạo từ bốn sản phẩm trong `store.js`; tìm kiếm không dấu, lọc danh mục, thêm/sửa/xóa có xác nhận, cập nhật giá, tồn kho và trạng thái. Tồn kho ban đầu để trống vì chưa có dữ liệu thực tế. Ảnh chọn từ bốn ảnh có sẵn.
- **Đơn hàng:** tạo thủ công với nhiều dòng sản phẩm, gộp dòng trùng, lưu giá/tên/quy cách tại thời điểm tạo, xem chi tiết và đổi trạng thái. Không tự trừ tồn kho. Xóa hoặc đổi giá sản phẩm không làm thay đổi đơn cũ.
- **Yêu cầu từ khách:** hộp thư trên máy chủ, nhận cả yêu cầu đặt hàng, tư vấn và liên hệ; bắt buộc đăng nhập admin. Các yêu cầu này được quản lý riêng với đơn thủ công.
- **Khách hàng:** tổng hợp từ đơn hàng theo số điện thoại; giá trị đơn hoàn thành không bao gồm đơn hủy.
- **Nội dung:** danh sách bài viết hiện có và liên kết xem các trang khách hàng; chưa có trình chỉnh sửa nội dung.
- **Xuất dữ liệu:** tải tệp JSON chứa toàn bộ sản phẩm, đơn hàng và thông tin khách hàng đã nhập.

Dữ liệu sản phẩm và đơn thủ công vẫn lưu riêng trong `localStorage` với khóa `macca-toan-thang-admin-v1`, chưa cập nhật danh mục công khai. Toàn bộ giao diện admin dùng chung màn hình đăng nhập và phiên máy chủ. Hộp thư **Yêu cầu từ khách** dùng dữ liệu máy chủ; dữ liệu cục bộ vẫn thuộc trình duyệt hiện tại. Dữ liệu hỏng hoặc không lưu được sẽ báo lỗi; không tự ghi đè dữ liệu hỏng. Thay đổi cục bộ từ tab khác sẽ cập nhật danh sách và đóng biểu mẫu để tránh lưu đè.

Các tệp: `admin.html`, `admin.css`, `admin.js` (giao diện), `admin-data.js` (dữ liệu cục bộ), `admin-inbox.js` (hộp thư), `request-api.js` (gửi API), `server/server.cjs` (máy chủ). Chạy `node tests/admin.test.cjs` để kiểm tra CRUD cục bộ, đơn hàng, dữ liệu không hợp lệ, lỗi lưu trữ, xung đột tab và hiển thị an toàn.

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
- `lien-he.html`: biểu mẫu tên, email, điện thoại tùy chọn, chủ đề và lời nhắn. Có kiểm tra dữ liệu, gửi đến hộp thư admin, nhận mã yêu cầu và tải bản xác nhận TXT. `contact.js` xử lý biểu mẫu qua `request-api.js`.
- `content-pages.css`: giao diện hai trang. `story.js` cập nhật năm và giỏ hàng dùng chung.
- Hotline, email doanh nghiệp và địa chỉ chưa được cung cấp nên hiển thị đang cập nhật; không tạo số điện thoại hoặc vị trí giả.

Điều hướng Góc macca / Liên hệ trên toàn website đã trỏ đến các trang riêng. Thẻ bài viết ở trang chủ mở đường dẫn bài tương ứng. Đã chạy 17 kiểm tra logic và liên kết; chưa kiểm tra trực quan trên trình duyệt.

## Các trang mới

- `tu-van.html`: biểu mẫu tư vấn, chọn nhu cầu, số lượng và ngân sách; gửi đến hộp thư admin và tải bản xác nhận.
- `gio-hang.html`: danh sách sản phẩm, nhập hoặc tăng giảm số lượng, xóa, gợi ý thêm sản phẩm và tổng tiền.
- `thanh-toan.html`: thông tin nhận hàng, hai mức phí vận chuyển tham khảo, gửi yêu cầu COD tới admin, nhận mã yêu cầu và tải bản xác nhận.
- `store.js`: dữ liệu sản phẩm, đọc/ghi giỏ hàng có kiểm tra và hàm tính giá dùng chung.
- `commerce.js` / `commerce.css`: logic và giao diện cho các trang mới, giữ phong cách desktop của trang chủ.

Các nút Giỏ hàng và Tạo yêu cầu tư vấn trên trang chủ đã chuyển đến trang riêng. Giỏ đồng bộ qua localStorage. Yêu cầu đặt hàng giữ nguyên giỏ; nội dung đã gửi được lưu trên máy chủ để admin xử lý. Chuyển khoản/thẻ/ví điện tử chưa khả dụng và không thu thập thông tin thanh toán.

## Tính năng

- Trang chủ, câu chuyện thương hiệu, bộ sưu tập, quà tặng, bài viết, liên hệ.
- Lọc danh mục, tìm kiếm không dấu và sắp xếp giá.
- Hộp thoại xem chi tiết sản phẩm và bài viết.
- Giỏ hàng: thêm, xóa, tăng giảm số lượng, tính tạm tính, lưu trong localStorage khi trình duyệt cho phép.
- Khôi phục giỏ hàng có kiểm tra dữ liệu; giới hạn 99 sản phẩm mỗi loại; đồng bộ giữa các tab cùng origin.
- Biểu mẫu gửi thông tin đến hộp thư admin và cho phép tải bản xác nhận TXT. Không thu tiền và không lưu thông tin cá nhân của khách vào localStorage.
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

Cần bổ sung dữ liệu thật về sản phẩm, thành phần, xuất xứ, nhãn, tồn kho, thông tin pháp nhân, địa chỉ, hotline và chính sách đã được doanh nghiệp xác nhận. Kết nối API sản phẩm/đơn hàng, tính phí vận chuyển và cổng thanh toán nếu cần. Máy chủ phải kiểm tra lại giá và tồn kho; không tin dữ liệu từ trình duyệt. Luồng gửi yêu cầu hiện có xác nhận thành công/lỗi từ máy chủ; cần bổ sung quản lý tồn kho và quy trình giao hàng thực tế. Các yêu cầu triển khai kinh doanh cần được rà soát riêng trước khi công bố.

## Kiểm thử

- 13 kiểm tra HTTP: tiếp nhận cả ba loại yêu cầu, đăng nhập admin, chặn truy cập chưa xác thực, chống gửi trùng đồng thời, giá do máy chủ tính, trạng thái/xung đột cập nhật, đăng xuất, lưu dữ liệu sau khởi động lại và lỗi ghi tệp.
- 18 kiểm tra giao diện qua DOM giả lập: giỏ hàng, bộ lọc, biểu mẫu gửi thành công/thất bại, bản xác nhận hiển thị an toàn và liên kết/tệp nội bộ.
- 12 kiểm tra admin cục bộ: sản phẩm, đơn thủ công, khách hàng, lưu trữ và an toàn hiển thị.
- 1 kịch bản client: khôi phục mã thử lại sau lỗi mạng/tải lại, tạo mã mới cho yêu cầu mới hoặc đổi nội dung, không lưu thông tin liên hệ vào sessionStorage.

Các bài kiểm tra dùng dữ liệu tổng hợp trong thư mục tạm và xóa sau khi chạy; không gửi đến khách thật. Chưa kiểm tra trực quan trên trình duyệt. Kiểm tra thủ công khi chạy máy chủ: gửi từ Liên hệ/Tư vấn/Thanh toán → đăng nhập admin ở trình duyệt khác → mở Yêu cầu từ khách → xem nội dung → đổi trạng thái → tải lại kiểm tra.

## Nguồn ảnh

Tạo bằng công cụ imagegen tích hợp. Tệp: `assets/macca-hero.png`.

Prompt cuối:

> Use case: product-mockup. Create a premium editorial food photograph for a Vietnamese macadamia brand website hero. Landscape 3:2 composition. A shallow handmade brown ceramic bowl overflowing with cream-colored round macadamia kernels and a few rich brown macadamia shells, on warm ivory linen and pale beige stone table. Fresh glossy dark green macadamia leaves on a branch enter upper right, a few cracked shells and kernels scattered foreground. Warm afternoon natural side lighting, beautiful realistic textures, sophisticated organic food magazine photography, restrained colors, close up shot, shallow depth of field. No lettering, no logos, no other nuts, no packaging. Bowl center-right, full image filled with photography.


## Logo liên hệ và cỡ chữ

Bốn biểu tượng điện thoại, Zalo, Facebook và Gmail được cố định ở góc dưới bên phải trên cả 8 trang. Trên màn hình hẹp chúng xếp thành cụm 2×2. Nút chỉ hiển thị logo; nhãn truy cập và chú thích hover giúp nhận biết từng kênh. Các khối liên hệ lớn trước đây đã được bỏ.

Nhập thông tin công khai đã xác nhận trong `owner-contact.js` để kích hoạt URL `tel:`, `mailto:` và HTTPS đúng tên miền Zalo/Facebook. Khi dữ liệu còn trống, biểu tượng vẫn hiển thị nhưng không mở liên kết giả. Cỡ chữ nội dung và biểu mẫu đã được tăng lên khoảng 16–18px.

## Đăng nhập admin chung

`admin-auth.js` kiểm tra phiên trước khi mở giao diện quản trị. Phiên hợp lệ được khôi phục khi tải lại trang; đường dẫn mục đang mở được giữ nguyên. Đăng xuất nằm ở thanh trên cùng, đóng mọi biểu mẫu và khóa toàn bộ trang. Phiên hết hạn hoặc đăng xuất ở tab khác sẽ đưa về màn hình đăng nhập. Nếu máy chủ không kết nối được, giao diện quản trị vẫn đóng và hiển thị lỗi. Cần chạy máy chủ như hướng dẫn ở đầu tài liệu.

Chạy `node tests/admin-auth.test.cjs` để kiểm tra đăng nhập chung, giữ phiên, truy cập hộp thư, hết hạn và đăng xuất. Các danh mục/đơn thủ công vẫn là dữ liệu cục bộ; màn hình đăng nhập không biến localStorage thành kho dữ liệu được bảo vệ phía máy chủ.
