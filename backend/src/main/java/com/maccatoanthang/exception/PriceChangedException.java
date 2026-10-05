package com.maccatoanthang.exception;

public class PriceChangedException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    private final long actualTotal;

    public PriceChangedException(long actualTotal) {
        super("Giá đơn hàng đã thay đổi. Vui lòng xác nhận lại tổng tiền.");
        this.actualTotal = actualTotal;
    }

    public long getActualTotal() {
        return actualTotal;
    }
}
