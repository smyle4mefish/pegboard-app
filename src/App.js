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
                  isInitial = false
                }) => {
  const [isMoving, setIsMoving] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const postItRef = useRef(null);
  const currentUserId = useRef(Math.random().toString(36).substr(2, 9)).current;

  const handleMouseDown = (e) => {
    if (!isEditing && onMove && !e.target.closest('.delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      setIsMoving(true);
      const rect = postItRef.current.getBoundingClientRect();
      const scrollContainer = document.querySelector('.board-scroll-container');
      setDragOffset({
        x: e.clientX - rect.left + scrollContainer.scrollLeft,
        y: e.clientY - rect.top + scrollContainer.scrollTop
      });
    }
  };

  const handleTouchStart = (e) => {
    if (!isEditing && onMove && !e.target.closest('.delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      setIsMoving(true);
      const touch = e.touches[0];
      const rect = postItRef.current.getBoundingClientRect();
      const scrollContainer = document.querySelector('.board-scroll-container');
      setDragOffset({
        x: touch.clientX - rect.left + scrollContainer.scrollLeft,
        y: touch.clientY - rect.top + scrollContainer.scrollTop
      });
    }
  };

  useEffect(() => {
    if (!isMoving) return;

    const handleMove = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      if (clientX && clientY && onMove) {
        const scrollContainer = document.querySelector('.board-scroll-container');
        onMove({
          x: clientX - dragOffset.x + scrollContainer.scrollLeft,
          y: clientY - dragOffset.y + scrollContainer.scrollTop
        });
      }
    };

    const handleEnd = () => {
      setIsMoving(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isMoving, dragOffset, onMove]);

  const selectedColor = colors.find(c => c.value === color) || colors[0];
  const canDelete = authorId === currentUserId;

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
            width: isEditing ? '320px' : '220px',
            minHeight: isEditing ? '380px' : '260px',
            left: position?.x || 0,
            top: position?.y || 0,
            zIndex: isDragging || isMoving ? 1000 : (isInitial ? 500 : 10),
            filter: `drop-shadow(0 8px 16px rgba(0,0,0,0.15))`,
            opacity: 1 // Ensure post-its are fully visible
          }}
          onMouseDown={!isEditing ? handleMouseDown : undefined}
          onTouchStart={!isEditing ? handleTouchStart : undefined}
          onClick={!isEditing && !isMoving && onClick ? (e) => {
            e.stopPropagation();
            onClick();
          } : undefined}
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
                        setColor(c.value);
                      }}
                  />
              ))}
            </div>
        )}

        {/* Delete button for posted notes */}
        {onDelete && !isEditing && canDelete && (
            <button
                className="delete-btn absolute top-3 right-3 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all duration-200 shadow-lg hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
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
                onChange={(e) => setText(e.target.value)}
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

        {/* Post button at the bottom - only show when editing */}
        {isEditing && (
            <div className="p-6 pt-0">
              <button
                  className={`w-full px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg ${
                      text.trim()
                          ? 'bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95'
                          : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  onClick={onPost}
                  disabled={!text.trim()}
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
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const currentUserId = useRef(Math.random().toString(36).substr(2, 9)).current;
  const boardRef = useRef(null);

  useEffect(() => {
    const unsubscribe = firebaseService.onPostsChange((newPosts) => {
      setPosts(newPosts);
    });
    return unsubscribe;
  }, []);

  const getRandomPosition = () => {
    const margin = 60;
    const postWidth = 220;
    const postHeight = 260;
    const maxAttempts = 50;

    // Get the scroll container to understand visible area
    const scrollContainer = document.querySelector('.board-scroll-container');
    const visibleArea = {
      left: scrollContainer ? scrollContainer.scrollLeft : 0,
      top: scrollContainer ? scrollContainer.scrollTop : 0,
      right: scrollContainer ? scrollContainer.scrollLeft + scrollContainer.clientWidth : window.innerWidth,
      bottom: scrollContainer ? scrollContainer.scrollTop + scrollContainer.clientHeight : window.innerHeight
    };

    // Try to place within or near the visible area
    const searchPadding = 300;
    const searchArea = {
      left: Math.max(margin, visibleArea.left - searchPadding),
      top: Math.max(margin, visibleArea.top - searchPadding),
      right: visibleArea.right + searchPadding,
      bottom: visibleArea.bottom + searchPadding
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const newPosition = {
        x: Math.random() * (searchArea.right - searchArea.left - postWidth) + searchArea.left,
        y: Math.random() * (searchArea.bottom - searchArea.top - postHeight) + searchArea.top
      };

      // Check if this position overlaps with existing posts
      const isOverlapping = posts.some(post => {
        if (!post.position) return false;

        const distance = Math.sqrt(
            Math.pow(newPosition.x - post.position.x, 2) +
            Math.pow(newPosition.y - post.position.y, 2)
        );

        return distance < (postWidth + 40);
      });

      if (!isOverlapping) {
        return newPosition;
      }
    }

    // Fallback: place in center of visible area
    return {
      x: (visibleArea.left + visibleArea.right) / 2 - postWidth / 2,
      y: (visibleArea.top + visibleArea.bottom) / 2 - postHeight / 2
    };
  };

  const handlePost = () => {
    if (newPostText.trim()) {
      const position = getRandomPosition();
      firebaseService.addPost({
        text: newPostText,
        color: newPostColor,
        position,
        authorId: currentUserId
      });
      setNewPostText('');
      setNewPostColor(colors[0].value);
      setShowNewPost(false);
      setHasPostedOnce(true);
    }
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

  // Gesture handling for pan and pinch zoom on mobile
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    let startX, startY, startDistance;
    let isPanning = false;

    const getDistance = (touches) => {
      return Math.sqrt(
          Math.pow(touches[0].clientX - touches[1].clientX, 2) +
          Math.pow(touches[0].clientY - touches[1].clientY, 2)
      );
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        isPanning = true;
        startX = e.touches[0].clientX - panOffset.x;
        startY = e.touches[0].clientY - panOffset.y;
      } else if (e.touches.length === 2) {
        isPanning = false;
        startDistance = getDistance(e.touches);
        startX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        startY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1 && isPanning) {
        e.preventDefault();
        const newX = e.touches[0].clientX - startX;
        const newY = e.touches[0].clientY - startY;
        setPanOffset({ x: newX, y: newY });
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const newDistance = getDistance(e.touches);
        const scaleChange = newDistance / startDistance;
        const newScale = Math.max(0.5, Math.min(2, scale * scaleChange));
        setScale(newScale);

        // Adjust pan to zoom towards center of pinch
        const deltaScale = newScale / scale;
        const pinchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const pinchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const newPanX = pinchX - (pinchX - panOffset.x) * deltaScale;
        const newPanY = pinchY - (pinchY - panOffset.y) * deltaScale;
        setPanOffset({ x: newPanX, y: newPanY });
      }
    };

    const handleTouchEnd = () => {
      isPanning = false;
    };

    board.addEventListener('touchstart', handleTouchStart, { passive: false });
    board.addEventListener('touchmove', handleTouchMove, { passive: false });
    board.addEventListener('touchend', handleTouchEnd);

    return () => {
      board.removeEventListener('touchstart', handleTouchStart);
      board.removeEventListener('touchmove', handleTouchMove);
      board.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scale, panOffset]);

  return (
      <div className="w-full h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 overflow-hidden relative">

        {/* Initial Post-it (center screen when user arrives) */}
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
                />
              </div>
            </div>
        )}

        {/* Selected Post Modal (for viewing) */}
        {selectedPost && (
            <div
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
                onClick={() => setSelectedPost(null)}
            >
              <div
                  onClick={(e) => e.stopPropagation()}
                  className="transform scale-125" // Slightly enlarge for better viewing
              >
                <PostIt
                    text={selectedPost.text}
                    color={selectedPost.color}
                    isEditing={false}
                />
              </div>
            </div>
        )}

        {/* Scrollable Peg Board */}
        <div
            ref={boardRef}
            className="board-scroll-container w-full h-full overflow-hidden touch-pan-y touch-pinch-zoom"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: 'transform 0.1s ease-out'
            }}
        >
          <div
              className="relative"
              style={{
                width: '4000px', // Large fixed board size
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
            {/* Cork board background layer */}
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
                />
            ))}
          </div>
        </div>

        {/* Floating Post Button (only show after first post) */}
        {hasPostedOnce && !showNewPost && (
            <button
                className="fixed bottom-8 right-8 bg-blue-500 text-white p-4 rounded-full shadow-xl hover:bg-blue-600 transition-all duration-200 hover:scale-110 z-40 font-bold text-lg"
                onClick={handleCreateNewPost}
                style={{ fontSize: '24px' }}
            >
              POST
            </button>
        )}

        {/* Zoom controls (bottom left) */}
        {hasPostedOnce && (
            <div className="fixed bottom-8 left-8 flex flex-col space-y-3 z-40">
              <button
                  className="bg-white bg-opacity-90 text-gray-700 p-3 rounded-full shadow-lg hover:bg-opacity-100 transition-all duration-200 font-bold text-lg"
                  onClick={() => setScale(Math.min(2, scale * 1.2))}
              >
                +
              </button>
              <button
                  className="bg-white bg-opacity-90 text-gray-700 p-3 rounded-full shadow-lg hover:bg-opacity-100 transition-all duration-200 font-bold text-S"
                  onClick={() => setScale(Math.max(0.5, scale / 1.2))}
              >
                −
              </button>
            </div>
        )}

      </div>
  );
};

export default function App() {
  return (
      <>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <PegBoard />
      </>
  );
}