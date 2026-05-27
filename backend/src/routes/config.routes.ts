import { Router } from 'express';
import { getDimensions } from '../config/emotional-dimensions';

export const configRouter = Router();

/**
 * GET /api/config/emotional-dimensions
 * Returns the emotional dimensions configuration used by the application
 */
configRouter.get('/emotional-dimensions', (req, res) => {
  try {
    const dimensions = getDimensions();
    res.json(dimensions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve emotional dimensions' });
  }
});
