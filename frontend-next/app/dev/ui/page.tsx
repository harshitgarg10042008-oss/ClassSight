'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Switch,
  RadioGroup,
  PasswordInput,
  OtpInput,
  Tabs,
  Modal,
  Drawer,
  ToastContainer,
  ToastMessage,
  TierChip,
  Badge,
  Tooltip,
  Card,
  StatCard,
  DataTable,
  Stepper,
  Avatar,
  Skeleton,
  EmptyState,
  Banner,
  Breadcrumbs,
  Progress,
  ProgressRing,
  Accordion,
  CommandPalette,
  ThemeToggle,
  LanguageSwitch,
  FileDrop,
  StatusTag,
  PlanBadge,
  LockedFeature,
  DonutChart,
  BarChart,
  LineChart,
  Heatmap,
  SeatMap,
  Seat,
} from '@/components/ui';

export default function UiKitchenSink() {
  const [activeTab, setActiveTab] = useState('foundations');
  const [textVal, setTextVal] = useState('');
  const [passwordVal, setPasswordVal] = useState('Secret123!');
  const [otpVal, setOtpVal] = useState('123456');
  const [switchChecked, setSwitchChecked] = useState(true);
  const [radioVal, setRadioVal] = useState('opt1');
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([
    { id: '1', type: 'success', title: 'Session Finalized', message: 'CS-101 attendance committed to ERP.' },
  ]);
  const [currentStep, setCurrentStep] = useState(1);

  const demoSeats: Seat[] = [
    { id: 'A1', row: 1, col: 1, studentName: 'Aarav Patel', status: 'AUTO' },
    { id: 'A2', row: 1, col: 2, studentName: 'Priya Sharma', status: 'AUTO' },
    { id: 'A3', row: 1, col: 3, studentName: 'Rohan Gupta', status: 'REVIEW' },
    { id: 'A4', row: 1, col: 4, studentName: 'Ananya Roy', status: 'ABSENT' },
    { id: 'B1', row: 2, col: 1, studentName: 'Vikram Singh', status: 'AUTO' },
    { id: 'B2', row: 2, col: 2, studentName: 'Sneha Rao', status: 'UNKNOWN' },
    { id: 'B3', row: 2, col: 3, studentName: 'Karan Mehra', status: 'AUTO' },
    { id: 'B4', row: 2, col: 4, studentName: '', status: 'EMPTY' },
  ];

  const demoTableData = [
    { id: 1, roll: '2026-CS-01', name: 'Aarav Patel', confidence: 96.4, status: 'AUTO' },
    { id: 2, roll: '2026-CS-02', name: 'Priya Sharma', confidence: 94.2, status: 'AUTO' },
    { id: 3, roll: '2026-CS-03', name: 'Rohan Gupta', confidence: 82.5, status: 'REVIEW' },
    { id: 4, roll: '2026-CS-04', name: 'Ananya Roy', confidence: 0.0, status: 'ABSENT' },
    { id: 5, roll: '2026-CS-05', name: 'Sneha Rao', confidence: 54.1, status: 'UNKNOWN' },
  ];

  return (
    <main id="main-content" className="cs-app-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Header */}
      <div className="cs-page-header">
        <div>
          <span className="cs-eyebrow">Design System & Component Library</span>
          <h1 className="cs-page-title">UI Kitchen Sink</h1>
          <p className="cs-stat-hint">
            Every core design token, primitive control, interactive overlay, and chart state.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <LanguageSwitch />
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => setPaletteOpen(true)}>
            Command Palette (Ctrl+K)
          </Button>
        </div>
      </div>

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={[
          { id: 'c1', category: 'Pages', title: 'Faculty Workspace', href: '/app' },
          { id: 'c2', category: 'Pages', title: 'Student Portal', href: '/portal' },
          { id: 'c3', category: 'Pages', title: 'Pricing & Plans', href: '/pricing' },
          { id: 'c4', category: 'Actions', title: 'Toggle Theme', onSelect: () => {} },
        ]}
      />

      {/* Tabs */}
      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        variant="pills"
        tabs={[
          { id: 'foundations', label: 'Foundations & Buttons' },
          { id: 'forms', label: 'Inputs & Password' },
          { id: 'data', label: 'Data & Tables' },
          { id: 'visuals', label: 'Charts & Seating' },
          { id: 'overlays', label: 'Modals & Drawers' },
        ]}
      />

      <div style={{ marginTop: '28px' }}>
        {/* TAB 1: FOUNDATIONS & BUTTONS */}
        {activeTab === 'foundations' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Buttons & Actions</h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline Action</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="danger">Danger Action</Button>
                <Button variant="primary" loading>Loading...</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center' }}>
                <Button size="sm">Small (sm)</Button>
                <Button size="md">Medium (md)</Button>
                <Button size="lg">Large (lg)</Button>
              </div>
            </Card>

            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Status Chips & Tiers</h2>
              <p className="cs-stat-hint" style={{ marginBottom: '12px' }}>
                WCAG 2.1 AA compliant text contrast in both light and dark themes.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <TierChip status="AUTO" count={42} />
                <TierChip status="REVIEW" count={5} />
                <TierChip status="UNKNOWN" count={2} />
                <TierChip status="ABSENT" count={3} />
                <TierChip status="AUTO" interactive selected label="Interactive Chip" />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <Badge variant="brand">Brand Badge</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="purple">Advanced Tier</Badge>
                <Tooltip text="Hover tooltip description">
                  <Badge variant="neutral">Hover Me (Tooltip)</Badge>
                </Tooltip>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <StatusTag status="WIRED" />
                <StatusTag status="UI-PREVIEW" />
                <StatusTag status="COMING-SOON" />
                <PlanBadge plan="essential" />
                <PlanBadge plan="pro" />
                <PlanBadge plan="advanced" />
              </div>
            </Card>

            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Avatars & Stepper</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                <Avatar name="Aarav Patel" size="sm" />
                <Avatar name="Priya Sharma" size="md" />
                <Avatar name="Rohan Gupta" size="lg" />
                <Avatar name="Dr. Vikram Singh" size="xl" />
              </div>
              <Stepper
                currentStep={currentStep}
                onChange={setCurrentStep}
                steps={[
                  { id: '1', label: 'Enrol Roster', description: 'Consent checks' },
                  { id: '2', label: 'Capture Frame', description: 'Single or multi-shot' },
                  { id: '3', label: 'Faculty Review', description: 'Confirm AUTO/REVIEW' },
                  { id: '4', label: 'ERP Finalize', description: 'Export summary' },
                ]}
              />
            </Card>
          </div>
        )}

        {/* TAB 2: FORMS & INPUTS */}
        {activeTab === 'forms' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Accessible Text Controls</h2>
              <Input
                label="Full Student Name"
                placeholder="e.g. Aarav Patel"
                value={textVal}
                onChange={(e) => setTextVal(e.target.value)}
                hint="As registered in the university ERP"
                required
              />
              <Input
                label="Roll Number with Error"
                defaultValue="INVALID_ROLL"
                error="Roll number must match pattern YYYY-DEPT-NN"
              />
              <Select
                label="Class Section"
                defaultValue="cs101"
                options={[
                  { value: 'cs101', label: 'CS-101 (Computer Science, Year 1)' },
                  { value: 'ec201', label: 'EC-201 (Electronics, Year 2)' },
                  { value: 'me301', label: 'ME-301 (Mechanical, Year 3)' },
                ]}
              />
              <Textarea
                label="Faculty Notes / Dispute Resolution Reason"
                placeholder="Provide mandatory reason code and context..."
              />
            </Card>

            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Password & Verification</h2>
              <PasswordInput
                id="kitchen-pw"
                label="Password (with Show/Hide Eye)"
                value={passwordVal}
                onChange={setPasswordVal}
                showStrength
                hint="Includes caps-lock detector, heuristic strength meter, and keyboard toggle."
              />
              <div style={{ marginTop: '20px' }}>
                <span className="cs-label" style={{ display: 'block', marginBottom: '8px' }}>
                  Two-Factor Verification Code (OTP)
                </span>
                <OtpInput value={otpVal} onChange={setOtpVal} />
              </div>
              <div style={{ marginTop: '20px' }}>
                <Checkbox label="Remember username on this browser (try/catch localStorage only)" />
                <div style={{ marginTop: '12px' }}>
                  <Switch
                    label="Automated Defaulter Alert"
                    description="Notify student when attendance falls below 75%"
                    checked={switchChecked}
                    onChange={(e) => setSwitchChecked(e.target.checked)}
                  />
                </div>
              </div>
            </Card>

            <Card style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>File Drop & Radio Groups</h2>
              <RadioGroup
                name="session_mode"
                value={radioVal}
                onChange={setRadioVal}
                label="Attendance Session Mode"
                options={[
                  { value: 'opt1', label: 'Single Camera Capture', description: 'Standard classroom wide-angle photograph.' },
                  { value: 'opt2', label: 'Multi-shot Accumulator', description: 'Composite burst capture over 3 frames (Pro Plan).' },
                  { value: 'opt3', label: 'Manual Roll-Call Fallback', description: 'Hardware-independent roll call with same review screen.' },
                ]}
              />
              <div style={{ marginTop: '16px' }}>
                <FileDrop onFilesSelected={(files) => alert(`Selected ${files.length} file(s)`)} />
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: DATA & TABLES */}
        {activeTab === 'data' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <StatCard
                title="Class Attendance"
                value="91.4%"
                delta={{ value: "+2.1% this week", positive: true }}
                sparklineData={[84, 86, 85, 88, 90, 89, 91.4]}
                hint="CS-101 Semester Average"
              />
              <StatCard
                title="Auto-Accepted Matches"
                value="42"
                delta={{ value: "93.3% recognition", positive: true }}
                sparklineData={[38, 40, 39, 41, 42]}
                hint="Threshold T_auto <= 7.75"
              />
              <StatCard
                title="Pending Faculty Reviews"
                value="3"
                delta={{ value: "-2 from yesterday", neutral: true }}
                sparklineData={[8, 6, 5, 4, 3]}
                hint="Requires human confirmation"
              />
              <StatCard
                title="Students at Risk (<75%)"
                value="2"
                delta={{ value: "+1 new risk", positive: false }}
                sparklineData={[0, 1, 1, 1, 2]}
                hint="Attendance threshold warning"
              />
            </div>

            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Interactive DataTable</h2>
              <DataTable
                keyField="id"
                data={demoTableData}
                selectable
                columns={[
                  { key: 'roll', header: 'Roll Number', sortable: true },
                  { key: 'name', header: 'Student Name', sortable: true },
                  {
                    key: 'confidence',
                    header: 'Confidence Score',
                    sortable: true,
                    render: (row) => (
                      <span className="tabular-nums">
                        {row.confidence > 0 ? `${row.confidence.toFixed(1)}%` : '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Recognition Tier',
                    render: (row) => <TierChip status={row.status} size="sm" />,
                  },
                ]}
              />
            </Card>

            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Loading Skeletons & Empty States</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Shimmer Skeleton Placeholders</h3>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="90%" />
                  <Skeleton variant="card" height={80} />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Empty State Container</h3>
                  <EmptyState
                    title="No sessions captured yet"
                    description="Select a class section and point the camera to take today's first roll."
                    action={<Button size="sm">Start First Capture</Button>}
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: VISUALS & CHARTS */}
        {activeTab === 'visuals' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Recognition Tier Split (Donut)</h2>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                <DonutChart
                  centerLabel="Total Roster"
                  centerValue={48}
                  segments={[
                    { label: 'AUTO', value: 42, color: 'var(--tier-auto)' },
                    { label: 'REVIEW', value: 3, color: 'var(--tier-review)' },
                    { label: 'UNKNOWN', value: 1, color: 'var(--tier-unknown)' },
                    { label: 'ABSENT', value: 2, color: 'var(--tier-absent)' },
                  ]}
                />
              </div>
            </Card>

            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Weekly Attendance Trend (Line)</h2>
              <LineChart
                points={[
                  { label: 'Mon', value: 88 },
                  { label: 'Tue', value: 92 },
                  { label: 'Wed', value: 85 },
                  { label: 'Thu', value: 94 },
                  { label: 'Fri', value: 91 },
                ]}
              />
            </Card>

            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Section Comparison (Bar)</h2>
              <BarChart
                data={[
                  { label: 'CS-A', value: 45, secondaryValue: 3 },
                  { label: 'CS-B', value: 42, secondaryValue: 5 },
                  { label: 'IT-A', value: 48, secondaryValue: 1 },
                  { label: 'EC-A', value: 39, secondaryValue: 7 },
                ]}
              />
            </Card>

            <Card style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Classroom Seating Map (D05)</h2>
              <SeatMap seats={demoSeats} cols={4} rows={2} onSeatClick={(s) => alert(`Seat ${s.id}: ${s.studentName || 'Empty'} (${s.status})`)} />
            </Card>

            <Card style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Attendance Heatmap Matrix</h2>
              <Heatmap
                data={[
                  { day: 'Mon', periods: [95, 92, 88, 72, 80] },
                  { day: 'Tue', periods: [90, 89, 94, 91, 85] },
                  { day: 'Wed', periods: [85, 78, 80, 65, 70] },
                  { day: 'Thu', periods: [94, 92, 90, 88, 92] },
                  { day: 'Fri', periods: [82, 80, 75, 58, 62] },
                ]}
              />
            </Card>
          </div>
        )}

        {/* TAB 5: OVERLAYS & UPGRADES */}
        {activeTab === 'overlays' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Modals, Drawers & Disclosures</h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button variant="primary" onClick={() => setModalOpen(true)}>Open Modal Dialog</Button>
                <Button variant="outline" onClick={() => setDrawerOpen(true)}>Open Side Drawer</Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setToasts((prev) => [
                      ...prev,
                      { id: String(Date.now()), type: 'info', title: 'New Notification', message: 'Dispute submitted by CS-101 student.' },
                    ])
                  }
                >
                  Trigger Toast Alert
                </Button>
              </div>

              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Accordion FAQ Component</h3>
                <Accordion
                  items={[
                    {
                      id: 'faq1',
                      title: 'How does the faculty review step ensure accountability?',
                      content: 'Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action. The teacher verifies any ambiguous or low-confidence matches before data reaches the ERP.',
                    },
                    {
                      id: 'faq2',
                      title: 'Are biometric templates encrypted at rest?',
                      content: 'Face embeddings are not yet encrypted at rest. The platform is designed to support consent workflows; legal text needs lawyer review.',
                    },
                  ]}
                />
              </div>
            </Card>

            <Card>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Locked Feature Card (Gated Capability)</h2>
              <LockedFeature
                plan="pro"
                featureName="Multi-shot Burst Capture (D03 / FT07)"
                description="Merge 3 sequential frames to reduce occlusion and eliminate uncertain matches before final review."
              />
            </Card>
          </div>
        )}
      </div>

      {/* Modal Demo */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm Session Finalization"
        description="Review all AUTO, REVIEW, and UNKNOWN matches before committing to the institutional record."
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setModalOpen(false); alert('Committed!'); }}>
              Commit to ERP
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Once finalized, attendance records are locked and transmitted to the ERP adapter.
          Subsequent modifications require a recorded justification reason code.
        </p>
      </Modal>

      {/* Drawer Demo */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Faculty Review Details"
        footer={<Button variant="outline" onClick={() => setDrawerOpen(false)}>Close Drawer</Button>}
      >
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Detailed diagnostics for selected face detection bounding box, image quality score, and historical presence frequency.
        </p>
      </Drawer>
    </main>
  );
}
