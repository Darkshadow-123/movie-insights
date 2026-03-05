import { YouTubeStatus } from '../../types';

interface YouTubeStatusBannerProps {
  status?: YouTubeStatus;
  message?: string;
}

export function YouTubeStatusBanner({ status, message }: YouTubeStatusBannerProps) {
  if (!status || status === 'success') return null;

  const configs: Record<string, {text: string; color: string }> = {
    no_api_key: {text: 'YouTube API key not configured', color: 'yellow' },
    trailer_not_found: { text: message || 'No trailer found', color: 'gray' },
    comments_disabled: { text: message || 'Comments disabled', color: 'gray' },
    quota_exceeded: { text: message || 'API quota exceeded', color: 'red' },
    error: { text: message || 'YouTube API error', color: 'red' },
  };

  const config = configs[status] || { text: message || '', color: 'gray' };

  return (
    <div className={`youtube-status youtube-status-${config.color}`}>
      <span>{config.text}</span>
    </div>
  );
}
