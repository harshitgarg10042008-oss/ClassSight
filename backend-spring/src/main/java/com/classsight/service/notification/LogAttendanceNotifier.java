package com.classsight.service.notification;

import com.classsight.entity.ClassSession;
import com.classsight.entity.Student;
import com.classsight.entity.Subject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LogAttendanceNotifier implements AttendanceNotifier {

    private static final Logger log = LoggerFactory.getLogger(LogAttendanceNotifier.class);

    @Override
    public void notifyAbsence(Student student, ClassSession session) {
        String subCode = (session != null && session.getSubject() != null) ? session.getSubject().getCode() : "N/A";
        String date = (session != null && session.getDate() != null) ? session.getDate().toString() : "today";
        log.warn("[ALERT: ABSENCE] Student {} ({}) marked ABSENT for {} on {}",
                student.getFirstName() + " " + student.getLastName(),
                student.getRollNumber(),
                subCode,
                date);
    }

    @Override
    public void notifyDefaulter(Student student, Subject subject, double attendancePercentage) {
        String subCode = (subject != null) ? subject.getCode() : "N/A";
        log.warn("[ALERT: DEFAULTER] Student {} ({}) attendance in {} is {:.1f}% (below 75% threshold)",
                student.getFirstName() + " " + student.getLastName(),
                student.getRollNumber(),
                subCode,
                attendancePercentage);
    }
}
