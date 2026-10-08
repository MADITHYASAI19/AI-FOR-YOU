import { useCursor } from "./useCursor";
import "./Cursor.css";


const Cursor = () => {
  const { dotRef, followerRef, isEnabled } = useCursor();

  // Don't render anything if custom cursor is disabled
  if (!isEnabled) return null;

  return (
    <>
      {/* Layer 2: Follower (below dot in z-index) */}
      <div ref={followerRef} className="cursor-follower" aria-hidden="true">
        <div className="cursor-follower__ring" />
        <div className="cursor-follower__glow" />
      </div>

      {/* Layer 1: Dot (highest z-index, exact pointer position) */}
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  );
};

export default Cursor;
