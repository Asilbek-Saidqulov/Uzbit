'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { parseDisplay } from '@/lib/mathTree';
import { renderSeq, Caret } from '@/components/MathRender';

export type MathFieldHandle = {
  insert: (text: string, caret?: number) => void;
  backspace: () => void;
  focus: () => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onEnter?: () => void;
  onMove?: (delta: -1 | 1) => void;
  onDeleteEmpty?: () => void;
  placeholder?: string;
  invalid?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
};

export const MathField = forwardRef<MathFieldHandle, Props>(function MathField(
  { value, onChange, onFocus, onEnter, onMove, onDeleteEmpty, placeholder, invalid, autoFocus, ariaLabel },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Refs mirror state so rapid keypresses in one tick see the latest value and cursor.
  const valueRef = useRef(value);
  valueRef.current = value;
  const [pos, setPos] = useState(value.length);
  const posRef = useRef(pos);
  const [focused, setFocused] = useState(false);

  const tree = useMemo(() => parseDisplay(value), [value]);

  const setCaret = (p: number) => {
    const clamped = Math.max(0, Math.min(p, valueRef.current.length));
    posRef.current = clamped;
    setPos(clamped);
  };

  const apply = (next: string, caret: number) => {
    valueRef.current = next;
    posRef.current = caret;
    setPos(caret);
    onChange(next);
  };

  const insert = (text: string, caret = text.length) => {
    const v = valueRef.current;
    const p = posRef.current;
    apply(v.slice(0, p) + text + v.slice(p), p + caret);
  };

  const backspace = () => {
    const v = valueRef.current;
    const p = posRef.current;
    if (p === 0) return;
    apply(v.slice(0, p - 1) + v.slice(p), p - 1);
  };

  const focus = () => inputRef.current?.focus();

  useImperativeHandle(ref, () => ({ insert, backspace, focus }));

  useEffect(() => {
    if (autoFocus) focus();
  }, [autoFocus]);

  // If the parent shortens the value from outside, keep the cursor inside it.
  useEffect(() => {
    if (posRef.current > value.length) setCaret(value.length);
  }, [value]);

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // keep focus here instead of letting the browser move it
    focus();
    const target = e.target as HTMLElement;
    if (target.closest('[data-caret]')) return;
    const marker = target.closest<HTMLElement>('[data-i]');
    if (!marker) {
      setCaret(valueRef.current.length);
      return;
    }
    const rect = marker.getBoundingClientRect();
    const i = Number(marker.dataset.i);
    setCaret(e.clientX > rect.left + rect.width / 2 ? i + 1 : i);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        onEnter?.();
        break;
      case 'Backspace':
        e.preventDefault();
        if (valueRef.current === '' && onDeleteEmpty) onDeleteEmpty();
        else backspace();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setCaret(posRef.current - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        setCaret(posRef.current + 1);
        break;
      case 'Home':
        e.preventDefault();
        setCaret(0);
        break;
      case 'End':
        e.preventDefault();
        setCaret(valueRef.current.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        onMove?.(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        onMove?.(1);
        break;
    }
  };

  // Typed characters arrive through onChange. The hidden input is always empty,
  // which also works with mobile keyboards that don't send keydown events.
  const onChangeInput = (e: ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value;
    if (typed) insert(typed);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    insert(e.clipboardData.getData('text').replace(/\s+/g, ''));
  };

  return (
    <div
      onMouseDown={onMouseDown}
      className={`relative flex h-12 min-w-0 flex-1 cursor-text items-center overflow-hidden whitespace-pre rounded-xl border bg-field px-3 font-sans text-[17px] text-ink transition-all ${
        invalid ? 'border-danger' : focused ? 'border-accent ring-2 ring-accent/20' : 'border-line'
      }`}
    >
      <input
        ref={inputRef}
        value=""
        onChange={onChangeInput}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />

      {value === '' && !focused && <span className="text-[14px] text-muted">{placeholder}</span>}

      {renderSeq(tree, focused ? pos : -1)}
    </div>
  );
});