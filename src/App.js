import React, { useState, useEffect, useRef } from 'react';
import { X, Move } from 'lucide-react';
import { firebaseService } from './firebase';

const colors = [
  { name: 'Light Blue', value: '#B3E5FC', border: '#81D4FA' },
  { name: 'Pink', value: '#F8BBD9', border: '#F48FB1' },
  { name: 'Yellow', value: '#FFF59D', border: '#FFEB3B' },
  { name: 'Light Green', value: '#C8E6C9', border: '#A5D6A7' },
  { name: 'Orange', value: '#FFCC80', border: '#FFB74D' }
];

// Dimensions used for placement/overlap math
const EDIT_W = 320;
const EDIT_H = 380;
const NOTE_W = 220;
const NOTE_H = 260;

const PostIt = ({
                  text,
                  setText,
                  color,
                  setColor,
                  onPost,
                  onClose,
                  isEditing = true,
                  onDelete,
                  position,
                  onMove,
                  onClick,
                  isDragging = false,
                  authorId,
                  isInitial = false,
                  scale = 1,
                  currentUserId, // <- provided by PegBoard for delete permission
                }) => {
  const [isMoving, setIsMoving] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // in board coords
  const postItRef = useRef(null);

  // Convenience getters for DOM we rely on
  const getScrollContainer = () => document.querySelector('.board-scroll-container');
  const getBoardEl = () => document.querySelector('.board-inner');

  const startDrag = (clientX, clientY) => {
    if (isEditing || !onMove) return;

    const scrollContainer = getScrollContainer();
    const boardEl = getBoardEl();
    if (!scrollContainer || !boardEl || !postItRef.current) return;

    const boardRect = boardEl.getBoundingClientRect();

    // Pointer position in board coordinates (unscaled)
    const pointerBoardX = (clientX - boardRect.left + scrollContainer.scrollLeft) / scale;
    const pointerBoardY = (clientY - boardRect.top + scrollContainer.scrollTop) / scale;

    // Note: position is already in board coords
    const noteX = position?.x || 0;
    const noteY = position?.y || 0;

    setDragOffset({ x: pointerBoardX - noteX, y: pointerBoardY - noteY });
    setIsMoving(true);
  };

  const handleMouseDown = (e) => {
    // ignore clicks on delete button
    if (!isEditing && onMove && !(e.target.closest && e.target.closest('.delete-btn'))) {
      e.preventDefault();
      e.stopPropagation();
      startDrag(e.clientX, e.clientY);
    }
  };

  const handleTouchStart = (e) => {
    if (!isEditing && onMove && !(e.target.closest && e.target.closest('.delete-btn'))) {
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      e.stopPropagation();
      startDrag(touch.clientX, touch.clientY);
    }
  };

  useEffect(() => {
    if (!isMoving) return;

    const scrollContainer = getScrollContainer();
    const boardEl = getBoardEl();
    if (!scrollContainer || !boardEl) return;

    const boardRect = boardEl.getBoundingClientRect();

    const handleMove = (e) => {
      const touch = e.touches ? e.touches[0] : null;
      const clientX = touch ? touch.clientX : e.clientX;
      const clientY = touch ? touch.clientY : e.clientY;

      if (clientX == null || clientY == null || !onMove) return;

      // Convert to board coordinates (account for scroll & scale)
      const pointerBoardX = (clientX - boardRect.left + scrollContainer.scrollLeft) / scale;
      const pointerBoardY = (clientY - boardRect.top + scrollContainer.scrollTop) / scale;

      const newX = pointerBoardX - dragOffset.x;
      const newY = pointerBoardY - dragOffset.y;

      onMove({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsMoving(false);
    };

    // Use stable options object for touch listener removal
    const touchMoveOptions = { passive: false };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, touchMoveOptions);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove, touchMoveOptions);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isMoving, dragOffset, onMove, scale]);

  const selectedColor = colors.find((c) => c.value === color) || colors[0];
  const canDelete = authorId && currentUserId && authorId === currentUserId;

  return (
      <div
          ref={postItRef}
          data-postit="true"
          className={`
        absolute rounded-xl shadow-lg select-none
        ${isDragging || isMoving ? 'scale-105 shadow-2xl z-50' : 'hover:scale-102 hover:shadow-xl'}
        ${isMoving ? 'cursor-grabbing' : (isEditing ? 'cursor-text' : 'cursor-pointer')}
      `}
          style={{
            backgroundColor: selectedColor.value,
            borderColor: selectedColor.border,
            borderWidth: '3px',
            borderStyle: 'solid',
            width: isEditing ? `${EDIT_W}px` : `${NOTE_W}px`,
            minHeight: isEditing ? `${EDIT_H}px` : `${NOTE_H}px`,
            left: position?.x || 0,
            top: position?.y || 0,
            zIndex: isDragging || isMoving ? 1000 : (isInitial ? 500 : 10),
            filter: `drop-shadow(0 8px 16px rgba(0,0,0,0.15))`,
            opacity: 1
          }}
          onMouseDown={!isEditing ? handleMouseDown : undefined}
          onTouchStart={!isEditing ? handleTouchStart : undefined}
          onClick={
            !isEditing && !isMoving && onClick
                ? (e) => {
                  e.stopPropagation();
                  onClick();
                }
                : undefined
          }
      >
        {/* Color picker circles - only show when editing */}
        {isEditing && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
              {colors.map((c) => (
                  <button
                      key={c.value}
                      className={`w-8 h-8 rounded-full border-3 transition-all duration-200 ${
                          color === c.value ? 'scale-125 shadow-lg ring-2 ring-white' : 'hover:scale-110 shadow-md'
                      }`}
                      style={{
                        backgroundColor: c.value,
                        borderColor: color === c.value ? '#333' : c.border
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setColor && setColor(c.value);
                      }}
                  />
              ))}
            </div>
        )}

        {/* Delete button for posted notes (author only) */}
        {onDelete && !isEditing && canDelete && (
            <button
                className="delete-btn absolute top-3 right-3 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all duration-200 shadow-lg hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete"
            >
              <X size={16} />
            </button>
        )}

        {/* Move indicator for posted notes */}
        {!isEditing && (
            <div className="absolute top-3 left-3 text-gray-600 opacity-60">
              <Move size={16} />
            </div>
        )}

        {/* Main content area */}
        <div className="p-6 h-full flex flex-col" style={{ paddingTop: isEditing ? '60px' : '40px' }}>
          {isEditing ? (
              <>
            <textarea
                className="flex-1 w-full bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-600 font-medium mb-4"
                placeholder="Type your idea here..."
                value={text}
                onChange={(e) => setText && setText(e.target.value)}
                style={{ fontSize: '16px', lineHeight: '1.5', minHeight: '200px' }}
                autoFocus
            />
              </>
          ) : (
              <div className="flex-1 text-gray-800 font-medium leading-relaxed break-words" style={{ fontSize: '15px' }}>
                {text}
              </div>
          )}
        </div>

        {/* Post button (only when editing) */}
        {isEditing && (
            <div className="p-6 pt-0">
              <button
                  className={`w-full px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg ${
                      text?.trim()
                          ? 'bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95'
                          : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  onClick={onPost}
                  disabled={!text?.trim()}
              >
                Post to Board
              </button>
            </div>
        )}
      </div>
  );
};

const PegBoard = () => {
  const [posts, setPosts] = useState([]);
  const [showNewPost, setShowNewPost] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [newPostColor, setNewPostColor] = useState(colors[0].value);
  const [selectedPost, setSelectedPost] = useState(null);
  const [scale, setScale] = useState(1);
  const [hasPostedOnce, setHasPostedOnce] = useState(false);

  // Stable user id for author permissions
  const currentUserIdRef = useRef(null);
  if (!currentUserIdRef.current) {
    const saved = localStorage.getItem('pegboard_user_id');
    if (saved) {
      currentUserIdRef.current = saved;
    } else {
      const fresh = Math.random().toString(36).slice(2, 11);
      localStorage.setItem('pegboard_user_id', fresh);
      currentUserIdRef.current = fresh;
    }
  }
  const currentUserId = currentUserIdRef.current;

  useEffect(() => {
    const unsubscribe = firebaseService.onPostsChange((newPosts) => {
      setPosts(Array.isArray(newPosts) ? newPosts : []);
    });
    return unsubscribe;
  }, []);

  // Rectangle overlap check with padding
  const overlapsRect = (a, b, pad = 40) => {
    if (!a || !b) return false;
    const aw = NOTE_W, ah = NOTE_H;
    const bw = NOTE_W, bh = NOTE_H;
    return !(
        a.x + aw + pad < b.x ||
        a.x > b.x + bw + pad ||
        a.y + ah + pad < b.y ||
        a.y > b.y + bh + pad
    );
  };

  const getRandomPosition = () => {
    const margin = 60;
    const maxAttempts = 60;

    const scrollContainer = document.querySelector('.board-scroll-container');
    const boardEl = document.querySelector('.board-inner');

    const visible = {
      left: scrollContainer ? scrollContainer.scrollLeft : 0,
      top: scrollContainer ? scrollContainer.scrollTop : 0,
      right: scrollContainer
          ? scrollContainer.scrollLeft + scrollContainer.clientWidth
          : window.innerWidth,
      bottom: scrollContainer
          ? scrollContainer.scrollTop + scrollContainer.clientHeight
          : window.innerHeight
    };

    const searchPadding = 300;
    const search = {
      left: Math.max(margin, visible.left - searchPadding),
      top: Math.max(margin, visible.top - searchPadding),
      right: visible.right + searchPadding,
      bottom: visible.bottom + searchPadding
    };

    // Board bounds (unscaled)
    const boardWidth = 4000;
    const boardHeight = 3000;

    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.min(
          Math.max(Math.random() * (search.right - search.left - NOTE_W) + search.left, margin),
          boardWidth - NOTE_W - margin
      );
      const y = Math.min(
          Math.max(Math.random() * (search.bottom - search.top - NOTE_H) + search.top, margin),
          boardHeight - NOTE_H - margin
      );

      const candidate = { x, y };
      const collision = posts.some((p) => p.position && overlapsRect(candidate, p.position, 40));
      if (!collision) return candidate;
    }

    // Fallback: center of visible area
    return {
      x: (visible.left + visible.right) / 2 - NOTE_W / 2,
      y: (visible.top + visible.bottom) / 2 - NOTE_H / 2
    };
  };

  const handlePost = () => {
    if (!newPostText.trim()) return;
    const position = getRandomPosition();

    firebaseService.addPost({
      text: newPostText.trim(),
      color: newPostColor,
      position,
      authorId: currentUserId
    });

    // reset composer, close modal, show POST button
    setNewPostText('');
    setNewPostColor(colors[0].value);
    setShowNewPost(false);
    setHasPostedOnce(true);
  };

  const handleDeletePost = (id) => {
    firebaseService.deletePost(id);
  };

  const handleMovePost = (id, newPosition) => {
    firebaseService.updatePost(id, { position: newPosition });
  };

  const handleCreateNewPost = () => {
    setShowNewPost(true);
  };

  return (
      <div className="w-full h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 overflow-hidden relative">
        {/* Initial Post-it editor */}
        {showNewPost && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
              <div className="flex items-center justify-center">
                <PostIt
                    text={newPostText}
                    setText={setNewPostText}
                    color={newPostColor}
                    setColor={setNewPostColor}
                    onPost={handlePost}
                    isEditing={true}
                    isInitial={!hasPostedOnce}
                    scale={scale}
                    currentUserId={currentUserId}
                />
              </div>
            </div>
        )}

        {/* Selected Post Modal (read-only view) */}
        {selectedPost && (
            <div
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
                onClick={() => setSelectedPost(null)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <PostIt
                    text={selectedPost.text}
                    color={selectedPost.color}
                    isEditing={false}
                    scale={scale}
                    currentUserId={currentUserId}
                />
              </div>
            </div>
        )}

        {/* Scrollable Board (scaled) */}
        <div
            className="board-scroll-container w-full h-full overflow-auto"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}
        >
          <div
              className="board-inner relative"
              style={{
                width: '4000px',
                height: '3000px',
                backgroundImage: `
              radial-gradient(circle at 25% 25%, #8B4513 2px, transparent 2px),
              radial-gradient(circle at 75% 25%, #8B4513 2px, transparent 2px),
              radial-gradient(circle at 25% 75%, #8B4513 2px, transparent 2px),
              radial-gradient(circle at 75% 75%, #8B4513 2px, transparent 2px)
            `,
                backgroundSize: '60px 60px'
              }}
          >
            {/* Cork board subtle overlay */}
            <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                radial-gradient(circle at 25% 25%, #8B4513 2px, transparent 2px),
                radial-gradient(circle at 75% 25%, #8B4513 2px, transparent 2px),
                radial-gradient(circle at 25% 75%, #8B4513 2px, transparent 2px),
                radial-gradient(circle at 75% 75%, #8B4513 2px, transparent 2px)
              `,
                  backgroundSize: '60px 60px',
                  opacity: 0.15,
                  zIndex: 0
                }}
            />

            {/* Posted Notes */}
            {posts.map((post) => (
                <PostIt
                    key={post.id}
                    text={post.text}
                    color={post.color}
                    position={post.position}
                    isEditing={false}
                    onDelete={() => handleDeletePost(post.id)}
                    onMove={(newPosition) => handleMovePost(post.id, newPosition)}
                    onClick={() => setSelectedPost(post)}
                    authorId={post.authorId}
                    scale={scale}
                    currentUserId={currentUserId}
                />
            ))}
          </div>
        </div>

        {/* Floating Post Button */}
        {hasPostedOnce && !showNewPost && (
            <button
                className="fixed bottom-8 right-8 bg-blue-500 text-white p-4 rounded-full shadow-xl hover:bg-blue-600 transition-all duration-200 hover:scale-110 z-40 font-bold text-lg"
                onClick={handleCreateNewPost}
                style={{ fontSize: '24px' }}
            >
              POST
            </button>
        )}

        {/* Zoom controls */}
        {hasPostedOnce && (
            <div className="fixed bottom-8 left-8 flex flex-col space-y-3 z-40">
              <button
                  className="bg-white bg-opacity-90 text-gray-700 p-3 rounded-full shadow-lg hover:bg-opacity-100 transition-all duration-200 font-bold text-lg"
                  onClick={() => setScale((s) => Math.min(2, s * 1.2))}
                  aria-label="Zoom in"
              >
                +
              </button>
              <button
                  className="bg-white bg-opacity-90 text-gray-700 p-3 rounded-full shadow-lg hover:bg-opacity-100 transition-all duration-200 font-bold text-lg"
                  onClick={() => setScale((s) => Math.max(0.5, s / 1.2))}
                  aria-label="Zoom out"
              >
                −
              </button>
            </div>
        )}

        {/* Collaboration badge */}
        {hasPostedOnce && (
            <div className="fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 p-3 rounded shadow-lg text-sm max-w-xs z-40">
              <p className="font-semibold text-green-800">🎉 Live Collaboration!</p>
              <p className="text-green-700">Everyone can now see each other's post-its in real-time!</p>
            </div>
        )}
      </div>
  );
};

export default function App() {
  return <PegBoard />;
}
