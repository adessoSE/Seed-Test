/**
 * Interface of a block reference
 */

export interface BlockReference {
  /**
   * Object id of a block from the database
   */
  blockId: any;

  /**
   * id of the Block
   */
  id: number;

  /**
   * Optionally: values of the Block
   */
  values?: [];
}
