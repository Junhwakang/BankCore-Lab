package com.bankcorelab.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SecurityConfigTest.ProbeController.class)
@Import({SecurityConfig.class, SecurityConfigTest.ProbeController.class})
class SecurityConfigTest {
    @Autowired MockMvc mvc;

    @Test
    void healthIsAvailableWithoutLogin() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void businessRoutesAreClosedUntilExplicitlyConfigured() throws Exception {
        mvc.perform(get("/api/v1/accounts")).andExpect(status().isForbidden());
    }

    @RestController
    static class ProbeController {
        @GetMapping("/actuator/health") String health() { return "UP"; }
        @GetMapping("/api/v1/accounts") String accounts() { return "must not be public"; }
    }
}
