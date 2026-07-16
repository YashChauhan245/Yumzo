const prisma = require('../config/prisma');

const formatReel = (reel, currentUserId) => {
  const hash = String(reel.id).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const baseLikes = 11000 + (hash % 6) * 1000 + (hash % 10) * 100; // 11k to 17k likes
  const baseComments = 380 + (hash % 8) * 20 + (hash % 5) * 5; // 380 to 550 comments

  return {
    id: reel.id,
    videoUrl: reel.videoUrl,
    posterUrl: reel.thumbnailUrl || null,
    dishName: reel.title,
    restaurantName: reel.user?.name || 'Yumzo Kitchen',
    likeCount: baseLikes + (reel._count?.likes || 0),
    commentCount: baseComments + (reel._count?.comments || 0),
    likedByMe: reel.likes?.some((like) => like.userId === currentUserId) || false,
  };
};

const getFeed = async (currentUserId, { skip = 0, limit = 5 } = {}) => {
  const [reels, total] = await Promise.all([
    prisma.reel.findMany({
      include: {
        user: { select: { name: true } },
        likes: {
          where: { userId: currentUserId },
          select: { userId: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.reel.count(),
  ]);

  return {
    rows: reels.map((reel) => formatReel(reel, currentUserId)),
    total,
  };
};

const toggleLike = async (reelId, userId) => {
  const existing = await prisma.reelLike.findUnique({
    where: {
      reelId_userId: { reelId, userId },
    },
  });

  if (existing) {
    await prisma.reelLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.reelLike.create({
      data: { reelId, userId },
    });
  }

  const count = await prisma.reelLike.count({ where: { reelId } });

  return {
    likedByMe: !existing,
    likeCount: count,
  };
};

const getComments = async (reelId) => {
  const comments = await prisma.reelComment.findMany({
    where: { reelId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return comments.map((comment) => ({
    id: comment.id,
    reelId: comment.reelId,
    userName: comment.user?.name || 'User',
    comment: comment.comment,
    createdAt: comment.createdAt,
  }));
};

const addComment = async (reelId, userId, text) => {
  const created = await prisma.reelComment.create({
    data: {
      reelId,
      userId,
      comment: text,
    },
    include: { user: { select: { name: true } } },
  });

  const commentCount = await prisma.reelComment.count({ where: { reelId } });

  return {
    comment: {
      id: created.id,
      reelId: created.reelId,
      userName: created.user?.name || 'User',
      comment: created.comment,
      createdAt: created.createdAt,
    },
    commentCount,
  };
};

module.exports = {
  getFeed,
  toggleLike,
  getComments,
  addComment,
};
