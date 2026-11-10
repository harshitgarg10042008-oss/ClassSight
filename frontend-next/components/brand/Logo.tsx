'use client';

/**
 * ClassSight Logo Component
 *
 * Brand colours:
 *   ink         #0A1020
 *   lagoon-400  #2DD4BF  (dark-theme ring)
 *   lagoon-600  #0B7F7B  (light-theme ring)
 *   coral       #FF6B4A  (dot on dark)
 *   coral-dark  #C94A2A  (dot on light — passes 3:1 on paper #FBFAF7)
 *   paper       #FBFAF7
 *   white       #FFFFFF
 *
 * Variants:
 *   mark    — SVG mark only (viewBox 0 0 100 100)
 *   lockup  — mark + wordmark side by side
 *   icon    — mark on a rounded-square tile (viewBox 0 0 100 100)
 *
 * Tone:
 *   auto    — follows CSS class `.dark` on <html> via CSS variables --logo-ring / --logo-dot
 *   onDark  — lagoon-400 ring, coral #FF6B4A dot
 *   onLight — lagoon-600 ring, coral-dark #C94A2A dot
 *   mono    — currentColor for everything
 */

import React from 'react';

export interface LogoProps {
  /** Visual variant */
  variant?: 'mark' | 'lockup' | 'icon';
  /** Colour tone */
  tone?: 'auto' | 'onDark' | 'onLight' | 'mono';
  /** Size in px (mark/icon: square side; lockup: height) */
  size?: number;
  /** Extra CSS class(es) */
  className?: string;
  /** Accessible label (overrides default "ClassSight") */
  title?: string;
  /**
   * When true the element is purely decorative and aria-hidden.
   * Use when a visible text label is adjacent.
   */
  decorative?: boolean;
  /** Whether the loading spinner animation should play (mark only) */
  loading?: boolean;
}

// ── Colour resolvers ──────────────────────────────────────────────────────────

function ringColor(tone: LogoProps['tone']): string {
  if (tone === 'onDark') return '#2DD4BF';
  if (tone === 'onLight') return '#0B7F7B';
  if (tone === 'mono') return 'currentColor';
  // auto — use CSS variable; fallback to lagoon-400
  return 'var(--logo-ring, #2DD4BF)';
}

function dotColor(tone: LogoProps['tone']): string {
  if (tone === 'onDark') return '#FF6B4A';
  if (tone === 'onLight') return '#C94A2A';
  if (tone === 'mono') return 'currentColor';
  // auto
  return 'var(--logo-dot, #FF6B4A)';
}

function tileColor(tone: LogoProps['tone']): string {
  if (tone === 'onLight') return '#0B7F7B';
  return '#0A1020'; // ink tile for dark / auto
}

// ── Mark paths ────────────────────────────────────────────────────────────────

function MarkPaths({ ring, dot }: { ring: string; dot: string }) {
  return (
    <>
      {/* Corner brackets — face-detection frame */}
      <path
        d="M12 30V18Q12 12 18 12H30M70 12H82Q88 12 88 18V30M12 70V82Q12 88 18 88H30M70 88H82Q88 88 88 82V70"
        fill="none"
        stroke={ring}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* C aperture ring — the lens */}
      <path
        d="M68.4 34.6A24 24 0 1 0 68.4 65.4"
        fill="none"
        stroke={ring}
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* Coral dot — detected face */}
      <circle cx="51" cy="50" r="6.5" fill={dot} />
      {/* Spark dot in the gap */}
      <circle cx="74" cy="50" r="3" fill={ring} />
    </>
  );
}

// ── Wordmark ──────────────────────────────────────────────────────────────────

const SYSTEM_FONT =
  "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

function Wordmark({ tone, capHeight }: { tone: LogoProps['tone']; capHeight: number }) {
  const classColor = tone === 'onLight' ? '#0F1830' : tone === 'mono' ? 'currentColor' : '#FFFFFF';
  const sightColor =
    tone === 'onLight' ? '#0B7F7B' : tone === 'mono' ? 'currentColor' : 'var(--logo-ring, #2DD4BF)';
  const fontSize = capHeight * 1.4; // cap-height ≈ 72% of font-size; tune so cap-height ≈ capHeight
  return (
    <text
      y="50%"
      fontFamily={SYSTEM_FONT}
      fontSize={fontSize}
      fontWeight={500}
      dominantBaseline="central"
    >
      <tspan fill={classColor}>Class</tspan>
      <tspan fill={sightColor}>Sight</tspan>
    </text>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

export function Logo({
  variant = 'mark',
  tone = 'auto',
  size = 32,
  className,
  title,
  decorative = false,
  loading = false,
}: LogoProps) {
  const ring = ringColor(tone);
  const dot = dotColor(tone);
  const label = title ?? 'ClassSight';

  const ariaProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': label };

  const spinClass = loading ? 'cs-logo-spin' : '';

  if (variant === 'mark') {
    return (
      <svg
        {...ariaProps}
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={[spinClass, className].filter(Boolean).join(' ')}
        xmlns="http://www.w3.org/2000/svg"
      >
        {!decorative && <title>{label}</title>}
        <MarkPaths ring={ring} dot={dot} />
      </svg>
    );
  }

  if (variant === 'icon') {
    const tile = tileColor(tone);
    const iconRing = tone === 'onLight' ? '#FFFFFF' : ring;
    const iconDot = dot;
    return (
      <svg
        {...ariaProps}
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        xmlns="http://www.w3.org/2000/svg"
      >
        {!decorative && <title>{label}</title>}
        <rect width="100" height="100" rx="22" fill={tile} />
        <MarkPaths ring={iconRing} dot={iconDot} />
      </svg>
    );
  }

  // lockup: mark (height=size) + gap (size*0.25) + wordmark
  // cap-height of wordmark ≈ 40% of mark height
  const markH = size;
  const gap = Math.round(size * 0.25);
  const capHeight = Math.round(size * 0.40);
  // estimate wordmark width: "ClassSight" ≈ 10 chars * capHeight * 0.65 (char ratio)
  const wmarkW = Math.round(capHeight * 1.4 * 10 * 0.6);
  const totalW = markH + gap + wmarkW;

  return (
    <svg
      {...ariaProps}
      viewBox={`0 0 ${totalW} ${markH}`}
      width={totalW}
      height={markH}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {!decorative && <title>{label}</title>}
      {/* Mark scaled to markH×markH */}
      <g transform={`scale(${markH / 100})`}>
        <MarkPaths ring={ring} dot={dot} />
      </g>
      {/* Wordmark starts after mark + gap */}
      <g transform={`translate(${markH + gap}, 0)`} width={wmarkW} height={markH}>
        <Wordmark tone={tone} capHeight={capHeight} />
      </g>
    </svg>
  );
}

export default Logo;

