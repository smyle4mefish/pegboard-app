import React, { useState, useEffect, useRef } from 'react';
import { X, Move } from 'lucide-react';

// Mock Firebase functions for demonstration
const mockFirebase = {
  posts: new Map(),
  listeners: new Set(),

  addPost: (post) => {
    const id = Date.now().toString();
    mockFirebase.posts.set(id, { ...post, id, createdAt: new Date() });
    mockFirebase.notifyListeners();
    return id;
  },

  updatePost: (id, updates) => {
    const post = mockFirebase.posts.get(id);
    if (post) {
      mockFirebase.posts.set(id, { ...post, ...updates });
      mockFirebase.notifyListeners();
    }
  },

  deletePost: (id) => {
    mockFirebase.posts.delete(id);
    mockFirebase.notifyListeners();
  },

  getPosts: () => Array.from(mockFirebase.posts.values()),

  onPostsChange: (callback) => {
    mockFirebase.listeners.add(callback);
    return () => mockFirebase.listeners.delete(callback);
  },

  notifyListeners: () => {
    const posts = Array.from(mockFirebase.posts.values());
    mockFirebase.listeners.forEach(callback => callback(posts));
  }
};

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
      e.stopPropagation(); // Stop the event from bubbling to the board
      setIsMoving(true);
      const rect = postItRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleTouchStart = (e) => {
    if (!isEditing && onMove && !e.target.closest('.delete-btn')) {
      e.preventDefault();
      e.stopPropagation(); // Stop the event from bubbling to the board
      setIsMoving(true);
      const touch = e.touches[0];
      const rect = postItRef.current.getBoundingClientRect();
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    if (!isMoving) return;

    const handleMove = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      if (clientX && clientY && onMove) {
        onMove({
          x: clientX - dragOffset.x,
          y: clientY - dragOffset.y
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
        relative rounded-xl shadow-lg transform transition-all duration-300 select-none
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
            position: position ? 'absolute' : 'relative',
            left: position?.x,
            top: position?.y,
            zIndex: isDragging || isMoving ? 1000 : (isInitial ? 500 : 1),
            filter: `drop-shadow(0 8px 16px rgba(0,0,0,0.15))`
          }}
          onMouseDown={!isEditing ? handleMouseDown : undefined}
          onTouchStart={!isEditing ? handleTouchStart : undefined}
          onClick={!isEditing && !isMoving && onClick ? (e) => {
            e.stopPropagation(); // Prevent board panning when clicking to view
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
  const [showNewPost, setShowNewPost] = useState(true); // Start with post-it visible
  const [newPostText, setNewPostText] = useState('');
  const [newPostColor, setNewPostColor] = useState(colors[0].value);
  const [selectedPost, setSelectedPost] = useState(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hasPostedOnce, setHasPostedOnce] = useState(false);
  const boardRef = useRef(null);
  const currentUserId = useRef(Math.random().toString(36).substr(2, 9)).current;

  useEffect(() => {
    const unsubscribe = mockFirebase.onPostsChange((newPosts) => {
      setPosts(newPosts);
    });
    return unsubscribe;
  }, []);

  const getRandomPosition = () => {
    const margin = 60;
    const postWidth = 220;
    const postHeight = 260;
    const maxAttempts = 50;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate position in a much larger area (3x screen size)
      const boardWidth = window.innerWidth * 3;
      const boardHeight = window.innerHeight * 3;

      const newPosition = {
        x: Math.random() * (boardWidth - postWidth - margin * 2) + margin - window.innerWidth,
        y: Math.random() * (boardHeight - postHeight - margin * 2) + margin - window.innerHeight
      };

      // Check if this position overlaps with existing posts
      const isOverlapping = posts.some(post => {
        if (!post.position) return false;

        const distance = Math.sqrt(
            Math.pow(newPosition.x - post.position.x, 2) +
            Math.pow(newPosition.y - post.position.y, 2)
        );

        // Minimum distance between post-its (post width + some spacing)
        return distance < (postWidth + 40);
      });

      if (!isOverlapping) {
        return newPosition;
      }
    }

    // If we can't find a non-overlapping position after many attempts,
    // just return a random position (fallback)
    return {
      x: Math.random() * (window.innerWidth * 2) - window.innerWidth / 2,
      y: Math.random() * (window.innerHeight * 2) - window.innerHeight / 2
    };
  };

  const handlePost = () => {
    if (newPostText.trim()) {
      const position = getRandomPosition();
      mockFirebase.addPost({
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
    mockFirebase.deletePost(id);
  };

  const handleMovePost = (id, newPosition) => {
    mockFirebase.updatePost(id, { position: newPosition });
  };

  const handlePanStart = (e) => {
    // Only start panning if the touch/click is directly on the board background, not on a post-it
    if ((e.target === boardRef.current || e.target.closest('.board-background')) &&
        !e.target.closest('[data-postit]')) {
      setIsPanning(true);
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      setPanStart({ x: clientX - pan.x, y: clientY - pan.y });
    }
  };

  useEffect(() => {
    if (!isPanning) return;

    const handlePanMove = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      setPan({
        x: clientX - panStart.x,
        y: clientY - panStart.y
      });
    };

    const handlePanEnd = () => {
      setIsPanning(false);
    };

    document.addEventListener('mousemove', handlePanMove);
    document.addEventListener('mouseup', handlePanEnd);
    document.addEventListener('touchmove', handlePanMove, { passive: false });
    document.addEventListener('touchend', handlePanEnd);

    return () => {
      document.removeEventListener('mousemove', handlePanMove);
      document.removeEventListener('mouseup', handlePanEnd);
      document.removeEventListener('touchmove', handlePanMove);
      document.removeEventListener('touchend', handlePanEnd);
    };
  }, [isPanning, panStart]);

  const handleWheel = (e) => {
    e.preventDefault();
    const newScale = Math.max(0.3, Math.min(3, scale + e.deltaY * -0.001));
    setScale(newScale);
  };

  const handleCreateNewPost = () => {
    setShowNewPost(true);
  };

  return (
      <div className="w-full h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 overflow-hidden relative">

        {/* Initial Post-it (center screen when user arrives) */}
        {showNewPost && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
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
        )}

        {/* Selected Post Modal (for viewing) */}
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
                    showColorPicker={false}
                />
              </div>
            </div>
        )}

        {/* Peg Board */}
        <div
            ref={boardRef}
            className="board-background w-full h-full cursor-move"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center'
            }}
            onMouseDown={handlePanStart}
            onTouchStart={handlePanStart}
            onWheel={handleWheel}
        >
          {/* Cork board texture - make it much larger */}
          <div
              className="board-background absolute opacity-15"
              style={{
                width: '500vw', // 5x viewport width
                height: '500vh', // 5x viewport height
                left: '-200vw', // Center it
                top: '-200vh', // Center it
                backgroundImage: `
              radial-gradient(circle at 25% 25%, #8B4513 2px, transparent 2px),
              radial-gradient(circle at 75% 25%, #8B4513 2px, transparent 2px),
              radial-gradient(circle at 25% 75%, #8B4513 2px, transparent 2px),
              radial-gradient(circle at 75% 75%, #8B4513 2px, transparent 2px)
            `,
                backgroundSize: '60px 60px'
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

        {/* Subtle zoom controls (bottom left) */}
        {hasPostedOnce && (
            <div className="fixed bottom-8 left-8 flex flex-col space-y-3 z-40">
              <button
                  className="bg-white bg-opacity-80 text-gray-700 p-3 rounded-full shadow-lg hover:bg-opacity-100 transition-all duration-200 font-bold text-lg"
                  onClick={() => setScale(Math.min(3, scale * 1.3))}
              >
                +
              </button>
              <button
                  className="bg-white bg-opacity-80 text-gray-700 p-3 rounded-full shadow-lg hover:bg-opacity-100 transition-all duration-200 font-bold text-lg"
                  onClick={() => setScale(Math.max(0.3, scale / 1.3))}
              >
                −
              </button>
            </div>
        )}
      </div>
  );
};

export default function App() {
  return <PegBoard />;
}