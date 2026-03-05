import { FilteredComment } from '../../types';

interface TrailerCommentsProps {
  comments: FilteredComment[];
  totalCount: number;
}

export function TrailerComments({ comments, totalCount }: TrailerCommentsProps) {
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
              <span className="comment-date">{new Date(comment.publishedAt).toLocaleDateString()}</span>
            </div>
            <p className="comment-text">{comment.text}</p>
            <div className="comment-likes">Likes: {comment.likeCount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
