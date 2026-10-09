package com.classsight.service.notification;

import com.classsight.entity.AttendanceRecord;
import com.classsight.entity.ClassSession;
import com.classsight.entity.Student;
import com.classsight.entity.Subject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final List<AttendanceNotifier> notifiers;
    private final boolean enabled;

    public NotificationService(
            List<AttendanceNotifier> notifiers,
            @Value("${classsight.notifications.enabled:false}") boolean enabled) {
        this.notifiers = notifiers != null ? notifiers : List.of();
        this.enabled = enabled;
    }

    public void dispatchAbsenceAlerts(List<AttendanceRecord> records, ClassSession session) {
        if (!enabled || notifiers.isEmpty()) return;
        for (AttendanceRecord record : records) {
            if (record.getStatus() == AttendanceRecord.AttendanceStatus.ABSENT && record.getStudent() != null) {
                for (AttendanceNotifier notifier : notifiers) {
                    try {
                        notifier.notifyAbsence(record.getStudent(), session);
                    } catch (Exception e) {
                        log.error("Failed to notify absence: {}", e.getMessage());
                    }
                }
            }
        }
    }

    public void dispatchDefaulterAlert(Student student, Subject subject, double percentage) {
        if (!enabled || notifiers.isEmpty()) return;
        for (AttendanceNotifier notifier : notifiers) {
            try {
                notifier.notifyDefaulter(student, subject, percentage);
            } catch (Exception e) {
                log.error("Failed to notify defaulter: {}", e.getMessage());
            }
        }
    }

    public boolean isEnabled() {
        return enabled;
    }
}
