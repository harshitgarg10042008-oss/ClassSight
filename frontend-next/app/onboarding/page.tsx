'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StaticPage } from '@/components/StaticPage';

const steps = ['Institution', 'Teaching spaces', 'Roster', 'Ready'];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  return <StaticPage title="Set up your first class" eyebrow="Onboarding"><div className="stepper">{steps.map((label, index) => <span className={index <= step ? 'stepper-active' : ''} key={label}>{index + 1}. {label}</span>)}</div><section className="section-card onboarding-card"><h2>{steps[step]}</h2><p>{['Tell us the institution name and timezone.', 'Add a room and confirm camera access.', 'Import or create a roster with consent.', 'Your workspace is ready for a first capture.'][step]}</p><label htmlFor="onboarding-value">{step === 2 ? 'Roster source' : 'Details'}</label><input id="onboarding-value" placeholder={step === 2 ? 'CSV upload or manual roster' : 'Enter a value'} /><div className="hero-actions">{step > 0 && <button className="button button-outline" onClick={() => setStep(step - 1)}>Back</button>}{step < steps.length - 1 ? <button className="button button-primary" onClick={() => setStep(step + 1)}>Continue</button> : <Link className="button button-primary" href="/app">Open workspace</Link>}</div></section></StaticPage>;
}
