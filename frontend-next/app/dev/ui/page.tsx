'use client';
import { Card } from '@/components/ui/Card';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { SampleBanner } from '@/components/ui/SampleBanner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
export default function UiKitchenSink() { return <main className="marketing-main"><h1>UI kitchen sink</h1><p>Development-only component states.</p><ThemeToggle /><SampleBanner /><div className="step-grid"><Card><h2>Buttons</h2><button className="button button-primary">Primary action</button> <button className="button button-outline">Secondary</button></Card><Card><h2>Inputs</h2><PasswordInput id="kitchen-password" value="" onChange={() => {}} /></Card><Card><h2>States</h2><p className="form-error">Error state</p><p className="badge">Preview</p></Card></div></main>; }
