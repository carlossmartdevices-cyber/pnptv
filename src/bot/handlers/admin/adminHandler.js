/**
 * Admin Panel Handler - Legacy Entry Point
 * This file now acts as an adapter to the new modular admin system
 * Maintains backward compatibility with existing bot.js imports
 */

import registerAdminHandlers from './index.js';
import logger from '../../../../utils/logger.js';

logger.info('Loading admin handlers from new modular admin system');

export { registerAdminHandlers };

export default registerAdminHandlers;
