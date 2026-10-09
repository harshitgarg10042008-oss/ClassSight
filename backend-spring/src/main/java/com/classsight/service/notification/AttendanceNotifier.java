package com.classsight.service.notification;

import com.classsight.entity.ClassSession;
import com.classsight.entity.Student;
import com.classsight.entity.Subject;

public interface AttendanceNotifier {
    void notifyAbsence(Student student, ClassSession session);
    void notifyDefaulter(Student student, Subject subject, double attendancePercentage);
}
