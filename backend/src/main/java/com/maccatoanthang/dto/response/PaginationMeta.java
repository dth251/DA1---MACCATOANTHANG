package com.maccatoanthang.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PaginationMeta {

    private int currentPage;

    private int pageSize;

    private int totalPages;

    private long totalItems;
}
