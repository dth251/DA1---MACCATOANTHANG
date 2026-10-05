package com.maccatoanthang.dto.request;

import com.maccatoanthang.model.enums.ArticleCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleRequest {

    @Pattern(regexp = "^$|[a-z0-9-]{2,120}", message = "Đường dẫn bài viết (slug) chỉ gồm chữ thường, số và dấu gạch ngang (2-120 ký tự)")
    private String slug;

    @NotBlank(message = "Tiêu đề bài viết không được để trống")
    @Size(max = 255, message = "Tiêu đề bài viết không được vượt quá 255 ký tự")
    private String title;

    @NotBlank(message = "Nội dung bài viết không được để trống")
    private String body;

    @NotNull(message = "Danh mục bài viết không được để trống")
    private ArticleCategory category;

    @Size(max = 80, message = "Nhãn chuyên mục không được vượt quá 80 ký tự")
    private String label;

    @Size(max = 255, message = "Đường dẫn ảnh không được vượt quá 255 ký tự")
    private String image;

    @Size(max = 2000, message = "Mô tả ngắn không được vượt quá 2000 ký tự")
    private String description;

    private Integer sortOrder;

    private Boolean published;
}
