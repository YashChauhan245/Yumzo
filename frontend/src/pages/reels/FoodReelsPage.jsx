import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReelCard from '../../components/reels/ReelCard';
import { reelsData } from './reelsData';
import { reelsAPI, getApiErrorMessage } from '../../services/api';

export default function FoodReelsPage() {
  const navigate = useNavigate();
  const feedRef = useRef(null);
  const itemRefs = useRef([]);
  const [reels, setReels] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeCommentsReel, setActiveCommentsReel] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const fallbackReels = useMemo(
    () =>
      reelsData.map((item) => ({
        ...item,
        likeCount: item.likes,
        commentCount: item.comments,
        likedByMe: false,
      })),
    []
  );

  useEffect(() => {
    let mounted = true;

    const loadFeed = async () => {
      setIsLoadingFeed(true);

      try {
        const response = await reelsAPI.getFeed({ page: 1, limit: 20 });
        const feed = response.data?.data?.reels || [];

        if (mounted) {
          if (feed.length > 0) {
            setReels(feed);
          } else {
            // Keep a useful UI even when DB has no reels yet.
            setReels(fallbackReels);
          }
        }
      } catch {
        if (mounted) {
          setReels(fallbackReels);
        }
      } finally {
        if (mounted) {
          setIsLoadingFeed(false);
        }
      }
    };

    loadFeed();
    return () => {
      mounted = false;
    };
  }, [fallbackReels]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visibleEntry) return;

        const idx = Number(visibleEntry.target.getAttribute('data-index'));
        if (!Number.isNaN(idx)) {
          setCurrentIndex(idx);
        }
      },
      {
        root: feedRef.current,
        threshold: [0.55, 0.75],
      }
    );

    itemRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [reels.length]);

  const handleShare = async (reel) => {
    const shareUrl = `${window.location.origin}/reels/${reel.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Reel link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleLike = async (reelId) => {
    const previous = reels;

    // Optimistic update keeps UI snappy.
    setReels((items) =>
      items.map((item) => {
        if (item.id !== reelId) return item;
        const nextLiked = !item.likedByMe;
        return {
          ...item,
          likedByMe: nextLiked,
          likeCount: (item.likeCount || 0) + (nextLiked ? 1 : -1),
        };
      })
    );

    try {
      const response = await reelsAPI.toggleLike(reelId);
      const payload = response.data?.data;

      if (payload) {
        setReels((items) =>
          items.map((item) =>
            item.id === reelId
              ? {
                  ...item,
                  likedByMe: payload.likedByMe,
                  likeCount: payload.likeCount,
                }
              : item
          )
        );
      }
    } catch (error) {
      setReels(previous);
      toast.error(getApiErrorMessage(error, 'Could not update like'));
    }
  };

  const openComments = async (reel) => {
    setActiveCommentsReel(reel);
    setComments([]);

    try {
      const response = await reelsAPI.getComments(reel.id);
      const rows = response.data?.data?.comments || [];
      setComments(rows);
    } catch {
      // Fallback for dummy mode.
      setComments([]);
    }
  };

  const submitComment = async () => {
    if (!activeCommentsReel) return;
    const text = commentText.trim();
    if (!text) return;

    setIsPostingComment(true);

    try {
      const response = await reelsAPI.addComment(activeCommentsReel.id, { comment: text });
      const createdComment = response.data?.data?.comment;
      const nextCount = response.data?.data?.commentCount;

      if (createdComment) {
        setComments((prev) => [createdComment, ...prev]);
        setCommentText('');
      }

      setReels((items) =>
        items.map((item) =>
          item.id === activeCommentsReel.id
            ? { ...item, commentCount: typeof nextCount === 'number' ? nextCount : (item.commentCount || 0) + 1 }
            : item
        )
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not add comment'));
    } finally {
      setIsPostingComment(false);
    }
  };

  return (
    <section className="food-reels-page relative min-h-svh w-full overflow-hidden bg-black text-white">
      <header className="food-reels-header absolute left-0 top-0 z-40 flex w-full items-center justify-between px-3 py-3 md:px-5">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="food-reels-back-btn rounded-full bg-black/45 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur"
        >
          Back
        </button>

        <div className="food-reels-counter rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur sm:text-sm">
          {currentIndex + 1} / {reels.length}
        </div>
      </header>

      <div className="flex h-svh w-full items-center justify-center md:px-4 md:py-6">
        <div className="food-reels-frame h-svh w-full overflow-hidden md:h-[88svh] md:max-w-97.5 md:rounded-[28px] md:border md:border-[#1F1F1F] md:bg-[#0A0A0A] md:shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          {isLoadingFeed ? (
            <div className="food-reels-loading flex h-full items-center justify-center text-sm text-[#A1A1AA]">Loading reels...</div>
          ) : (
            <div
              ref={feedRef}
              className="h-full snap-y snap-mandatory overflow-y-auto scrollbar-hide"
            >
              {reels.map((reel, index) => (
                <div
                  key={reel.id}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  data-index={index}
                  className="h-full"
                >
                  <ReelCard
                    reel={{
                      ...reel,
                      onLike: handleLike,
                      onOpenComments: openComments,
                    }}
                    isActive={index === currentIndex}
                    onShare={handleShare}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeCommentsReel && (
        <div className="food-reels-comments-overlay absolute inset-0 z-50 flex items-end bg-black/50 md:items-center md:justify-center">
          <div className="food-reels-comments-modal w-full rounded-t-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-4 md:w-105 md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="food-reels-comments-title text-sm font-semibold text-white">Comments</h3>
              <button
                type="button"
                onClick={() => setActiveCommentsReel(null)}
                className="food-reels-comments-close rounded-md border border-[#1F1F1F] bg-black px-2 py-1 text-xs text-[#A1A1AA]"
              >
                Close
              </button>
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="food-reels-comments-empty text-xs text-[#A1A1AA]">No comments yet. Start the conversation.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="food-reels-comment-item rounded-lg border border-[#1F1F1F] bg-black p-2">
                    <p className="food-reels-comment-user text-xs font-semibold text-white">{comment.userName}</p>
                    <p className="food-reels-comment-text mt-1 text-xs text-[#A1A1AA]">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment"
                className="food-reels-comment-input h-9 w-full rounded-lg border border-[#2A2A2A] bg-[#0B0B0B] px-3 text-sm text-white outline-none focus:border-[#3A3A3A]"
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={isPostingComment}
                className="food-reels-comment-post rounded-lg bg-[#3A3A3A] px-3 text-xs font-semibold text-white disabled:opacity-60"
              >
                {isPostingComment ? '...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No pagination controls needed, scroll is continuous like Instagram */}
    </section>
  );
}
