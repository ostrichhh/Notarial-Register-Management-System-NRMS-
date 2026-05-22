export const intakeRows = [];

export const draftRows = [];

export const workflowSteps = ['Client Intake', 'Queue Management', 'Draft Entry', 'Finalization'];

export const roleMatrix = {
  ADMIN: {
    label: 'Admin',
    summary: 'Full workflow control with status override, archive, and restore authority.',
    permissions: [
      'Full access to intake, queue, draft, and finalization',
      'Can complete queue items and restore archived records',
      'Can archive and restore workflow records',
    ],
  },
  ATTORNEY: {
    label: 'Attorney',
    summary: 'Review and approval role for legally complete records.',
    permissions: [
      'Can review requests and finalize draft entries',
      'Can view intake, draft records, and queue',
      'Cannot manage system settings',
    ],
  },
  SECRETARY: {
    label: 'Secretary',
    summary: 'Operational encoding role for front-desk intake and draft preparation.',
    permissions: [
      'Can create client intake records',
      'Can encode and update draft entries',
      'Cannot finalize entries',
    ],
  },
};
