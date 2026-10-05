package com.maccatoanthang.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PageData<T> {

    private List<T> items;

    private PaginationMeta pagination;

    public static <T> PageData<T> from(Page<T> page) {
        return new PageData<>(
                page.getContent(),
                PaginationMeta.builder()
                        .currentPage(page.getNumber() + 1)
                        .pageSize(page.getSize())
                        .totalPages(page.getTotalPages())
                        .totalItems(page.getTotalElements())
                        .build()
        );
    }
}
