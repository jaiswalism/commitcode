import { ProblemRecord } from '../storage/types';

export interface PlatformAdapter {
  /**
   * Initializes any listeners or mutation observers needed to detect a submission.
   * Calls the provided callback when an accepted submission is detected.
   */
  startListening(onSubmissionDetected: (problem: ProblemRecord) => void): void;
  
  /**
   * Cleans up any listeners.
   */
  stopListening(): void;
}
