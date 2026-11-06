import type { PlanId } from './plans';

export type BuildStatus = 'built' | 'in_progress' | 'planned';
export type Feature = {
  id: string;
  name: string;
  description: string;
  defaultPlan: PlanId;
  buildStatus: BuildStatus;
  evidence?: string;
};

export const features: Feature[] = [
  ['FT01', 'Live camera attendance capture', 'Upload or capture a classroom photo.', 'essential', 'built', 'app/app/page.tsx'],
  ['FT02', 'Group-photo class enrolment', 'Enroll a class from a group photo.', 'essential', 'in_progress'],
  ['FT03', 'AUTO / REVIEW / UNKNOWN review', 'Review recognition decisions before finalizing.', 'essential', 'built', 'app/app/page.tsx'],
  ['FT04', 'Class, room and camera management', 'Keep teaching spaces organized.', 'essential', 'built', 'app/app/page.tsx'],
  ['FT05', 'Absent list and CSV export', 'Summarize and export each session.', 'essential', 'built', 'app/app/page.tsx'],
  ['FT06', 'Consent and deletion requests', 'Privacy tools for student records.', 'essential', 'in_progress'],
  ['FT07', 'Multi-shot capture', 'Capture multiple views per session.', 'pro', 'built', 'app/app/page.tsx'],
  ['FT08', 'Attendance analytics and alerts', 'See trends and low-attendance signals.', 'pro', 'built', 'app/app/analytics/page.tsx'],
  ['FT09', 'Email and SMS notifications', 'Notify stakeholders about attendance.', 'pro', 'planned'],
  ['FT10', 'Late and early-leaving detection', 'Track timing exceptions.', 'pro', 'planned'],
  ['FT11', 'Roles and permissions', 'Give each team member the right access.', 'pro', 'in_progress'],
  ['FT12', 'Review audit log', 'Trace every attendance review action.', 'pro', 'in_progress'],
  ['FT13', 'Retention controls', 'Configure data retention windows.', 'pro', 'planned'],
  ['FT14', 'ERP and LMS integration', 'Connect attendance to existing systems.', 'advanced', 'in_progress'],
  ['FT15', 'Multi-campus and SSO', 'Manage campuses from one account.', 'advanced', 'planned'],
  ['FT16', 'Private-cloud deployment', 'Run in a controlled environment.', 'advanced', 'built', 'docker-compose.yml'],
  ['FT17', 'Liveness and anti-spoof checks', 'Add stronger capture assurance.', 'advanced', 'in_progress'],
  ['FT18', 'Custom thresholds and reports', 'Tune decisions with evidence.', 'advanced', 'in_progress'],
  ['FT19', 'Student and parent portal', 'Share attendance with learners and families.', 'advanced', 'in_progress'],
  ['FT20', 'Priority support SLA', 'Get a dedicated support path.', 'advanced', 'planned'],
].map(([id, name, description, defaultPlan, buildStatus, evidence]) => ({
  id, name, description, defaultPlan: defaultPlan as PlanId, buildStatus: buildStatus as BuildStatus, evidence,
}));
