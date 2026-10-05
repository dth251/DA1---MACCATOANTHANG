package com.maccatoanthang.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.convert.converter.ConverterFactory;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Locale;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverterFactory(new EnumConverterFactory());
    }

    private static class EnumConverterFactory implements ConverterFactory<String, Enum<?>> {

        @Override
        public <T extends Enum<?>> Converter<String, T> getConverter(Class<T> type) {
            return source -> {
                for (T value : type.getEnumConstants()) {
                    if (value.name().equals(source.toUpperCase(Locale.ROOT))) {
                        return value;
                    }
                }
                throw new IllegalArgumentException("Giá trị enum không hợp lệ: " + source);
            };
        }
    }
}
