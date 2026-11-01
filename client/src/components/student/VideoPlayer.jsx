import YouTube from 'react-youtube'
import { youtubeId } from '../../utils/video'

export default function VideoPlayer({ url, onEnded }) {
    const id = youtubeId(url)
    return id
        ? <YouTube videoId={id} opts={{ width: '100%', height: '100%' }} className="aspect-video" iframeClassName="w-full h-full" onEnd={onEnded} />
        : <video key={url} src={url} controls className="w-full aspect-video bg-black" onEnded={onEnded}>Your browser does not support video playback.</video>
}
