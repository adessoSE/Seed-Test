/**
 * Interface of a block reference
 */
import {StepType} from './StepType';

export interface BlockReference {
  /**
   * Object id of a block from the database
   */
  blockId: any;

  /**
   * position of the Block
   */
  id: number;
  // position: { stepType: string, blockPosition: number };

  values?: [];
}
