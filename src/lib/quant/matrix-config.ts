/** Live Signals matrix — stocks per column (Short-Squeeze / High-Cash). */
export const MATRIX_COLUMN_SIZE = 10;

/** Ranked pool size before 2-column classify (≥ 2 × column size). */
export const MATRIX_RANK_POOL_SIZE = MATRIX_COLUMN_SIZE * 2 + 4;
