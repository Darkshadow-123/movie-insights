import { FilteredComment } from '../../types';

interface TrailerCommentsProps {
  comments: FilteredComment[];
  totalCount: number;
}

export function TrailerComments({ comments, totalCount }: TrailerCommentsProps) {
  // Guard clause: don't render if no comments exist
  if (!comments?.length) return null;

  return (
    <div className="comments-section">
      <div className="comments-header">
        <h3 className="section-title">YouTube Comments</h3>
        <span className="comments-count">{totalCount} comments</span>
      </div>
      <div className="comments-list">
        {comments.map((comment, i) => (
          <div key={i} className="comment-card">
            <div className="comment-header">
              <span className="comment-author">{comment.author}</span>
              {/* Convert YouTube API timestamp to a date string.
                  Locale pinned explicitly (en-US) so server-rendered HTML
                  matches client-rendered HTML — an unpinned locale caused
                  a hydration mismatch when the server's default locale
                  (e.g. en-US, m/d/y) differed from the browser's
                  (e.g. en-GB, d/m/y). */}
              <span className="comment-date">{new Date(comment.publishedAt).toLocaleDateString('en-US')}</span>
            </div>
            <p className="comment-text">{comment.text}</p>
            <div className="comment-likes">Likes: {comment.likeCount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}