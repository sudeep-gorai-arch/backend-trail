import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import wallpaperRoutes from './wallpaper.routes';
import categoryRoutes from './category.routes';
import favoriteRoutes from './favorite.routes';
import downloadRoutes from './download.routes';
import likeRoutes from './like.routes';
import subscriptionRoutes from './subscription.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/wallpapers', wallpaperRoutes);
router.use('/categories', categoryRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/downloads', downloadRoutes);
router.use('/likes', likeRoutes);
router.use('/subscriptions', subscriptionRoutes);

export default router;
