
import { useEffect, useRef } from 'react';

type InputCallback = (key: string) => void;

export const useInput = (onInput: InputCallback) => {
  // Added initial value to fix the "Expected 1 arguments, but got 0" TypeScript error
  const rafRef = useRef<number | undefined>(undefined);
  const lastButtons = useRef<boolean[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      onInput(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];
      if (gp) {
        // Simple mapping: A -> Enter, B -> Escape, Arrows -> Arrows
        const buttons = gp.buttons.map(b => b.pressed);
        
        if (buttons[0] && !lastButtons.current[0]) onInput('Enter'); // A
        if (buttons[1] && !lastButtons.current[1]) onInput('Escape'); // B
        if (buttons[12] && !lastButtons.current[12]) onInput('ArrowUp');
        if (buttons[13] && !lastButtons.current[13]) onInput('ArrowDown');
        if (buttons[14] && !lastButtons.current[14]) onInput('ArrowLeft');
        if (buttons[15] && !lastButtons.current[15]) onInput('ArrowRight');

        lastButtons.current = buttons;
      }
      rafRef.current = requestAnimationFrame(pollGamepad);
    };

    rafRef.current = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onInput]);
};
