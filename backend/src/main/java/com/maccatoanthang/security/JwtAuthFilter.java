package com.maccatoanthang.security;

import com.maccatoanthang.exception.UnauthorizedException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    private final JwtAuthEntryPoint entryPoint;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "/api/auth/login".equals(path) || "/api/auth/register".equals(path) || "/api/auth/refresh".equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String token = parseJwt(request);

        if (token != null) {
            try {
                Claims claims = jwtUtil.validateAccessToken(token);
                String role = claims.get("role", String.class);
                Object principal;

                if ("USER".equals(role) || "CUSTOMER".equals(role)) {
                    Long userId = claims.get("userId", Long.class);
                    if (userId == null) {
                        userId = claims.get("customerId", Long.class);
                    }
                    if (userId == null || userId <= 0) {
                        throw new BadCredentialsException("Thông tin người dùng trong token không hợp lệ");
                    }
                    principal = new UserPrincipal(userId, claims.getSubject());
                    role = "USER";
                } else if ("ADMIN".equals(role)) {
                    principal = claims.getSubject();
                } else {
                    throw new BadCredentialsException("Quyền hạn trong token không hợp lệ");
                }

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                );

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (JwtException | IllegalArgumentException | UnauthorizedException | BadCredentialsException ex) {
                log.warn("Xác thực JWT thất bại cho request [{}]: {}", request.getRequestURI(), ex.getMessage());
                request.setAttribute("jwt_error", ex.getMessage());
                SecurityContextHolder.clearContext();
                entryPoint.commence(request, response, new BadCredentialsException(ex.getMessage(), ex));
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }
        return null;
    }
}
