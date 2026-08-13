package com.classsight.controller;

import com.classsight.entity.User;
import com.classsight.repository.UserRepository;
import com.classsight.service.AttendanceReviewService;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;
import java.util.Optional;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AttendanceReviewControllerTest {

    @Test
    void differentTeacherGetsExplicit403FromReviewEndpoint() throws Exception {
        AttendanceReviewService reviewService = mock(AttendanceReviewService.class);
        UserRepository userRepository = mock(UserRepository.class);
        User otherTeacher = new User();
        otherTeacher.setId(2L);
        otherTeacher.setUsername("other-teacher");
        otherTeacher.setRole(User.Role.TEACHER);
        when(userRepository.findByUsername("other-teacher")).thenReturn(Optional.of(otherTeacher));
        when(reviewService.getReview(eq(44L), eq(otherTeacher)))
                .thenThrow(new org.springframework.security.access.AccessDeniedException("You do not own this attendance session"));

        AttendanceReviewController controller = new AttendanceReviewController(reviewService, userRepository);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ReviewExceptionHandler())
                .build();

        mockMvc.perform(get("/api/attendance-sessions/44/review")
                        .principal(() -> "other-teacher")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andDo(result -> System.out.println("ACTUAL_REVIEW_NEGATIVE_STATUS=" + result.getResponse().getStatus() + " BODY=" + result.getResponse().getContentAsString()))
                .andExpect(jsonPath("$.error", is("FORBIDDEN")));
    }

    @Test
    void nullExceptionMessageDoesNotCauseSecondaryNpe() throws Exception {
        AttendanceReviewService reviewService = mock(AttendanceReviewService.class);
        UserRepository userRepository = mock(UserRepository.class);
        User owner = new User();
        owner.setId(1L);
        owner.setUsername("owner");
        owner.setRole(User.Role.TEACHER);
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(owner));
        when(reviewService.getReview(eq(44L), eq(owner))).thenThrow(new IllegalArgumentException());

        AttendanceReviewController controller = new AttendanceReviewController(reviewService, userRepository);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ReviewExceptionHandler())
                .build();

        mockMvc.perform(get("/api/attendance-sessions/44/review")
                        .principal(() -> "owner")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("BAD_REQUEST")))
                .andExpect(jsonPath("$.message", is("IllegalArgumentException")));
    }

    @Test
    void ownerCanRenderCapturedPhoto() throws Exception {
        AttendanceReviewService reviewService = mock(AttendanceReviewService.class);
        UserRepository userRepository = mock(UserRepository.class);
        User owner = new User();
        owner.setId(1L);
        owner.setUsername("owner");
        owner.setRole(User.Role.TEACHER);
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(owner));
        when(reviewService.getPhoto(44L, owner)).thenReturn(new AttendanceReviewService.PhotoFile(
                new ByteArrayResource("image-bytes".getBytes()), MediaType.IMAGE_JPEG));

        AttendanceReviewController controller = new AttendanceReviewController(reviewService, userRepository);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ReviewExceptionHandler())
                .build();

        mockMvc.perform(get("/api/attendance-sessions/44/review/photo")
                        .principal(() -> "owner"))
                .andExpect(status().isOk())
                .andDo(result -> System.out.println("ACTUAL_REVIEW_PHOTO_STATUS=" + result.getResponse().getStatus() + " CONTENT_TYPE=" + result.getResponse().getContentType() + " BYTES=" + result.getResponse().getContentAsByteArray().length))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().contentType(MediaType.IMAGE_JPEG))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().bytes("image-bytes".getBytes()));
    }

    @Test
    void ownerCanLoadReviewPayload() throws Exception {
        AttendanceReviewService reviewService = mock(AttendanceReviewService.class);
        UserRepository userRepository = mock(UserRepository.class);
        User owner = new User();
        owner.setId(1L);
        owner.setUsername("owner");
        owner.setRole(User.Role.TEACHER);
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(owner));
        when(reviewService.getReview(44L, owner)).thenReturn(Map.of(
                "sessionId", 44L,
                "status", "REVIEW_REQUIRED",
                "photoUrl", "/api/attendance-sessions/44/review/photo",
                "records", java.util.List.of()));

        AttendanceReviewController controller = new AttendanceReviewController(reviewService, userRepository);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ReviewExceptionHandler())
                .build();

        mockMvc.perform(get("/api/attendance-sessions/44/review")
                        .principal(() -> "owner")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andDo(result -> System.out.println("ACTUAL_REVIEW_OWNER_STATUS=" + result.getResponse().getStatus() + " BODY=" + result.getResponse().getContentAsString()))
                .andExpect(jsonPath("$.status", is("REVIEW_REQUIRED")))
                .andExpect(jsonPath("$.photoUrl", is("/api/attendance-sessions/44/review/photo")));
    }
}
