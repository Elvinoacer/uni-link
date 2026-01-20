import apiClient from '../services/api';
import { storage } from './storage';

export const streamRequest = async (
  endpoint: string,
  body: any,
  callbacks: {
    onChunk: (data: any) => void;
    onComplete?: () => void;
    onError: (error: Error) => void;
  },
  signal?: AbortController
) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const baseURL = apiClient.defaults.baseURL;
      // Ensure endpoint has leading slash if needed
      const url = `${baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      
      const token = await storage.getItem('accessToken');
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'text/event-stream');
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      // Handle abort
      if (signal) {
        signal.signal.addEventListener('abort', () => {
          xhr.abort();
          resolve(); // Resolve on abort to prevent hanging
        });
      }

      let processedIndex = 0;
      let buffer = '';

      xhr.onprogress = () => {
        const newContent = xhr.responseText.substring(processedIndex);
        processedIndex = xhr.responseText.length;
        buffer += newContent;
        
        // Split by standard SSE delimiter
        const parts = buffer.split('\n\n');
        
        // The last part might be incomplete, keep it in buffer
        // If the buffer ended with \n\n, the last part is empty string, which is correct
        buffer = parts.pop() || '';
        
        for (const part of parts) {
          if (part.trim().startsWith('data:')) {
            // Remove 'data: ' prefix
            const dataStr = part.replace(/^data:\s*/, '').trim();
            
            if (dataStr === '[DONE]') {
              callbacks.onComplete?.();
              return;
            }
            
            try {
              const data = JSON.parse(dataStr);
              callbacks.onChunk(data);
            } catch (e) {
              console.warn('Failed to parse SSE chunk:', e);
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Process any remaining buffer if it looks complete?
          // Usually SSE ends with \n\n so buffer should be empty or just whitespace
          resolve();
          if (processedIndex < xhr.responseText.length) {
             // trigger one last check? onprogress should have fired.
          }
          callbacks.onComplete?.();
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            callbacks.onError(new Error(error.error || error.message || 'Request failed'));
          } catch {
            callbacks.onError(new Error(xhr.responseText || 'Request failed'));
          }
          resolve(); // Resolve promise even on error to finish the async call
        }
      };

      xhr.onerror = () => {
        callbacks.onError(new Error('Network request failed'));
        resolve(); /// Resolve to avoid hanging
      };

      xhr.send(JSON.stringify(body));
    } catch (error: any) {
      callbacks.onError(error);
      resolve();
    }
  });
};
