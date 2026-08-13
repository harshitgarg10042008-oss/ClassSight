package com.classsight.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class ErpSessionRequest {
    @NotEmpty
    private List<Long> sessionIds;

    public List<Long> getSessionIds() { return sessionIds; }
    public void setSessionIds(List<Long> sessionIds) { this.sessionIds = sessionIds; }
}
