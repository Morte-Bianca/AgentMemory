import { useContext } from 'react';
import { UIContext } from './ui-context';

export function useUI() {
  return useContext(UIContext);
}
