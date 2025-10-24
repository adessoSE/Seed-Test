/**
 * Interface of StepResults
 */
export interface StepResults {

  /**
   * Amount of passed Steps
   */
  passedSteps: number;

  /**
   * Amount of failed Steps
   */
  failedSteps: number;

  /**
   * Amount of skipped Steps
   */
  skippedSteps: number;
}
