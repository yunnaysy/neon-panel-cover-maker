// Snapshot history: every committed edit is one state snapshot, capped at eighty. Photos live in the runtime
// library by id, so snapshots hold no image data and undo is cheap.

import { cloneState } from './state.js';

export function createHistory({ getState, setState, onChange, limit = 80 }) {
  let stack = [cloneState(getState())];
  let index = 0;
  let timer = 0;

  const canUndo = () => index > 0;
  const canRedo = () => index < stack.length - 1;

  function emit(kind) {
    if (onChange) onChange(kind, { canUndo: canUndo(), canRedo: canRedo() });
  }

  function commit() {
    clearTimeout(timer);
    timer = 0;
    const snapshot = cloneState(getState());
    if (JSON.stringify(snapshot) === JSON.stringify(stack[index])) {
      emit('noop');
      return;
    }
    stack = stack.slice(0, index + 1);
    stack.push(snapshot);
    if (stack.length > limit) stack.shift();
    index = stack.length - 1;
    emit('commit');
  }

  function scheduleCommit(delay = 420) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = 0;
      commit();
    }, delay);
  }

  function undo() {
    clearTimeout(timer);
    timer = 0;
    if (!canUndo()) return;
    index--;
    setState(cloneState(stack[index]));
    emit('undo');
  }

  function redo() {
    clearTimeout(timer);
    timer = 0;
    if (!canRedo()) return;
    index++;
    setState(cloneState(stack[index]));
    emit('redo');
  }

  function reset() {
    clearTimeout(timer);
    timer = 0;
    stack = [cloneState(getState())];
    index = 0;
    emit('reset');
  }

  return { commit, scheduleCommit, undo, redo, reset, canUndo, canRedo };
}
