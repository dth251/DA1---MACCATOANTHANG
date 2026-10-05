package com.maccatoanthang.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExportResponse {

    private List<ProductResponse> products;

    private List<ArticleResponse> articles;

    private List<UserResponse> users;

    private List<OrderResponse> orders;

    private List<RequestResponse> requests;

    public List<ProductResponse> products() {
        return this.products;
    }

    public List<ArticleResponse> articles() {
        return this.articles;
    }

    public List<UserResponse> users() {
        return this.users;
    }

    public List<UserResponse> customers() {
        return this.users;
    }

    public List<OrderResponse> orders() {
        return this.orders;
    }

    public List<RequestResponse> requests() {
        return this.requests;
    }
}
