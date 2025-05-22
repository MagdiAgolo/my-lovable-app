import React from 'react';
import { toast as sonnerToast } from 'sonner';

export const toast = {
  error: (message: string) => {
    sonnerToast.error(message);
  },
  info: (message: string) => {
    sonnerToast.info(message);
  },
  success: (message: string) => {
    sonnerToast.success(message);
  },
  warning: (message: string) => {
    sonnerToast.warning(message);
  },
}; 