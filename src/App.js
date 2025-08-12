import React, { useEffect, useRef, useState } from 'react';
import { X, Move } from 'lucide-react';
import { firebaseService } from './firebase';

const colors = [
  { name: 'Light Blue', value: '#B3E5FC', border: '#81D4FA' },
  { name: 'Pink', value: '#F8BBD9', border: '#F48FB1' },
  { name: 'Yellow', value: '#FFF59D', border: '#FFEB3B' },
  { name: 'Light Green', value: '#C8E6C9', border: '#A5D6A7' },
  { name: 'Orange', value: '#FFCC80', border: '#FFB74D' }
];

const EDIT_W = 320;
const EDIT_H = 380;
const NOTE_W = 220;
const NOTE_H = 260;

/* ------------------- PostIt ------------------- */
function PostIt({
                  text,
                  setText,
                  color,
                  setColor,
                  onPost,
                  isEditing = true,
                  onDelete,
                  position,          // {x,y} in board coords for pinned notes
                  onMove,
                  onClick,
                  isDragging = false,
                  authorId,
                  isInitial = false,
                  scale = 1,
                  currentUserId
                }) {
  const [isMoving, setIsMoving] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // in board coords
  const postItRef = useRef(null);

  const getScrollContainer = () => document.querySelector('.board-scroll-container');
  const getBoardEl = () => document.querySelector('.board-inner');

  const startDrag = (clientX, clientY) => {
    if (isEditing || !onMove) return;
    const sc = getScrollContainer();
    const boardEl = getBoardEl();
    if (!sc || !boardEl) return;

    const rect = boardEl.getBoundingClientRect();
    const pointerBoardX = (clientX - rect.left + sc.scrollLeft) / scale;
    const pointerBoardY = (clientY - rect.top + sc.scrollTop) / scale;
    const noteX = position?.x || 0;
    const noteY = position?.y || 0;

    setDragOffset({ x: pointerBoardX - noteX, y: pointerBoardY - noteY });
    setIsMoving(true);
  };

  const handleMouseDown = (e) => {
    if (!isEditing && onMove && !(e.target.closest && e.target.closest('.delete-btn'))) {
      e.preventDefault();
      e.stopPropagation();
      startDrag(e.clientX, e.clientY);
    }
  };

  const handleTouchStart = (e) => {
    if (!isEditing && onMove && !(e.target.closest && e.target.closest('.delete-btn'))) {
      const t = e.touches?.[0];
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      startDrag(t.clientX, t.clientY);
    }
  };

  useEffect(() => {
    if (!isMoving) return;

    const sc = getScrollContainer();
    const boardEl = getBoardEl();
    if (!sc || !boardEl) return;

    const rect = boardEl.getBoundingClientRect();

    const handleMove = (e) => {
      const t = e.touches ? e.touches[0] : null;
      const clientX = t ? t.clientX : e.clientX;
      const clientY = t ? t.clientY : e.clientY;
      if (clientX == null || clientY == null || !onMove) return;

      const pointerBoardX = (clientX - rect.left + sc.scrollLeft) / scale;
      const pointerBoardY = (clientY - rect.top + sc.scrollTop) / scale;

      onMove({
        x: pointerBoardX - dragOffset.x,
        y: pointerBoardY - dragOffset.y
      });
    };

    const handleEnd = () => setIsMoving(false);

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

  const selectedColor = colors.find(c => c.value === color) || colors[0];
  const canDelete = authorId && currentUserId && authorId === currentUserId;
  const isAbsolutelyPositioned = !!position;

  return (
      <div
          ref={postItRef}
          data-postit="true"
          className={`
        ${isAbsolutelyPositioned ? 'absolute' : 'relative'}
        rounded-xl shadow-lg select-none
        ${isDragging || isMoving ? 'scale-105 shadow-2xl z-50' : 'hover:scale-102 hover:shadow-xl'}
        ${isMoving ? 'cursor-grabbing' : (isEditing ? 'cursor-text' : 'cursor-pointer')}
      `}
          style={{
            position: isAbsolutelyPositioned ? 'absolute' : 'relative',
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
          onClick={!isEditing && onClick && !isMoving ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      >
        {/* Color picker (editing only) */}
        {isEditing && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
              {colors.map((c) => (
                  <button
                      key={c.value}
                      className={`w-8 h-8 rounded-full border-3 transition-all duration-200 ${
                          color === c.value ? 'scale-125 shadow-lg ring-2 ring-white' : 'hover:scale-110 shadow-md'
                      }`}
                      style={{ backgroundColor: c.value, borderColor: color === c.value ? '#333' : c.border }}
                      onClick={(e) => { e.stopPropagation(); setColor && setColor(c.value); }}
                  />
              ))}
            </div>
        )}

        {/* Delete (author only) */}
        {onDelete && !isEditing && canDelete && (
            <button
                className="delete-btn absolute top-3 right-3 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all duration-200 shadow-lg hover:scale-110"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete"
            >
              <X size={16} />
            </button>
        )}

        {/* Move indicator */}
        {!isEditing && (
            <div className="absolute top-3 left-3 text-gray-600 opacity-60">
              <Move size={16} />
            </div>
        )}

        {/* Content */}
        <div className="p-6 h-full flex flex-col" style={{ paddingTop: isEditing ? '60px' : '40px' }}>
          {isEditing ? (
              <textarea
                  className="flex-1 w-full bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-600 font-medium mb-4"
                  placeholder="Type your idea here..."
                  value={text}
                  onChange={(e) => setText && setText(e.target.value)}
                  style={{ fontSize: '16px', lineHeight: '1.5', minHeight: '200px' }}
                  autoFocus
              />
          ) : (
              <div className="flex-1 text-gray-800 font-medium leading-relaxed break-words" style={{ fontSize: '15px' }}>
                {text}
              </div>
          )}
        </div>

        {/* Post button (editing only) */}
        {isEditing && (
            <div className="p-6 pt-0">
              <button
                  className={`w-full px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg ${
                      text?.trim() ? 'bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95' : 'bg-gray-400 cursor-not-allowed'
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
}

/* ------------------- PegBoard (single file) ------------------- */
export default function App() {
  const [posts, setPosts] = useState([]);
  const [showNewPost, setShowNewPost] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [newPostColor, setNewPostColor] = useState(colors[0].value);
  const [selectedPost, setSelectedPost] = useState(null);
  const [scale, setScale] = useState(1);
  const [hasPostedOnce, setHasPostedOnce] = useState(false);

  // Stable pseudo-user id (for delete permission)
  const currentUserIdRef = useRef(null);
  if (!currentUserIdRef.current) {
    const saved = localStorage.getItem('pegboard_user_id');
    if (saved) currentUserIdRef.current = saved;
    else {
      const fresh = Math.random().toString(36).slice(2, 11);
      localStorage.setItem('pegboard_user_id', fresh);
      currentUserIdRef.current = fresh;
    }
  }
  const currentUserId = currentUserIdRef.current;

  // Refs for pan/zoom
  const scRef = useRef(null); // scroll container
  const boardRef = useRef(null);

  // Subscribe to realtime posts
  useEffect(() => {
    const unsubscribe = firebaseService.onPostsChange((newPosts) => {
      setPosts(Array.isArray(newPosts) ? newPosts : []);
    });
    return unsubscribe;
  }, []);

  // Center the initial editor on first render
  useEffect(() => {
    // no-op: editor modal is flex-centered below
  }, []);

  // Rectangle overlap check
  const overlapsRect = (a, b, pad = 40) => {
    if (!a || !b) return false;
    return !(
        a.x + NOTE_W + pad < b.x ||
        a.x > b.x + NOTE_W + pad ||
        a.y + NOTE_H + pad < b.y ||
        a.y > b.y + NOTE_H + pad
    );
  };

  const getRandomPosition = () => {
    const margin = 60;
    const maxAttempts = 60;
    const sc = scRef.current;

    const visible = {
      left: sc ? sc.scrollLeft : 0,
      top: sc ? sc.scrollTop : 0,
      right: sc ? sc.scrollLeft + sc.clientWidth : window.innerWidth,
      bottom: sc ? sc.scrollTop + sc.clientHeight : window.innerHeight
    };

    const searchPadding = 300;
    const search = {
      left: Math.max(margin, visible.left - searchPadding),
      top: Math.max(margin, visible.top - searchPadding),
      right: visible.right + searchPadding,
      bottom: visible.bottom + searchPadding
    };

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

  const handleCreateNewPost = () => setShowNewPost(true);

  /* ---------- Zoom: wheel/trackpad pinch (desktop) ---------- */
  useEffect(() => {
    const sc = scRef.current;
    const board = boardRef.current;
    if (!sc || !board) return;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const minScale = 0.5;
    const maxScale = 2;

    const zoomAt = (clientX, clientY, nextScale) => {
      const rect = board.getBoundingClientRect();
      const prev = scale;
      const target = clamp(nextScale, minScale, maxScale);
      if (target === prev) return;

      // Keep the zoom focus under the cursor
      const boardX = (clientX - rect.left + sc.scrollLeft) / prev;
      const boardY = (clientY - rect.top + sc.scrollTop) / prev;

      setScale(target);

      // On next tick, adjust scroll to keep focus
      requestAnimationFrame(() => {
        sc.scrollLeft = boardX * target - (clientX - rect.left);
        sc.scrollTop = boardY * target - (clientY - rect.top);
      });
    };

    const onWheel = (e) => {
      // Trackpad pinch on Mac sets ctrlKey + wheel
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY;
      const factor = Math.exp(-delta / 300); // smooth
      const next = scale * factor;
      zoomAt(e.clientX, e.clientY, next);
    };

    sc.addEventListener('wheel', onWheel, { passive: false });
    return () => sc.removeEventListener('wheel', onWheel);
  }, [scale]);

  /* ---------- Zoom: mobile pinch + one-finger pan ---------- */
  useEffect(() => {
    const sc = scRef.current;
    const board = boardRef.current;
    if (!sc || !board) return;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const minScale = 0.5;
    const maxScale = 2;

    let pinch = {
      active: false,
      startDist: 0,
      startScale: scale,
      centerClient: { x: 0, y: 0 }
    };

    let panning = {
      active: false,
      lastX: 0,
      lastY: 0
    };

    const dist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const mid = (t1, t2) => ({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 });

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinch.active = true;
        pinch.startDist = dist(e.touches[0], e.touches[1]);
        pinch.startScale = scale;
        pinch.centerClient = mid(e.touches[0], e.touches[1]);
      } else if (e.touches.length === 1 && !pinch.active) {
        // one-finger pan via scrolling
        panning.active = true;
        panning.lastX = e.touches[0].clientX;
        panning.lastY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (pinch.active && e.touches.length === 2) {
        e.preventDefault();
        const newDist = dist(e.touches[0], e.touches[1]);
        const factor = newDist / (pinch.startDist || 1);
        const next = clamp(pinch.startScale * factor, minScale, maxScale);

        // Zoom around pinch center
        const rect = board.getBoundingClientRect();
        const prev = scale;
        const boardX = (pinch.centerClient.x - rect.left + sc.scrollLeft) / prev;
        const boardY = (pinch.centerClient.y - rect.top + sc.scrollTop) / prev;

        setScale(next);
        requestAnimationFrame(() => {
          sc.scrollLeft = boardX * next - (pinch.centerClient.x - rect.left);
          sc.scrollTop = boardY * next - (pinch.centerClient.y - rect.top);
        });
      } else if (panning.active && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = panning.lastX - t.clientX;
        const dy = panning.lastY - t.clientY;
        panning.lastX = t.clientX;
        panning.lastY = t.clientY;
        sc.scrollLeft += dx;
        sc.scrollTop += dy;
      }
    };

    const onTouchEnd = () => {
      if (pinch.active) pinch.active = false;
      if (panning.active) panning.active = false;
    };

    sc.addEventListener('touchstart', onTouchStart, { passive: false });
    sc.addEventListener('touchmove', onTouchMove, { passive: false });
    sc.addEventListener('touchend', onTouchEnd, { passive: false });
    sc.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      sc.removeEventListener('touchstart', onTouchStart);
      sc.removeEventListener('touchmove', onTouchMove);
      sc.removeEventListener('touchend', onTouchEnd);
      sc.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [scale]);

  return (
      <div className="w-full h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 overflow-hidden relative">

        {/* Initial Post-it editor (centered) */}
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
                    /* no position => renders centered block */
                />
              </div>
            </div>
        )}

        {/* Selected Post Modal (centered, blurred backdrop) */}
        {selectedPost && (
            <div
                className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={() => setSelectedPost(null)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <PostIt
                    text={selectedPost.text}
                    color={selectedPost.color}
                    isEditing={false}
                    scale={scale}
                    currentUserId={currentUserId}
                    /* no position => relative center */
                />
              </div>
            </div>
        )}

        {/* Scrollable, zoomable board */}
        <div
            ref={scRef}
            className="board-scroll-container w-full h-full overflow-auto touch-pan-y touch-pan-x"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <div
              ref={boardRef}
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
            {/* subtle overlay */}
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

            {/* Posted notes */}
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

        {/* Floating POST button (no live banner anymore) */}
        {hasPostedOnce && !showNewPost && (
            <button
                className="fixed bottom-8 right-8 bg-blue-500 text-white p-4 rounded-full shadow-xl hover:bg-blue-600 transition-all duration-200 hover:scale-110 z-40 font-bold text-lg"
                onClick={handleCreateNewPost}
                style={{ fontSize: '24px' }}
            >
              POST
            </button>
        )}
      </div>
  );
}
