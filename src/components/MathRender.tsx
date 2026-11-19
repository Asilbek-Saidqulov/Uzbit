import type { ReactNode } from 'react';
import type { Seq } from '@/lib/mathTree';

const SYMBOL: Record<string, string> = { '*': '×', '-': '−' };

/** The blinking cursor. The data attribute lets clicks on the cursor itself be ignored. */
export function Caret() {
  return (
    <span
      data-caret=""
      className="inline-block h-[1.1em] w-[1.5px] translate-y-[0.1em] animate-pulse bg-accent align-middle"
    />
  );
}

/**
 * Renders a sequence as formatted math. Characters carry data-i so a click can be
 * mapped back to a cursor position. Pass pos = -1 when the field is not focused.
 */
export function renderSeq(seq: Seq, pos: number, counter = { n: 0 }): ReactNode[] {
  const key = (prefix: string) => `${prefix}${counter.n++}`;
  const out: ReactNode[] = [];

  for (const node of seq.nodes) {
    if (node.t === 'ch') {
      if (node.i === pos) out.push(<Caret key={key('caret')} />);
      out.push(
        <span key={key('c')} data-i={node.i}>
          {SYMBOL[node.ch] ?? node.ch}
        </span>
      );
    } else if (node.t === 'lit') {
      out.push(<span key={key('lit')}>{node.ch}</span>);
    } else if (node.t === 'sup') {
      // The "^" is not drawn, but its position stays addressable through the base and exponent.
      out.push(...renderSeq(node.base, pos, counter));
      out.push(
        <sup key={key('s')} className="text-[0.7em] leading-none">
          {renderSeq(node.exp, pos, counter)}
        </sup>
      );
    } else {
      out.push(
        <span
          key={key('f')}
          className="mx-[2px] inline-flex min-w-[0.6em] flex-col items-center align-middle leading-[1.15]"
        >
          <span className="px-[3px] pb-[2px] text-[0.85em]">{renderSeq(node.num, pos, counter)}</span>
          <span className="block h-px w-full bg-current" />
          <span className="px-[3px] pt-[2px] text-[0.85em]">{renderSeq(node.den, pos, counter)}</span>
        </span>
      );
    }
  }

  // A container at the end places its own cursor inside its last part, so skip the duplicate here.
  const last = seq.nodes[seq.nodes.length - 1];
  const endsInContainer = !!last && last.t !== 'ch' && last.t !== 'lit';
  if (pos === seq.end && !endsInContainer) out.push(<Caret key={key('caret')} />);

  return out;
}