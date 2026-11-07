// Fictional notification samples. Nothing here was sent or received.
export type Notice = {
  id: string;
  title: string;
  body: string;
  about: string;
  received: string;
};

export const seedNotices: Notice[] = [
  {
    id: 'n1',
    title: 'Session #21 needs review',
    body: 'A captured session is waiting for a faculty decision. Nothing is committed until you review it.',
    about: 'CS-2026-A · MATH101',
    received: 'Today 09:05',
  },
  {
    id: 'n2',
    title: 'Consent missing for one student',
    body: 'One student in this class has no consent receipt on file, so their face reference is not used.',
    about: 'CS-2026-B · CS201',
    received: 'Today 08:40',
  },
  {
    id: 'n3',
    title: 'Dispute raised on session #19',
    body: 'A student contests the record for this session. Resolving it creates an audit entry.',
    about: 'CS-2026-A · MATH101',
    received: 'Yesterday',
  },
  {
    id: 'n4',
    title: 'Camera offline in Room 103',
    body: 'No camera is reporting from this room, so browser capture is the only option today.',
    about: 'Room 103 — Physics Lab',
    received: 'Yesterday',
  },
  {
    id: 'n5',
    title: 'Attendance statement ready',
    body: 'The sample statement for last term is available as a CSV download in the faculty workspace.',
    about: 'Term 2',
    received: 'Two days ago',
  },
  {
    id: 'n6',
    title: 'Face embeddings are not yet encrypted at rest',
    body: 'This is a standing disclosure, repeated here so it is never buried. Enrollment data is protected by access control only.',
    about: 'Security',
    received: 'Standing notice',
  },
];

export const notificationStoreKey = 'classsight_notices_read';
