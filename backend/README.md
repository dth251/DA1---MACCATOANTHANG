# Macca Toàn Thắng Backend

Java 21, Spring Boot 3.3.4, Gradle 8.9, PostgreSQL, Spring Security/JWT.
API đã triển khai: sản phẩm, bài viết, đăng ký/đăng nhập/refresh/logout,
đặt hàng COD, tư vấn/liên hệ, hồ sơ và lịch sử của người dùng, quản trị đơn/yêu cầu,
dashboard và export JSON.

## Chạy local

Tạo database PostgreSQL riêng cho ứng dụng, rồi cấu hình trong PowerShell:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'dev'
$env:DB_URL = 'jdbc:postgresql://127.0.0.1:5432/macca_toanthang'
$env:DB_USERNAME = 'postgres'
$env:DB_PASSWORD = 'your-database-password'
$env:ADMIN_USERNAME = 'admin'
$env:ADMIN_PASSWORD = 'your-unique-admin-password'
$env:JWT_SECRET = 'your-random-secret-at-least-32-bytes'
$env:PUBLIC_ORIGIN = 'http://127.0.0.1:3000'
.\gradlew.bat bootRun
```

Port mặc định 8080, đổi qua `PORT`. Ứng dụng không tự đọc file `.env`.
`PUBLIC_ORIGIN` nhận các origin chính xác, phân cách bằng dấu phẩy.
Không còn mật khẩu admin/JWT secret mặc định. ADMIN_PASSWORD phải có ít nhất
12 ký tự, tối đa 72 byte UTF-8; JWT_SECRET tối thiểu 32 byte. Giá trị mặc định
cũ bị từ chối. Không dùng giá trị minh họa ở trên cho production.

## Database và nâng cấp

Flyway quản lý schema; Hibernate dùng `validate` ở cả dev/prod.
V1 tạo schema gốc; V2 thêm snapshot liên hệ, version, cờ giữ tồn, phiên đăng nhập
và bảng chống gửi trùng. Database trống tự chạy V1 rồi V2.
Cơ chế tích hợp theo [tài liệu Spring Boot 3.3](https://docs.spring.io/spring-boot/3.3/how-to/data-initialization.html).

**Với database đã có dữ liệu:** sao lưu và thử khôi phục trên bản sao trước.
Dừng phiên bản ứng dụng cũ trong lúc nâng cấp. Đối chiếu schema hiện tại với
`src/main/resources/db/migration/V1__initial_schema.sql`. Nếu database là schema
trước bản sửa (bảng `users`, khóa `user_id`, chưa có các cột/bảng V2), cho phép
baseline V1 đúng một lần khi khởi động bản mới:

```powershell
$env:SPRING_FLYWAY_BASELINE_ON_MIGRATE = 'true'
$env:SPRING_FLYWAY_BASELINE_VERSION = '1'
.\gradlew.bat bootRun
# Sau lần nâng cấp thành công, bỏ hai biến baseline khỏi cấu hình chạy.
```

Không bật baseline tùy tiện trên schema chưa đối chiếu. Schema rất cũ còn
`customer/customer_id`, hoặc đã được sửa một phần bằng Hibernate `update`,
cần migration riêng sau khi kiểm tra thực tế; không được đánh dấu V1 để bỏ qua
khác biệt. Không chỉnh SQL migration đã được chạy trên môi trường khác.

V2 sao chép thông tin liên hệ hiện có sang từng đơn/yêu cầu và tách lịch sử guest
khỏi tài khoản. Không thể phục hồi địa chỉ lịch sử đã bị ghi đè trước bản sửa.
Đơn cũ không bị trừ tồn hồi tố; cờ giữ tồn chỉ bật cho đơn mới thực sự trừ hàng.
Khóa idempotency cũ được giữ chỗ: retry khóa cũ trả 409 thay vì tạo bản sao,
vì phiên bản cũ không lưu fingerprint để xác nhận payload.

Seed mặc định tạo 4 sản phẩm, 3 bài viết nếu từng bảng trống; đặt
`SEED_ENABLED=false` để tắt. Không seed khách hoặc đơn giả.

## Các thay đổi API cần đồng bộ frontend

- `POST /api/requests` bắt buộc có `idempotencyKey` do client tạo, tối đa 128 ký tự.
  Tạo một UUID cho mỗi lần gửi mới; giữ nguyên UUID và payload khi retry do lỗi mạng.
  Hai lần gửi đồng thời cùng nội dung/key trả cùng receipt; cùng key nhưng đổi nội dung
  trả 409. Key được phân phạm vi theo tài khoản, hoặc guest.
- Khi gửi `expectedTotal`, tổng không khớp sẽ trả 409 với
  `errors.code = "PRICE_CHANGED"` và `errors.actualTotal`. Hiển thị giá mới để
  khách xác nhận; không tự động retry với giá khác.
- Anonymous checkout lưu liên hệ trên đơn/yêu cầu, không sửa hoặc tự gắn vào tài khoản
  trùng số điện thoại. Đăng ký mới không nhận lịch sử guest. Guest từ database cũ
  chưa xác minh sẽ bị từ chối đăng ký cùng số điện thoại (409); chưa có tích hợp OTP
  hay quy trình tự động nhận lại lịch sử.
- Muốn đơn xuất hiện trong portal, gửi access token của người mua khi đặt đơn.
  Đơn admin nhập theo thông tin liên hệ chưa tự gắn tài khoản qua số điện thoại.
- Response vẫn dùng `user` cho liên hệ trong đơn/yêu cầu, nhưng các trường này là
  snapshot; `id` có thể không có đối với khách vãng lai.
- Sản phẩm `active=false` không hiển thị chi tiết public và không nhận đơn.
  Quản trị viên có endpoint riêng `GET /api/admin/products/{id}` để xem chi tiết sản phẩm
  kể cả khi đã ngừng bán. `stock=null` là không quản lý tồn; có số tồn thì đặt hàng trừ
  tồn trong transaction. Hủy đơn hoàn tồn đúng một lần. Không xóa/đổi chế độ tồn khi còn
  đơn đang giữ hàng.
- Hệ thống hỗ trợ tracing qua header `X-Request-Id` gắn vào MDC logger và trả về
  trong response header cho client đối soát vết giao dịch.
- Tự động dọn dẹp định kỳ (`HousekeepingScheduler` chạy lúc 03:00 AM): xóa các phiên
  đăng nhập đã hết hạn và khóa idempotency cũ hơn 7 ngày.
- Mã đơn/yêu cầu có phần UUID; frontend cần coi mã là chuỗi opaque, không kiểm tra
  định dạng bốn chữ số cũ.
- Cập nhật yêu cầu trả `revision` sau flush; dùng revision vừa nhận cho lần sau.
- Access/refresh token thuộc cùng phiên lưu trong database. Refresh token chỉ dùng
  một lần; frontend cần điều phối để chỉ có một refresh đang chạy. Dùng lại token
  đã xoay sẽ thu hồi cả phiên. Logout thu hồi cả access và refresh của phiên đó.
- Các JWT phát hành trước bản sửa không có session ID sẽ bị từ chối; người dùng
  phải đăng nhập lại. Thời hạn phiên tối đa bằng hạn refresh ban đầu, không kéo dài
  vô hạn qua refresh.
- Mật khẩu đăng ký/đăng nhập giới hạn 72 **byte UTF-8**. Tài khoản đã dùng mật khẩu
  vượt giới hạn trước đây cần quy trình đặt lại mật khẩu có xác minh; bản sửa không
  tự suy đoán hoặc thay mật khẩu.
- Login hỗ trợ username hoặc số điện thoại, không hỗ trợ email. Username mới không
  được có dạng số điện thoại để tránh trùng không gian định danh.

## Kiểm thử và đóng gói

```powershell
.\gradlew.bat test spotlessCheck bootJar
```

Test mặc định dùng H2 riêng, tắt Flyway và dùng `create-drop`.
Các ca PostgreSQL/migration chỉ bật khi có biến TEST_DB_DRIVER.
**Không trỏ TEST_DB_URL tới database có dữ liệu cần giữ.**

```powershell
$env:TEST_DB_URL = 'jdbc:postgresql://127.0.0.1:55441/macca_fixes_test'
$env:TEST_DB_USERNAME = 'macca_test'
$env:TEST_DB_PASSWORD = 'your-test-password'
$env:TEST_DB_DRIVER = 'org.postgresql.Driver'
$env:TEST_DB_DIALECT = 'org.hibernate.dialect.PostgreSQLDialect'
.\gradlew.bat test --rerun-tasks
```

`SecurityRegressionTest` kiểm tra quyền sở hữu, snapshot, trùng ID, logout,
refresh rotation, giới hạn password, tổng tiền, rollback tồn kho, idempotency và
các ca đồng thời. `MigrationIntegrationTest` kiểm tra tạo schema mới và baseline
schema cũ có dữ liệu. Xem kết quả ở `build/reports/tests/test/index.html`.
JAR đầu ra: `build/libs/macca-backend.jar`.

Kết quả kiểm chứng bản sửa ngày 02/10/2026:

- H2: 118 test đạt, 3 test PostgreSQL bị bỏ qua (tổng cộng 121 tests).
- PostgreSQL 18: 121/121 test đạt, gồm 19 regression test bảo mật, test migration, và test housekeeping.
- `spotlessCheck` và `bootJar` đạt.
- JAR chạy được với profile prod, Flyway và Hibernate validate; access/refresh đã
  logout đều trả 401 sau khi dừng và khởi động JVM mới với cùng database/secret.
- Chỉ sử dụng database thử nghiệm riêng; chưa nâng cấp database ứng dụng thực tế.

Flyway do Spring Boot 3.3.4 quản lý phát cảnh báo phiên bản PostgreSQL 18 mới hơn
mức hỗ trợ đã kiểm chứng của thư viện. Các ca trên đã đạt tại máy này; cần đồng bộ
phiên bản framework/Flyway với database khi chuẩn bị môi trường production.

## Docker / production

```powershell
docker build -t macca-backend .
docker run --rm -p 8080:8080 --env-file .env macca-backend
```

Docker mặc định profile prod, chạy với user không có quyền root. Cần cấu hình
DB_URL, DB_USERNAME, DB_PASSWORD, ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET,
PUBLIC_ORIGIN; DB_URL phải truy cập được từ container.
Không commit file chứa secret.

## Phạm vi còn lại

Bản sửa tập trung vào các lỗi trong BACKEND_REVIEW.md, migration và tính đúng đắn
khi xử lý đồng thời. Chưa triển khai OTP, quên mật khẩu, thanh toán trực tuyến,
upload ảnh, thông báo, rate limiting hay hệ thống giám sát/backup tự động.
Dashboard đã aggregate ở DB; export JSON toàn bộ vẫn chỉ phù hợp dữ liệu nhỏ,
cần streaming/batch trước khi dùng với dữ liệu lớn. Cần chính sách dọn phiên hết
hạn và thời gian lưu idempotency phù hợp trước khi vận hành dài hạn.
