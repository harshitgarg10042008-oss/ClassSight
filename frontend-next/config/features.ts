import type { PlanId } from '@/lib/plans';

export type FeatureStatus = 'WIRED' | 'UI-PREVIEW' | 'COMING-SOON';
export type FeatureEntry = { id: string; name: string; plan: PlanId; status: FeatureStatus; module: string; route: string };

const ft: Array<[string, string, PlanId, string, string]> = [
  ['FT01', 'Live camera capture', 'essential', 'Attendance', '/app'],
  ['FT02', 'Group-photo enrolment', 'essential', 'Enrollment', '/app/enrollment'],
  ['FT03', 'Faculty review', 'essential', 'Attendance', '/app'],
  ['FT04', 'Class, room and camera management', 'essential', 'Administration', '/app'],
  ['FT05', 'Absent list and CSV export', 'essential', 'Reports', '/app'],
  ['FT06', 'Consent and deletion', 'essential', 'Privacy', '/privacy'],
  ['FT07', 'Multi-shot capture', 'pro', 'Attendance', '/app'],
  ['FT08', 'Analytics and alerts', 'pro', 'Analytics', '/app/analytics'],
  ['FT09', 'Email and SMS', 'pro', 'Notifications', '/notifications'],
  ['FT10', 'Late and early leaving', 'pro', 'Attendance', '/app/late'],
  ['FT11', 'Roles and permissions', 'pro', 'Administration', '/admin/roles'],
  ['FT12', 'Audit log', 'pro', 'Administration', '/admin/audit'],
  ['FT13', 'Retention controls', 'pro', 'Privacy', '/admin/retention'],
  ['FT14', 'ERP and LMS integrations', 'advanced', 'Integrations', '/integrations'],
  ['FT15', 'Multi-campus and SSO', 'advanced', 'Administration', '/admin/campuses'],
  ['FT16', 'Private-cloud deployment', 'advanced', 'Platform', '/owner/health'],
  ['FT17', 'Liveness checks', 'advanced', 'Capture', '/app/capture'],
  ['FT18', 'Custom thresholds and reports', 'advanced', 'Reports', '/app/reports'],
  ['FT19', 'Student and parent portal', 'advanced', 'Portal', '/portal'],
  ['FT20', 'Priority support', 'advanced', 'Support', '/contact'],
];

const d: Array<[string, string, PlanId, string, string, FeatureStatus]> = [
  ['D01', 'Explain this match', 'essential', 'Review', '/app/review', 'UI-PREVIEW'],
  ['D02', 'Capture Coach', 'essential', 'Capture', '/app/capture', 'UI-PREVIEW'],
  ['D03', 'Retake uncertain students', 'pro', 'Capture', '/app/retake', 'UI-PREVIEW'],
  ['D04', 'Keyboard speed review', 'essential', 'Review', '/app/review', 'UI-PREVIEW'],
  ['D05', 'Seat map', 'pro', 'Attendance', '/app/seat-map', 'UI-PREVIEW'],
  ['D06', 'Manual roll-call fallback', 'essential', 'Review', '/app/roll-call', 'UI-PREVIEW'],
  ['D07', 'Phone camera QR pairing', 'pro', 'Capture', '/app/camera-pairing', 'COMING-SOON'],
  ['D08', 'Camera health monitor', 'pro', 'Cameras', '/app/cameras', 'UI-PREVIEW'],
  ['D09', 'Eligibility calculator', 'advanced', 'Portal', '/portal/eligibility', 'UI-PREVIEW'],
  ['D10', 'Risk radar', 'pro', 'Analytics', '/app/risk', 'UI-PREVIEW'],
  ['D11', 'Pattern insights', 'pro', 'Analytics', '/app/insights', 'UI-PREVIEW'],
  ['D12', 'Late and early timeline', 'pro', 'Attendance', '/app/late', 'UI-PREVIEW'],
  ['D13', 'Class health score', 'pro', 'Analytics', '/app/class-health', 'UI-PREVIEW'],
  ['D14', 'Message templates', 'pro', 'Notifications', '/admin/templates', 'UI-PREVIEW'],
  ['D15', 'Leave and condonation', 'advanced', 'Portal', '/portal/leave', 'UI-PREVIEW'],
  ['D16', 'I was present dispute', 'advanced', 'Portal', '/portal/disputes', 'UI-PREVIEW'],
  ['D17', 'Timetable handoff', 'pro', 'Attendance', '/app/timetable', 'UI-PREVIEW'],
  ['D18', 'Bulk correction', 'pro', 'Review', '/app/corrections', 'UI-PREVIEW'],
  ['D19', 'Consent ledger', 'essential', 'Privacy', '/admin/consent', 'UI-PREVIEW'],
  ['D20', 'Privacy receipt', 'essential', 'Privacy', '/portal/privacy', 'UI-PREVIEW'],
  ['D21', 'Evidence-based accuracy', 'advanced', 'Reports', '/admin/accuracy', 'UI-PREVIEW'],
  ['D22', 'Trust and retention centre', 'essential', 'Trust', '/trust', 'UI-PREVIEW'],
  ['D23', 'Command palette', 'essential', 'Navigation', '/app', 'UI-PREVIEW'],
  ['D24', 'Onboarding and sample class', 'essential', 'Onboarding', '/onboarding', 'UI-PREVIEW'],
];

export const featureRegistry: FeatureEntry[] = [
  ...ft.map(([id, name, plan, module, route]) => ({ id, name, plan, module, route, status: (['FT01', 'FT02', 'FT03', 'FT04', 'FT05', 'FT07', 'FT08', 'FT16'].includes(id) ? 'WIRED' : 'UI-PREVIEW') as FeatureStatus })),
  ...d.map(([id, name, plan, module, route, status]) => ({ id, name, plan, module, route, status })),
];
